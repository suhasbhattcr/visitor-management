import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { RESIDENT_UNITS } from "../constants/mobileOptions";
import {
  approveDelivery,
  fetchDeliveries,
  fetchInstructions,
  fetchPreregistrations,
  addPreregistration,
  deletePreregistration,
  rejectDelivery,
  saveInstructions,
} from "../services/api";
import {
  getNotificationPermission,
  pushBrowserNotification,
  requestNotificationPermission,
} from "../services/browserNotifications";
import { createSocket } from "../services/socket";

const ResidentAppContext = createContext(null);

function buildThreadKey(localUnit, toRole, toUnit) {
  if (toRole === "security") {
    // toUnit = officerId of the security officer
    const officerId = String(toUnit || "").trim();
    if (!officerId) return `security:unknown:${localUnit}`;
    return `security:${officerId}:${localUnit}`;
  }

  const other = String(toUnit || "").trim().toUpperCase();
  const [left, right] = [localUnit, other].sort();
  return `flat:${left}:${right}`;
}

function formatNotification({ category, text }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category,
    text,
    timestamp: new Date().toISOString(),
  };
}

function getOtherParty(message, localUnit) {
  if (message.senderRole === "security" || message.recipientRole === "security") {
    // thread key format: security:{officerId}:{unit}
    const parts = String(message.threadKey || "").split(":");
    const officerId = parts.length >= 3 ? parts[1] : null;
    const label = message.senderRole === "security"
      ? (message.senderName || officerId || "Security")
      : "Security";
    return { role: "security", label, unit: officerId };
  }

  const sender = String(message.senderUnit || "").trim().toUpperCase();
  const recipient = String(message.recipientUnit || "").trim().toUpperCase();
  const otherUnit = sender === localUnit ? recipient : sender;

  return {
    role: "resident",
    label: otherUnit,
    unit: otherUnit,
  };
}

function parseFlatThreadKey(threadKey, localUnit) {
  const normalized = String(threadKey || "").trim();
  if (!normalized.startsWith("flat:")) {
    return null;
  }

  const [, left, right] = normalized.split(":");
  if (!left || !right) {
    return null;
  }

  const upperLocal = String(localUnit || "").trim().toUpperCase();
  const otherUnit = left === upperLocal ? right : (right === upperLocal ? left : null);
  if (!otherUnit) {
    return null;
  }

  return {
    key: normalized,
    label: otherUnit,
    toRole: "resident",
    toUnit: otherUnit,
  };
}

function buildDeliveryNotification(eventType, payload) {
  const name = payload.delivery_person_name || "Visitor";
  const company = payload.company || "Unknown";

  if (eventType === "DELIVERY_CREATED") {
    return { title: "New delivery request", body: `${name} from ${company} is at the gate.` };
  }
  if (eventType === "DELIVERY_APPROVED") {
    return { title: "Entry approved", body: `${name} has been allowed entry.` };
  }
  if (eventType === "VISITOR_EXITED") {
    return { title: "Visitor exited", body: `${name} (${company}) has left the premises.` };
  }
  return null;
}

