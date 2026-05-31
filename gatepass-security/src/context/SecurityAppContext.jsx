import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  approveDelivery,
  rejectDelivery,
  createDeliveries,
  fetchDeliveries,
  exitVisitor,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../services/api";
import { SECURITY_UNITS } from "../constants/mobileOptions";
import { createSocket } from "../services/socket";
import { getOfficerId } from "../services/officerId";

const GATE_STORAGE_KEY = "security_gate";
const OFFICER_STORAGE_KEY = "security_officer";

const SecurityAppContext = createContext(null);

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function buildSecurityThreadKey(officerId, unit) {
  return `security:${officerId}:${String(unit || "").trim().toUpperCase()}`;
}

function buildSecToSecThreadKey(a, b) {
  return `sec-sec:${[a, b].sort().join(":")}`;
}

function createNote(category, text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    text,
    timestamp: new Date().toISOString(),
  };
}

function buildThreadMetadata(message, myOfficerId) {
  // security ↔ resident
  if ((message.senderRole === "security" && message.recipientRole === "resident") ||
      (message.senderRole === "resident" && message.recipientRole === "security")) {
    const unit = message.senderRole === "resident"
      ? String(message.senderUnit || "").trim().toUpperCase()
      : String(message.recipientUnit || "").trim().toUpperCase();
    return { key: message.threadKey, label: unit, toRole: "resident", toUnit: unit, canReply: true };
  }
  // security ↔ security
  if (message.senderRole === "security" && message.recipientRole === "security") {
    const otherOfficerId = message.senderUnit === myOfficerId ? message.recipientUnit : message.senderUnit;
    const name = (message.senderUnit === myOfficerId ? null : (message.senderName || message.senderUnit)) ||
      (message.recipientUnit === myOfficerId ? null : message.recipientUnit);
    return { key: message.threadKey, label: name || otherOfficerId || "Officer", toRole: "security", toUnit: otherOfficerId, canReply: true };
  }
  return null;
}

