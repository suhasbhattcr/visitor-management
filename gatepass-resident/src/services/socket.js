import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4001";

export function createSocket({ role, unit, residentName, residentUserId }) {
  return io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { role, unit, residentName: residentName || null, residentUserId: residentUserId || null },
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 5_000,
    reconnectionAttempts: Infinity,
  });
}