export function ResidentAppProvider({ unit, residentName, residentUserId, children, onLogout }) {
  const location = useLocation();
  const socketRef = useRef(null);
  const pathnameRef = useRef(location.pathname);
  const activeThreadRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const hasConnectedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [typingByThread, setTypingByThread] = useState({});
  const [unreadByThread, setUnreadByThread] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(() => getNotificationPermission());
  const [incomingDeliveryQueue, setIncomingDeliveryQueue] = useState([]);
  const [deliveryPromptBusy, setDeliveryPromptBusy] = useState(false);
  const [preregistrations, setPreregistrations] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [instructionsBusy, setInstructionsBusy] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [onlineOfficers, setOnlineOfficers] = useState([]);
  // Persisted across sessions so offline officers remain listable
  const [knownOfficers, setKnownOfficers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("known_security_officers") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  useEffect(() => {
    requestNotificationPermission()
      .then((permission) => setNotificationPermission(permission))
      .catch(() => {
        // noop
      });
  }, []);

  async function loadDeliveries({ withLoading = true } = {}) {
    if (withLoading) setIsLoading(true);
    setLoadError("");

    try {
      const data = await fetchDeliveries({ unit });
      setDeliveries(data.deliveries || []);
    } catch (error) {
      setLoadError(error.message || "Unable to load deliveries for this unit");
    } finally {
      if (withLoading) setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDeliveries();
  }, [unit]);

  useEffect(() => {
    fetchPreregistrations({ unit })
      .then((data) => setPreregistrations(data.preregistrations || []))
      .catch(() => {});
  }, [unit]);

  useEffect(() => {
    fetchInstructions(unit)
      .then((data) => setInstructions(data.instructions || ""))
      .catch(() => {});
  }, [unit]);

  useEffect(() => {
    const socket = createSocket({ role: "resident", unit, residentName: residentName || null, residentUserId: residentUserId || null });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      if (hasConnectedRef.current) {
        loadDeliveries({ withLoading: false });
      }
      hasConnectedRef.current = true;
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("delivery:event", (event) => {
      const next = event.payload;
      if (next.unit !== unit) {
        return;
      }

      setDeliveries((prev) => {
        const index = prev.findIndex((item) => item.id === next.id);
        if (index === -1) {
          return [next, ...prev];
        }

        const clone = [...prev];
        clone[index] = next;
        return clone;
      });

      setIncomingDeliveryQueue((prev) => {
        const withoutResolved = prev.filter((item) => item.id !== next.id || next.approval_status === "PENDING");
        if (event.type === "DELIVERY_CREATED" && next.approval_status === "PENDING") {
          if (withoutResolved.some((item) => item.id === next.id)) {
            return withoutResolved;
          }

          return [...withoutResolved, next];
        }

        return withoutResolved;
      });

      const notif = buildDeliveryNotification(event.type, next);
      if (notif) {
        const note = formatNotification({ category: "delivery", text: notif.body });
        setNotifications((prev) => [note, ...prev].slice(0, 120));
        pushBrowserNotification(notif.title, { body: notif.body, tag: `delivery-${event.type}-${next.id}` });
      }
    });

    socket.on("chat:history", (messages) => {
      if (!Array.isArray(messages)) return;
      // Normalize DB rows (snake_case, created_at) to the same shape as real-time messages
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
        return [...fresh, ...prev].slice(-300);
      });
    });

    socket.on("officers:online", (list) => {
      if (Array.isArray(list)) {
        setOnlineOfficers(list);
        // Merge into knownOfficers so offline officers remain accessible
        setKnownOfficers((prev) => {
          const merged = [...prev];
          list.forEach((officer) => {
            const idx = merged.findIndex((o) => o.officerId === officer.officerId);
            if (idx === -1) merged.push(officer);
            else merged[idx] = { ...merged[idx], ...officer };
          });
          try { localStorage.setItem("known_security_officers", JSON.stringify(merged)); } catch { /* noop */ }
          return merged;
        });
      }
    });

    socket.on("chat:message", (message) => {
      const sender = String(message.senderUnit || "").trim().toUpperCase();
      const recipient = String(message.recipientUnit || "").trim().toUpperCase();

      if (sender !== unit && recipient !== unit) {
        return;
      }

      setChatMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }

        return [...prev.slice(-249), message];
      });

      const incoming = sender !== unit;
      if (!incoming) {
        return;
      }

      const threadKey = message.threadKey;

      socket.emit("chat:status", {
        messageId: message.id,
        status: "delivered",
        threadKey: message.threadKey,
        senderRole: message.senderRole,
        senderUnit: message.senderUnit,
        recipientRole: message.recipientRole,
        recipientUnit: message.recipientUnit,
      });

      const isChatRoute = pathnameRef.current.startsWith("/chat");
      const isActiveThread = activeThreadRef.current === threadKey;
      const isVisible = typeof document !== "undefined" && document.visibilityState === "visible";

      if (isChatRoute && isActiveThread && isVisible) {
        socket.emit("chat:status", {
          messageId: message.id,
          status: "seen",
          threadKey: message.threadKey,
          senderRole: message.senderRole,
          senderUnit: message.senderUnit,
          recipientRole: message.recipientRole,
          recipientUnit: message.recipientUnit,
        });
      } else {
        setUnreadByThread((prev) => ({
          ...prev,
          [threadKey]: (prev[threadKey] || 0) + 1,
        }));
      }

      const party = getOtherParty(message, unit).label;
      const note = formatNotification({ category: "chat", text: `New message from ${party}` });
      setNotifications((prev) => [note, ...prev].slice(0, 120));
      pushBrowserNotification(`Message from ${party}`, {
        body: message.text,
        tag: `chat-${message.id}`,
      });
    });

    socket.on("chat:status", (statusEvent) => {
      setChatMessages((prev) => prev.map((item) => {
        if (item.id !== statusEvent.messageId) {
          return item;
        }

        const nextStatus = statusEvent.status === "seen"
          ? "seen"
          : (item.status === "seen" ? "seen" : "delivered");

        if (item.status === nextStatus) {
          return item;
        }

        return { ...item, status: nextStatus };
      }));
    });

    socket.on("chat:typing", (typingEvent) => {
      const senderUnit = String(typingEvent.senderUnit || "").trim().toUpperCase();
      if (senderUnit === unit) {
        return;
      }

      const threadKey = String(typingEvent.threadKey || "").trim();
      if (!threadKey) {
        return;
      }

      setTypingByThread((prev) => ({ ...prev, [threadKey]: typingEvent.isTyping }));

      if (typingTimeoutRef.current[threadKey]) {
        clearTimeout(typingTimeoutRef.current[threadKey]);
      }

      if (typingEvent.isTyping) {
        typingTimeoutRef.current[threadKey] = setTimeout(() => {
          setTypingByThread((prev) => ({ ...prev, [threadKey]: false }));
        }, 2000);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || !pathnameRef.current.startsWith("/chat")) {
        return;
      }

      setChatMessages((prev) => {
        prev
          .filter((item) => item.threadKey === activeThreadRef.current && String(item.senderUnit || "").trim().toUpperCase() !== unit)
          .forEach((item) => {
            socket.emit("chat:status", {
              messageId: item.id,
              status: "seen",
              threadKey: item.threadKey,
              senderRole: item.senderRole,
              senderUnit: item.senderUnit,
              recipientRole: item.recipientRole,
              recipientUnit: item.recipientUnit,
            });
          });

        return prev;
      });
    };

    socket.on("emergency:alert", (alert) => {
      setEmergencyAlert(alert);
      const note = formatNotification({ category: "emergency", text: alert.message || "Emergency broadcast from security" });
      setNotifications((prev) => [note, ...prev].slice(0, 120));
      pushBrowserNotification("Emergency Alert", { body: alert.message, tag: "emergency" });
    });

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      Object.values(typingTimeoutRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      socketRef.current = null;
      socket.disconnect();
    };
  }, [unit]);

  useEffect(() => {
    if (!location.pathname.startsWith("/chat") || !socketRef.current) {
      return;
    }

    setUnreadByThread((prev) => {
      if (!prev[activeThread]) {
        return prev;
      }

      return { ...prev, [activeThread]: 0 };
    });

    chatMessages
      .filter((item) => item.threadKey === activeThread && String(item.senderUnit || "").trim().toUpperCase() !== unit && item.status !== "seen")
      .forEach((item) => {
        socketRef.current.emit("chat:status", {
          messageId: item.id,
          status: "seen",
          threadKey: item.threadKey,
          senderRole: item.senderRole,
          senderUnit: item.senderUnit,
          recipientRole: item.recipientRole,
          recipientUnit: item.recipientUnit,
        });
      });
  }, [activeThread, chatMessages, location.pathname, unit]);

  const stats = useMemo(() => {
    const awaitingApproval = deliveries.filter((delivery) => delivery.approval_status === "PENDING").length;
    const approved = deliveries.filter((delivery) => delivery.approval_status === "APPROVED").length;
    const rejected = deliveries.filter((delivery) => delivery.approval_status === "REJECTED").length;

    return [
      { label: "My Requests", value: deliveries.length, tone: "text-zinc-900" },
      { label: "Awaiting Decision", value: awaitingApproval, tone: "text-amber-700" },
      { label: "Approved", value: approved, tone: "text-emerald-700" },
      { label: "Rejected", value: rejected, tone: "text-rose-700" },
    ];
  }, [deliveries]);

  const availableResidentUnits = useMemo(
    () => RESIDENT_UNITS.filter((item) => item !== unit),
    [unit],
  );

  const threads = useMemo(() => {
    const threadMap = new Map();

    chatMessages.forEach((message) => {
      const threadKey = message.threadKey;
      const party = getOtherParty(message, unit);
      const existing = threadMap.get(threadKey) || {
        key: threadKey,
        label: party.label,
        toRole: party.role,
        toUnit: party.unit,
        lastAt: null,
        lastMessage: null,
        unread: unreadByThread[threadKey] || 0,
      };

      if (!existing.lastAt || new Date(message.timestamp) >= new Date(existing.lastAt)) {
        existing.lastAt = message.timestamp;
        existing.lastMessage = message;
      }

      existing.unread = unreadByThread[threadKey] || 0;
      threadMap.set(threadKey, existing);
    });

    Object.keys(unreadByThread).forEach((threadKey) => {
      if (threadMap.has(threadKey)) {
        return;
      }

      const parsedFlat = parseFlatThreadKey(threadKey, unit);
      if (!parsedFlat) {
        return;
      }

      threadMap.set(threadKey, {
        ...parsedFlat,
        lastAt: null,
        lastMessage: null,
        unread: unreadByThread[threadKey] || 0,
      });
    });

    if (!threadMap.has(activeThread)) {
      const parsedFlat = parseFlatThreadKey(activeThread, unit);
      if (parsedFlat) {
        threadMap.set(activeThread, {
          ...parsedFlat,
          lastAt: null,
          lastMessage: null,
          unread: unreadByThread[activeThread] || 0,
        });
      }
    }

    return [...threadMap.values()].sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
  }, [activeThread, chatMessages, unreadByThread, unit]);

  const unreadChatCount = useMemo(
    () => Object.values(unreadByThread).reduce((sum, count) => sum + count, 0),
    [unreadByThread],
  );

  const unreadNotificationsCount = notifications.length;

  const incomingDeliveryPrompt = incomingDeliveryQueue[0] || null;

  function sendChat({ toRole, toUnit, text, attachment }) {
    if (!socketRef.current) {
      return;
    }

    const targetRole = toRole === "resident" ? "resident" : "security";
    // For security: toUnit is the officerId. For resident: it's the unit code.
    const targetUnit = String(toUnit || "").trim() || null;
    const normalizedTargetUnit = targetRole === "resident" ? (targetUnit ? targetUnit.toUpperCase() : null) : targetUnit;
    const normalizedText = String(text || "").trim();
    const normalizedAttachment = attachment && attachment.dataUrl
      ? {
        kind: attachment.kind,
        dataUrl: attachment.dataUrl,
        name: attachment.name || null,
        mimeType: attachment.mimeType || null,
      }
      : null;

    if ((!normalizedText && !normalizedAttachment) || (targetRole === "resident" && !normalizedTargetUnit)) {
      return;
    }

    socketRef.current.emit("chat:send", {
      text: normalizedText,
      attachment: normalizedAttachment,
      toRole: targetRole,
      toUnit: normalizedTargetUnit,
    });
  }

  function setTyping({ toRole, toUnit, isTyping }) {
    if (!socketRef.current) {
      return;
    }

    const targetRole = toRole === "resident" ? "resident" : "security";
    const targetUnit = String(toUnit || "").trim() || null;
    const normalizedTargetUnit = targetRole === "resident" ? (targetUnit ? targetUnit.toUpperCase() : null) : targetUnit;

    if (targetRole === "resident" && !normalizedTargetUnit) {
      return;
    }

    socketRef.current.emit("chat:typing", {
      toRole: targetRole,
      toUnit: normalizedTargetUnit,
      isTyping,
    });
  }

  const openThread = useCallback((threadKey) => {
    setActiveThread(threadKey);
    setUnreadByThread((prev) => {
      if (!prev[threadKey]) {
        return prev;
      }

      return { ...prev, [threadKey]: 0 };
    });
  }, []);

  const startResidentThread = useCallback((toUnit) => {
    const target = String(toUnit || "").trim().toUpperCase();
    if (!target || target === unit || !availableResidentUnits.includes(target)) {
      return null;
    }

    const key = buildThreadKey(unit, "resident", target);
    openThread(key);
    return key;
  }, [unit, availableResidentUnits, openThread]);

  function clearNotifications() {
    setNotifications([]);
  }

  async function setApprovalStatus(id, action) {
    if (action === "approve") {
      await approveDelivery(id);
      setDeliveries((prev) =>
        prev.map((d) => d.id === id ? { ...d, approval_status: "APPROVED" } : d),
      );
      return;
    }

    if (action === "reject") {
      await rejectDelivery(id);
      setDeliveries((prev) =>
        prev.map((d) => d.id === id ? { ...d, approval_status: "REJECTED" } : d),
      );
    }
  }



  async function addVisitorPreregistration(payload) {
    const data = await addPreregistration(payload);
    setPreregistrations((prev) => [data.preregistration, ...prev]);
    return data.preregistration;
  }

  async function removePreregistration(id) {
    await deletePreregistration(id);
    setPreregistrations((prev) => prev.filter((r) => r.id !== id));
  }

  async function updateInstructions(text) {
    setInstructionsBusy(true);
    try {
      const data = await saveInstructions(unit, text);
      setInstructions(data.instructions);
    } finally {
      setInstructionsBusy(false);
    }
  }

  function dismissIncomingDeliveryPrompt() {
    setIncomingDeliveryQueue((prev) => prev.slice(1));
  }

  function dismissEmergencyAlert() {
    setEmergencyAlert(null);
  }

  async function handleIncomingDeliveryPromptAction(action) {
    const current = incomingDeliveryQueue[0];
    if (!current || (action !== "approve" && action !== "reject")) {
      return;
    }

    setDeliveryPromptBusy(true);
    try {
      await setApprovalStatus(current.id, action);
      setIncomingDeliveryQueue((prev) => prev.slice(1));
    } finally {
      setDeliveryPromptBusy(false);
    }
  }

  const value = {
    unit,
    residentName: residentName || null,
    residentUserId: residentUserId || null,
    connected,
    deliveries,
    stats,
    isLoading,
    loadError,
    loadDeliveries,
    setApprovalStatus,
    notifications,
    clearNotifications,
    notificationPermission,
    requestNotificationPermission,
    unreadNotificationsCount,
    incomingDeliveryPrompt,
    deliveryPromptBusy,
    dismissIncomingDeliveryPrompt,
    handleIncomingDeliveryPromptAction,
    availableResidentUnits,
    chatMessages,
    threads,
    activeThread,
    openThread,
    startResidentThread,
    unreadChatCount,
    typingByThread,
    sendChat,
    setTyping,
    onlineOfficers,
    knownOfficers,
    preregistrations,
    addVisitorPreregistration,
    removePreregistration,
    instructions,
    instructionsBusy,
    updateInstructions,
    emergencyAlert,
    dismissEmergencyAlert,
    logout: () => { if (typeof onLogout === "function") onLogout(); },
  };

  return <ResidentAppContext.Provider value={value}>{children}</ResidentAppContext.Provider>;
}

export function useResidentApp() {
  const context = useContext(ResidentAppContext);
  if (!context) {
    throw new Error("useResidentApp must be used within ResidentAppProvider");
  }

  return context;
}
