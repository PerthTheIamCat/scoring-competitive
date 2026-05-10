// lib/socketServer.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

declare global {
  // ประกาศ global variable ให้ TypeScript รู้จัก
  var io: Server | undefined;
}

export function initSocket(server: HTTPServer) {
  if (!global.io) {
    global.io = new Server(server, { path: "/api/socket" });
    global.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      socket.on("update-score", (data) => {
        global.io!.emit("score-updated", data);
      });
    });
  }
  return global.io;
}

export function getSocket() {
  if (!global.io) {
    throw new Error("Socket.io not initialized");
  }
  return global.io;
}
