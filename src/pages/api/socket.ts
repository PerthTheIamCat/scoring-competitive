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

    // Keep track of all connected socket IDs
    const connectedSockets = new Set();

    io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      connectedSockets.add(socket.id);

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", socket.id, reason);
        connectedSockets.delete(socket.id);
      });

      // A helper function to broadcast an admin event to all connected sockets
      function broadcastAdminEvent(
        eventName,
        data,
        callback,
        maxRetries = 3,
        retryInterval = 2000
      ) {
        let attempts = 0;
        // Function to attempt broadcast to a given array of socket IDs
        function attemptBroadcast(socketIds) {
          attempts++;
          console.log(
            `Attempt ${attempts} for event "${eventName}" to sockets:`,
            socketIds
          );
          interface ClientAck {
            received: boolean;
          }

          interface AckResult {
            socketId: string;
            ack: boolean;
          }

          const ackPromises: Promise<AckResult>[] = socketIds.map(
            (socketId: string) => {
              return new Promise<AckResult>(
                (resolve: (value: AckResult) => void) => {
                  // Emit the event to a specific socket with a callback for its ack
                  io.to(socketId).emit(
                    eventName,
                    data,
                    (clientAck: ClientAck) => {
                      resolve({
                        socketId,
                        ack: clientAck && clientAck.received,
                      });
                    }
                  );
                }
              );
            }
          );
          Promise.all(ackPromises)
            .then((results) => {
              // Find sockets that did NOT acknowledge
              const unacked = results
                .filter((result) => !result.ack)
                .map((result) => result.socketId);
              if (unacked.length === 0) {
                console.log(`All sockets acknowledged event "${eventName}".`);
                if (callback) callback({ status: "ok", results });
              } else {
                console.log(
                  `Unacknowledged sockets for event "${eventName}":`,
                  unacked
                );
                if (attempts < maxRetries) {
                  setTimeout(() => {
                    attemptBroadcast(unacked);
                  }, retryInterval);
                } else {
                  console.error(
                    `Max retries reached for event "${eventName}". Unacked:`,
                    unacked
                  );
                  if (callback) callback({ status: "error", results, unacked });
                }
              }
            })
            .catch((err) => {
              console.error(
                `Error during broadcast of event "${eventName}":`,
                err
              );
              if (callback) callback({ status: "error", err });
            });
        }
        // Start by broadcasting to all connected sockets.
        attemptBroadcast(Array.from(connectedSockets));
      }

      // Listen for admin events and use our broadcast helper
      socket.on("admin-freeze", (data, callback) => {
        console.log("Received admin-freeze from", socket.id);
        broadcastAdminEvent("admin-freeze", data, callback);
      });
      socket.on("admin-unfreeze", (data, callback) => {
        console.log("Received admin-unfreeze from", socket.id);
        broadcastAdminEvent("admin-unfreeze", data, callback);
      });
      socket.on("admin-next", (data, callback) => {
        console.log("Received admin-next from", socket.id);
        broadcastAdminEvent("admin-next", data, callback);
      });
      socket.on("update-score", (data, callback) => {
        console.log("Received admin-next from", socket.id);
        broadcastAdminEvent("admin-next", data, callback);
      });
    });
  }
  res.end();
};

export default ioHandler;
