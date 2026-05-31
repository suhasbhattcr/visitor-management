import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSecurityApp } from "../../context/SecurityAppContext";

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relativeThreadTime(value) {
  if (!value) return "";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric" });
}

function Tick({ status }) {
  if (status === "seen") return <span className="font-bold text-indigo-300">✓✓</span>;
  if (status === "delivered") return <span className="font-bold text-zinc-300">✓✓</span>;
  return <span className="font-bold text-zinc-300">✓</span>;
}

function ChatAttachment({ attachment }) {
  if (!attachment?.dataUrl) return null;
  if (attachment.kind === "image") {
    return <img className="mt-2 max-h-56 w-full rounded-xl object-cover" src={attachment.dataUrl} alt={attachment.name || "chat-image"} />;
  }
  if (attachment.kind === "video") {
    return (
      <video className="mt-2 max-h-56 w-full rounded-xl" controls preload="metadata" src={attachment.dataUrl}>
        <track kind="captions" />
      </video>
    );
  }
  return null;
}

function ThreadAvatar({ label }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-700">
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function ChatPage() {
  const {
    threads,
    availableUnits,
    officerId,
    officerName,
    gate,
    onlineOfficers,
    activeThreadKey,
    openThread,
    openOrCreateThreadForUnit,
    openOrCreateThreadForOfficer,
    chatMessages,
    typingByThread,
    sendChat,
    setTyping,
  } = useSecurityApp();
  const navigate = useNavigate();
  const { threadId } = useParams();

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [unitSearch, setUnitSearch] = useState("");

  const decodedThreadId = threadId ? decodeURIComponent(threadId) : "";
  const threadMode = Boolean(decodedThreadId);

  useEffect(() => {
    if (decodedThreadId) openThread(decodedThreadId);
  }, [decodedThreadId, openThread]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (threadMode) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatMessages, threadMode]);

  const selectedThread = useMemo(() => {
    if (!threadMode || !decodedThreadId) return null;
    const found = threads.find((t) => t.key === decodedThreadId);
    if (found) return found;
    // No messages yet — synthesize thread from key so new conversations work
    const parts = decodedThreadId.split(":");
    if (parts.length === 3 && parts[0] === "security") {
      const unit = parts[2];
      return { key: decodedThreadId, label: unit, toRole: "resident", toUnit: unit, canReply: true, lastAt: null, lastMessage: null, unread: 0 };
    }
    if (parts.length === 3 && parts[0] === "sec-sec") {
      const otherOfficerId = parts[1] === officerId ? parts[2] : parts[1];
      return { key: decodedThreadId, label: otherOfficerId, toRole: "security", toUnit: otherOfficerId, canReply: true, lastAt: null, lastMessage: null, unread: 0 };
    }
    return null;
  }, [decodedThreadId, threadMode, threads, officerId]);

  const selectedMessages = useMemo(
    () => (threadMode && decodedThreadId ? chatMessages.filter((m) => m.threadKey === decodedThreadId) : []),
    [chatMessages, decodedThreadId, threadMode],
  );

  const selectedTyping = threadMode ? typingByThread[decodedThreadId] : false;

  const filteredUnits = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    return q ? availableUnits.filter((u) => u.toLowerCase().includes(q)) : availableUnits;
  }, [availableUnits, unitSearch]);

  function openThreadScreen(threadKey) {
    openThread(threadKey);
    navigate(`/chat/${encodeURIComponent(threadKey)}`);
  }

  function startChatWithUnit(unit) {
    setShowNewChatPicker(false);
    setUnitSearch("");
    const key = openOrCreateThreadForUnit(unit);
    if (key) navigate(`/chat/${encodeURIComponent(key)}`);
  }

  function startChatWithOfficer(targetOfficerId) {
    setShowNewChatPicker(false);
    setUnitSearch("");
    const key = openOrCreateThreadForOfficer(targetOfficerId);
    if (key) navigate(`/chat/${encodeURIComponent(key)}`);
  }

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      alert("Attachment too large. Please use a file under 3 MB.");
      event.target.value = "";
      return;
    }
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind) {
      alert("Only image and video files are allowed.");
      event.target.value = "";
      return;
    }
    const dataUrl = await toDataUrl(file);
    setAttachment({ kind, dataUrl, name: file.name, mimeType: file.type });
    event.target.value = "";
  }

  function handleDraftChange(value) {
    setDraft(value);
    if (!selectedThread?.canReply || !selectedThread.toUnit) return;
    setTyping({ toRole: selectedThread.toRole, toUnit: selectedThread.toUnit, isTyping: value.trim().length > 0 });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!selectedThread?.canReply || !selectedThread.toUnit || (!draft.trim() && !attachment)) return;
    sendChat({ toRole: selectedThread.toRole, toUnit: selectedThread.toUnit, text: draft, attachment });
    setTyping({ toRole: selectedThread.toRole, toUnit: selectedThread.toUnit, isTyping: false });
    setDraft("");
    setAttachment(null);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  /* â”€â”€â”€ Thread List â”€â”€â”€ */
  if (!threadMode) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl" aria-hidden="true">ðŸ’¬</span>
              <p className="mt-3 text-sm font-semibold text-zinc-500">No conversations yet</p>
              <p className="mt-1 text-xs text-zinc-400">Start a chat with any flat</p>
            </div>
          ) : (
            <ul>
              {threads.map((thread, index) => (
                <li key={thread.key}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${index !== 0 ? "border-t border-zinc-100" : ""}`}
                    onClick={() => openThreadScreen(thread.key)}
                  >
                    <ThreadAvatar label={thread.label} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-semibold text-zinc-900">{thread.label}</p>
                        {thread.lastAt && (
                          <span className="shrink-0 text-[11px] text-zinc-400">{relativeThreadTime(thread.lastAt)}</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {thread.lastMessage?.text || (thread.lastMessage?.attachment ? `ðŸ“Ž ${thread.lastMessage.attachment.kind}` : "Tap to open chat")}
                      </p>
                    </div>
                    {thread.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                        {thread.unread > 9 ? "9+" : thread.unread}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FAB */}
        <button
          type="button"
          onClick={() => setShowNewChatPicker(true)}
          className="fixed bottom-[5.5rem] right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 transition active:scale-95 md:bottom-6"
          aria-label="Start new chat"
        >
          <PlusIcon />
        </button>

        {/* New Chat Picker */}
        {showNewChatPicker && (
          <div
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center md:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowNewChatPicker(false); setUnitSearch(""); } }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white md:rounded-3xl">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <h3 className="font-bold text-zinc-900">New Conversation</h3>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                  onClick={() => { setShowNewChatPicker(false); setUnitSearch(""); }}
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="px-4 pt-3 pb-2">
                <input
                  type="text"
                  placeholder="Search flat…"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm placeholder-zinc-400 focus:border-indigo-300 focus:outline-none"
                />
              </div>

              <div className="max-h-[55vh] overflow-y-auto px-4 pb-5 pt-2">
                {/* Online Officers section */}
                {onlineOfficers.filter((o) => o.officerId !== officerId).length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Officers Online</p>
                    <div className="grid grid-cols-2 gap-2">
                      {onlineOfficers.filter((o) => o.officerId !== officerId).map((officer) => (
                        <button
                          key={officer.officerId}
                          type="button"
                          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
                          onClick={() => startChatWithOfficer(officer.officerId)}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xs font-bold text-emerald-700">
                            {(officer.officerName || officer.gate || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-zinc-800">{officer.officerName || officer.gate}</p>
                            <p className="truncate text-[10px] text-zinc-400">{officer.gate}</p>
                          </div>
                          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Flats</p>
                <div className="grid grid-cols-3 gap-2">
                  {filteredUnits.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white py-3 text-center transition hover:border-indigo-200 hover:bg-indigo-50"
                      onClick={() => startChatWithUnit(unit)}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
                        {unit.slice(0, 1)}
                      </div>
                      <span className="text-xs font-semibold text-zinc-700">{unit}</span>
                    </button>
                  ))}
                </div>
                {filteredUnits.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-400">No flats match "{unitSearch}"</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* â”€â”€â”€ Thread not found â”€â”€â”€ */
  if (!selectedThread) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 text-center shadow-sm">
        <p className="text-sm text-zinc-500">Thread not found.</p>
        <button
          type="button"
          className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => navigate("/chat")}
        >
          Back to Conversations
        </button>
      </div>
    );
  }

  /* â”€â”€â”€ Conversation View â”€â”€â”€ */
  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col md:h-[calc(100dvh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700 transition hover:bg-zinc-100"
          onClick={() => navigate("/chat")}
          aria-label="Back to conversations"
        >
          <BackIcon />
        </button>
        <ThreadAvatar label={selectedThread.label} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-zinc-900">{selectedThread.label}</p>
          <p className="truncate text-xs text-zinc-500">
            {selectedTyping ? (
              <span className="font-semibold text-indigo-600">typing…</span>
            ) : selectedThread.toRole === "security" ? (
              "Security Officer"
            ) : (
              `Flat ${selectedThread.label}`
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 py-4">
        {selectedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl" aria-hidden="true">💬</span>
            <p className="mt-2 text-sm text-zinc-400">No messages yet. Say hello!</p>
          </div>
        )}
        {selectedMessages.map((message) => {
          const mine = message.senderRole === "security" && message.senderUnit === officerId;
          // Identify the exact sender: officer name+gate for security, resident name+unit for residents
          const senderTag = mine
            ? `You · ${gate || "Security"}`
            : message.senderRole === "security"
              ? `${message.senderName || message.senderUnit || "Officer"}`
              : `${message.senderName || message.senderUnit || selectedThread.label} · ${String(message.senderUnit || "").trim().toUpperCase()}`;

          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] ${mine ? "" : "flex gap-2"}`}>
                {!mine && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center self-end rounded-xl bg-indigo-100 text-[11px] font-bold text-indigo-700">
                    {senderTag.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  {!mine && (
                    <p className="mb-1 ml-1 text-[11px] font-semibold text-zinc-500">{senderTag}</p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      mine
                        ? "rounded-br-md bg-indigo-600 text-white"
                        : "rounded-bl-md bg-white text-zinc-800"
                    }`}
                  >
                    {message.text && <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>}
                    <ChatAttachment attachment={message.attachment} />
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-indigo-200" : "text-zinc-400"}`}>
                      <span>{formatTime(message.timestamp || message.created_at || Date.now())}</span>
                      {mine && <Tick status={message.status} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-xs font-semibold text-indigo-700">{attachment.kind === "image" ? "📷" : "🎥"} {attachment.name}</span>
          <button type="button" className="ml-auto text-xs font-bold text-indigo-400 hover:text-rose-600" onClick={() => setAttachment(null)} aria-label="Remove attachment">✕</button>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleAttachmentChange}
        />
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photo or video"
        >
          <PaperclipIcon />
        </button>
        <textarea
          className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          placeholder="Type a message…"
          rows={1}
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          onBlur={() => {
            if (selectedThread?.toUnit) setTyping({ toUnit: selectedThread.toUnit, isTyping: false });
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() && !attachment}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 transition active:scale-95 disabled:opacity-40"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
