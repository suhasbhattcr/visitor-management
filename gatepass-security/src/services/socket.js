import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4001";

export function createSocket({ role, officerId, officerName, gate }) {
  return io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { role, officerId: officerId || "", officerName: officerName || "", gate: gate || "" },
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 5_000,
    reconnectionAttempts: Infinity,
  });
}