export function SecurityAppProvider({ children, onLogout, persona }) {
  const location = useLocation();
  const socketRef = useRef(null);
  const typingTimeouts = useRef({});
  const pathnameRef = useRef(location.pathname);
  const activeThreadRef = useRef(null);

  const [gate, setGate] = useState(() => persona?.gate || localStorage.getItem(GATE_STORAGE_KEY) || "");
  const [officerName, setOfficerName] = useState(() => persona?.name || localStorage.getItem(OFFICER_STORAGE_KEY) || "");
  const [connected, setConnected] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [typingByThread, setTypingByThread] = useState({});
  const [activeThreadKey, setActiveThreadKey] = useState(null);
  const [unreadByThread, setUnreadByThread] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [onlineOfficers, setOnlineOfficers] = useState([]);

  // Use DB user ID as the stable officer ID (falls back to browser-generated ID)
  const officerId = useMemo(() => persona?.id || getOfficerId(), [persona?.id]);

  useEffect(() => { pathnameRef.current = location.pathname; }, [location.pathname]);
  useEffect(() => { activeThreadRef.current = activeThreadKey; }, [activeThreadKey]);

  function setGateIdentity(newGate, newOfficer) {
    const g = String(newGate || "").trim();
    const o = String(newOfficer || "").trim();
    setGate(g);
    setOfficerName(o);
    localStorage.setItem(GATE_STORAGE_KEY, g);
    localStorage.setItem(OFFICER_STORAGE_KEY, o);
  }

  const hasGateSetup = Boolean(gate);

  async function loadDeliveries({ withLoading = true } = {}) {
    if (withLoading) setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchDeliveries();
      setDeliveries(data.deliveries || []);
    } catch (error) {
      setLoadError(error.message || "Failed to load delivery list");
    } finally {
      if (withLoading) setIsLoading(false);
    }
  }

  async function loadWatchlist() {
    setWatchlistLoading(true);
    try {
      const data = await fetchWatchlist();
      setWatchlist(data.watchlist || []);
    } catch { /* silent */ } finally {
      setWatchlistLoading(false);
    }
  }

  async function addWatchlistEntry(data) {
    const result = await addToWatchlist({ ...data, added_by: officerName || gate || "Security" });
    setWatchlist((prev) => [result.entry, ...prev]);
    return result.entry;
  }

  async function removeWatchlistEntry(id) {
    await removeFromWatchlist(id);
    setWatchlist((prev) => prev.filter((e) => e.id !== id));
  }

  useEffect(() => { loadDeliveries(); loadWatchlist(); }, []);

  useEffect(() => {
    const socket = createSocket({ role: "security", officerId, officerName, gate });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("delivery:event", (event) => {
      const next = event.payload;
      setDeliveries((prev) => {
        const index = prev.findIndex((item) => item.id === next.id);
        if (index === -1) return [next, ...prev];
        const clone = [...prev];
        clone[index] = next;
        return clone;
      });
      const unit = String(next.unit || "").trim().toUpperCase();
      const label = event.type === "DELIVERY_CREATED" ? `New entry: ${next.delivery_person_name} to ${unit}`
        : event.type === "DELIVERY_APPROVED" ? `Approved: ${next.delivery_person_name} (${unit})`
        : event.type === "DELIVERY_REJECTED" ? `Rejected: ${next.delivery_person_name} (${unit})`
        : event.type === "VISITOR_EXITED" ? `Exited: ${next.delivery_person_name} (${unit})`
        : `${unit}: ${event.type.replaceAll("_", " ").toLowerCase()}`;
      setNotifications((prev) => [createNote("delivery", label), ...prev].slice(0, 160));
    });

    socket.on("chat:history", (messages) => {
      if (!Array.isArray(messages)) return;
      const normalized = messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole ?? m.sender_role,
        senderUnit: m.senderUnit ?? m.sender_unit ?? null,
        senderName: m.senderName ?? m.sender_name ?? null,
        recipientRole: m.recipientRole ?? m.recipient_role,
        recipientUnit: m.recipientUnit ?? m.recipient_unit ?? null,
        threadKey: m.threadKey ?? m.thread_key,
        text: m.text ?? "",
        attachment: m.attachment ?? null,
        status: m.status ?? "sent",
        timestamp: m.timestamp ?? (m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString()),
      }));
      setChatMessages((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const fresh = normalized.filter((m) => !existingIds.has(m.id));
        if (!fresh.length) return prev;
        return [...fresh, ...prev].slice(-500);
      });
    });

    socket.on("officers:online", (list) => {
      if (Array.isArray(list)) setOnlineOfficers(list);
    });

    socket.on("chat:message", (message) => {
      setChatMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev.slice(-299), message];
      });
      const threadKey = message.threadKey;
      const onChatRoute = pathnameRef.current.startsWith("/chat");
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      const isActive = activeThreadRef.current === threadKey;
      const canSeen = message.recipientRole === "security";
      const incomingForSecurity = message.senderRole === "resident";
      if (canSeen) {
        socket.emit("chat:status", { messageId: message.id, status: "delivered", threadKey: message.threadKey, senderRole: message.senderRole, senderUnit: message.senderUnit, recipientRole: message.recipientRole, recipientUnit: message.recipientUnit });
      }
      if (canSeen && onChatRoute && isVisible && isActive) {
        socket.emit("chat:status", { messageId: message.id, status: "seen", threadKey: message.threadKey, senderRole: message.senderRole, senderUnit: message.senderUnit, recipientRole: message.recipientRole, recipientUnit: message.recipientUnit });
      } else if (incomingForSecurity) {
        setUnreadByThread((prev) => ({ ...prev, [threadKey]: (prev[threadKey] || 0) + 1 }));
      }
      const info = buildThreadMetadata(message, officerId);
      if (info) setNotifications((prev) => [createNote("chat", `Message from ${info.label}`), ...prev].slice(0, 160));
    });

    socket.on("chat:status", (statusEvent) => {
      setChatMessages((prev) => prev.map((item) => {
        if (item.id !== statusEvent.messageId) return item;
        const nextStatus = statusEvent.status === "seen" ? "seen" : (item.status === "seen" ? "seen" : "delivered");
        if (item.status === nextStatus) return item;
        return { ...item, status: nextStatus };
      }));
    });

    socket.on("chat:typing", (typingEvent) => {
      const threadKey = String(typingEvent.threadKey || "").trim();
      if (!threadKey) return;
      setTypingByThread((prev) => ({ ...prev, [threadKey]: typingEvent.isTyping }));
      if (typingTimeouts.current[threadKey]) clearTimeout(typingTimeouts.current[threadKey]);
      if (typingEvent.isTyping) {
        typingTimeouts.current[threadKey] = setTimeout(() => {
          setTypingByThread((prev) => ({ ...prev, [threadKey]: false }));
        }, 2000);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !pathnameRef.current.startsWith("/chat") || !activeThreadRef.current) return;
      setChatMessages((prev) => {
        prev.filter((item) => item.threadKey === activeThreadRef.current && item.recipientRole === "security" && item.status !== "seen")
          .forEach((item) => socket.emit("chat:status", { messageId: item.id, status: "seen", threadKey: item.threadKey, senderRole: item.senderRole, senderUnit: item.senderUnit, recipientRole: item.recipientRole, recipientUnit: item.recipientUnit }));
        return prev;
      });
    };
  }, [officerId, officerName, gate]);

  const availableUnits = SECURITY_UNITS;

  const threads = useMemo(() => {
    const map = new Map();
    // Only show threads where we have actual messages (no pre-seeding all units)
    chatMessages.forEach((message) => {
      const meta = buildThreadMetadata(message, officerId);
      if (!meta) return;
      const existing = map.get(meta.key) || {
        key: meta.key, label: meta.label, toRole: meta.toRole, toUnit: meta.toUnit,
        canReply: meta.canReply, lastAt: null, lastMessage: null, unread: unreadByThread[meta.key] || 0,
      };
      const ts = message.timestamp || message.created_at;
      if (!existing.lastAt || new Date(ts) >= new Date(existing.lastAt)) {
        existing.lastAt = ts;
        existing.lastMessage = message;
      }
      existing.unread = unreadByThread[meta.key] || 0;
      map.set(meta.key, existing);
    });
    return [...map.values()].sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
  }, [officerId, chatMessages, unreadByThread]);

  useEffect(() => {
    if (!activeThreadKey && threads.length > 0) setActiveThreadKey(threads[0].key);
  }, [activeThreadKey, threads]);

  useEffect(() => {
    if (!location.pathname.startsWith("/chat") || !activeThreadKey || !socketRef.current) return;
    setUnreadByThread((prev) => { if (!prev[activeThreadKey]) return prev; return { ...prev, [activeThreadKey]: 0 }; });
    chatMessages.filter((item) => item.threadKey === activeThreadKey && item.recipientRole === "security" && item.recipientUnit === officerId && item.status !== "seen")
      .forEach((item) => socketRef.current.emit("chat:status", { messageId: item.id, status: "seen", threadKey: item.threadKey, senderRole: item.senderRole, senderUnit: item.senderUnit, recipientRole: item.recipientRole, recipientUnit: item.recipientUnit }));
  }, [activeThreadKey, chatMessages, location.pathname, officerId]);

  const unreadChatCount = useMemo(() => Object.values(unreadByThread).reduce((acc, count) => acc + count, 0), [unreadByThread]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayDeliveries = deliveries.filter((d) => d.created_at?.startsWith(today));
    const pendingApprovals = deliveries.filter((d) => d.approval_status === "PENDING").length;
    const currentlyInside = deliveries.filter((d) => d.approval_status === "APPROVED" && d.delivery_status !== "EXITED").length;
    return {
      total: deliveries.length,
      todayTotal: todayDeliveries.length,
      pendingApprovals,
      currentlyInside,
      cards: [
        { label: "Currently Inside", value: currentlyInside, tone: "text-emerald-700", bg: "bg-emerald-50" },
        { label: "Awaiting Approval", value: pendingApprovals, tone: "text-amber-700", bg: "bg-amber-50" },
        { label: "Today Total", value: todayDeliveries.length, tone: "text-blue-700", bg: "bg-blue-50" },
        { label: "All Records", value: deliveries.length, tone: "text-zinc-700", bg: "bg-zinc-50" },
      ],
    };
  }, [deliveries]);

  const sortedDeliveries = useMemo(() => sortByCreatedAtDesc(deliveries), [deliveries]);

  function applyDeliveryUpdate(id, updates) {
    setDeliveries((prev) => prev.map((d) => (String(d.id) === String(id) ? { ...d, ...updates } : d)));
  }

  async function submitDeliveries(payload) {
    const enriched = gate ? { ...payload, gate } : payload;
    await createDeliveries(enriched);
    await loadDeliveries({ withLoading: false });
  }

  async function approveDeliveryById(id) {
    applyDeliveryUpdate(id, { approval_status: "APPROVED" });
    try { await approveDelivery(id); } catch (err) { await loadDeliveries({ withLoading: false }); throw err; }
  }

  async function rejectDeliveryById(id) {
    applyDeliveryUpdate(id, { approval_status: "REJECTED" });
    try { await rejectDelivery(id); } catch (err) { await loadDeliveries({ withLoading: false }); throw err; }
  }

  async function exitVisitorById(id) {
    // Optimistically mark all linked deliveries as EXITED immediately so the UI responds at once
    const source = deliveries.find((d) => String(d.id) === String(id));
    if (source) {
      const day = (source.created_at || "").slice(0, 10);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.delivery_person_name === source.delivery_person_name &&
          d.phone_number === source.phone_number &&
          (d.created_at || "").slice(0, 10) === day &&
          d.delivery_status !== "EXITED"
            ? { ...d, delivery_status: "EXITED", exited_at: new Date().toISOString() }
            : d,
        ),
      );
    }

    try {
      const data = await exitVisitor(id);
      const updated = data.deliveries || [];
      if (updated.length > 0) {
        setDeliveries((prev) =>
          prev.map((d) => {
            const u = updated.find((u) => u.id === d.id);
            return u ? { ...d, ...u } : d;
          }),
        );
      }
    } catch {
      await loadDeliveries({ withLoading: false });
    }
  }

  function emergencyBroadcast(message) {
    if (!socketRef.current) return;
    const text = String(message || "Emergency — please stay alert and follow safety protocols.").trim();
    socketRef.current.emit("emergency:broadcast", { message: text });
    setNotifications((prev) => [createNote("emergency", `EMERGENCY SENT: ${text}`), ...prev].slice(0, 160));
  }

  function sendChat({ toRole = "resident", toUnit, text, attachment }) {
    if (!socketRef.current) return;
    const normalizedText = String(text || "").trim();
    const normalizedAttachment = attachment?.dataUrl ? { kind: attachment.kind, dataUrl: attachment.dataUrl, name: attachment.name || null, mimeType: attachment.mimeType || null } : null;
    if (!normalizedText && !normalizedAttachment) return;
    if (toRole === "security") {
      // Security-to-security
      const targetOfficerId = String(toUnit || "").trim();
      if (!targetOfficerId) return;
      socketRef.current.emit("chat:send", { toRole: "security", toUnit: targetOfficerId, text: normalizedText, attachment: normalizedAttachment });
    } else {
      // Security-to-resident
      const targetUnit = String(toUnit || "").trim().toUpperCase();
      if (!targetUnit) return;
      socketRef.current.emit("chat:send", { toRole: "resident", toUnit: targetUnit, text: normalizedText, attachment: normalizedAttachment });
      socketRef.current.emit("chat:typing", { toRole: "resident", toUnit: targetUnit, isTyping: false });
    }
  }

  function setTyping({ toRole = "resident", toUnit, isTyping }) {
    if (!socketRef.current) return;
    const target = String(toUnit || "").trim();
    if (!target) return;
    const normalizedUnit = toRole === "resident" ? target.toUpperCase() : target;
    socketRef.current.emit("chat:typing", { toRole, toUnit: normalizedUnit, isTyping });
  }

  const openThread = useCallback((threadKey) => {
    setActiveThreadKey(threadKey);
    setUnreadByThread((prev) => ({ ...prev, [threadKey]: 0 }));
  }, []);

  const openOrCreateThreadForUnit = useCallback((unit) => {
    const targetUnit = String(unit || "").trim().toUpperCase();
    if (!targetUnit || !availableUnits.includes(targetUnit)) return null;
    const key = buildSecurityThreadKey(officerId, targetUnit);
    openThread(key);
    return key;
  }, [officerId, availableUnits, openThread]);

  const openOrCreateThreadForOfficer = useCallback((targetOfficerId) => {
    const tid = String(targetOfficerId || "").trim();
    if (!tid || tid === officerId) return null;
    const key = buildSecToSecThreadKey(officerId, tid);
    openThread(key);
    return key;
  }, [officerId, openThread]);

  function clearNotifications() { setNotifications([]); }

  function logout() {
    setGateIdentity("", "");
    if (typeof onLogout === "function") onLogout();
  }

  const value = {
    persona, gate, officerName, officerId, hasGateSetup, setGateIdentity, logout,
    connected, deliveries, sortedDeliveries, isLoading, loadError,
    stats, loadDeliveries, submitDeliveries, approveDeliveryById, rejectDeliveryById, exitVisitorById,
    watchlist, watchlistLoading, loadWatchlist, addWatchlistEntry, removeWatchlistEntry,
    chatMessages, threads, activeThreadKey, openThread, openOrCreateThreadForUnit, openOrCreateThreadForOfficer,
    availableUnits, typingByThread, unreadChatCount, sendChat, setTyping,
    onlineOfficers,
    notifications, clearNotifications, unreadNotificationsCount: notifications.length,
    emergencyBroadcast,
  };

  return <SecurityAppContext.Provider value={value}>{children}</SecurityAppContext.Provider>;
}

export function useSecurityApp() {
  const context = useContext(SecurityAppContext);
  if (!context) throw new Error("useSecurityApp must be used within SecurityAppProvider");
  return context;
}