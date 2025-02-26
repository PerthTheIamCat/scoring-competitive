import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";

const ioHandler = (req: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log("🔌 Initializing Socket.IO...");
    const httpServer: HTTPServer = res.socket.server as any;
    const io = new Server(httpServer, {
      path: "/api/socket",
    });

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Listener for update-score (ที่มีอยู่แล้ว)
      socket.on("update-score", (data) => {
        // process update-score normally...
        io.emit("score-updated", data);
      });

      // Listener for admin events
      socket.on("admin-freeze", () => {
        console.log("Received admin-freeze from", socket.id);
        // Broadcast to everyone (or use socket.broadcast.emit if admin should not receive)
        io.emit("admin-freeze");
      });
      socket.on("admin-unfreeze", () => {
        console.log("Received admin-unfreeze from", socket.id);
        io.emit("admin-unfreeze");
      });
      socket.on("admin-next", () => {
        console.log("Received admin-next from", socket.id);
        io.emit("admin-next");
      });
    });
  }
  res.end();
};

export default ioHandler;
