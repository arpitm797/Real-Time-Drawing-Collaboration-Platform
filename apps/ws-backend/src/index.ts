import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({
  port: 8080,
});

const rooms = new Map<string, Set<WebSocket>>();

console.log("WebSocket server running on port 8080");

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  let currentRoom: string | null = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      // Join a room
      if (data.type === "join-room") {
        const roomId = data.roomId;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }

        rooms.get(roomId)!.add(ws);
        currentRoom = roomId;

        ws.send(
          JSON.stringify({
            type: "joined-room",
            roomId,
          })
        );

        console.log(`User joined room: ${roomId}`);
      }

      
      if (data.type === "draw") {
        if (!currentRoom) {
          return;
        }
        console.log(data)
        const room = rooms.get(currentRoom);

        if (!room) {
          return;
        }

        // Send to everyone except sender
        room.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "draw",
                data: data.data,
              })
            );
          }
        });
      }
    } catch (error) {
      console.error("Invalid message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");

    if (currentRoom) {
      const room = rooms.get(currentRoom);

      if (room) {
        room.delete(ws);

        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});