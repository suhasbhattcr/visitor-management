export default function ChatTick({ status }) {
  if (status === "seen") {
    return <span className="font-bold text-blue-600">✓✓</span>;
  }

  if (status === "delivered") {
    return <span className="font-bold text-zinc-500">✓✓</span>;
  }

  return <span className="font-bold text-zinc-500">✓</span>;
}
