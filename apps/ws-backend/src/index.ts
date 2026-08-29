import { WebSocketServer, WebSocket } from "ws";
import { prisma } from "@repo/db";

const wss = new WebSocketServer({
  port: 8080,
});

type Point = {
  x: number;
  y: number;
};

type DrawData = {
  from: Point;
  to: Point;
};

type Room = {
  clients: Set<WebSocket>;
  drawings: DrawData[];
};

const rooms = new Map<string, Room>();

console.log("WebSocket server running on port 8080");

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  let currentRoom: string | null = null;

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      // =========================
      // JOIN ROOM
      // =========================

      if (data.type === "join-room") {
        const roomId = data.roomId;

        if (!roomId) {
          return;
        }

        // Create room in memory if it doesn't exist
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            clients: new Set(),
            drawings: [],
          });
        }

        const room = rooms.get(roomId)!;

        room.clients.add(ws);
        currentRoom = roomId;

        console.log(`User joined room: ${roomId}`);

        // Tell client that it joined
        ws.send(
          JSON.stringify({
            type: "joined-room",
            roomId,
          })
        );

        // =========================
        // LOAD DRAWINGS FROM DATABASE
        // =========================

        const dbRoom = await prisma.room.findUnique({
          where: {
            slug: roomId,
          },
          include: {
            drawings: true,
          },
        });

        if (!dbRoom) {
          console.log(`Room not found in database: ${roomId}`);

          ws.send(
            JSON.stringify({
              type: "existing-drawings",
              drawings: [],
            })
          );

          return;
        }

        const drawings: DrawData[] = dbRoom.drawings.map((drawing) => ({
          from: {
            x: drawing.fromX,
            y: drawing.fromY,
          },
          to: {
            x: drawing.toX,
            y: drawing.toY,
          },
        }));

        // Store database drawings in memory
        room.drawings = drawings;

        // Send existing drawings to newly joined user
        ws.send(
          JSON.stringify({
            type: "existing-drawings",
            drawings,
          })
        );

        console.log(
          `Sent ${drawings.length} existing drawings to ${roomId}`
        );
      }

      // =========================
      // DRAW
      // =========================

      if (data.type === "draw") {
        if (!currentRoom) {
          return;
        }

        const room = rooms.get(currentRoom);

        if (!room) {
          return;
        }

        const drawData: DrawData = data.data;

        if (!drawData?.from || !drawData?.to) {
          return;
        }

        console.log("Drawing:", drawData);

        // Save in memory
        room.drawings.push(drawData);

        // =========================
        // SAVE TO DATABASE
        // =========================

        const dbRoom = await prisma.room.findUnique({
          where: {
            slug: currentRoom,
          },
        });

        if (!dbRoom) {
          console.log(`Database room not found: ${currentRoom}`);
          return;
        }

        await prisma.drawing.create({
          data: {
            roomId: dbRoom.id,

            fromX: drawData.from.x,
            fromY: drawData.from.y,

            toX: drawData.to.x,
            toY: drawData.to.y,
          },
        });

        console.log("Drawing saved to database");

        // =========================
        // BROADCAST TO OTHER USERS
        // =========================

        room.clients.forEach((client) => {
          if (
            client !== ws &&
            client.readyState === WebSocket.OPEN
          ) {
            client.send(
              JSON.stringify({
                type: "draw",
                data: drawData,
              })
            );
          }
        });
      }
    } catch (error) {
      console.error("Invalid message:", error);
    }
  });

  // =========================
  // DISCONNECT
  // =========================

  ws.on("close", () => {
    console.log("Client disconnected");

    if (!currentRoom) {
      return;
    }

    const room = rooms.get(currentRoom);

    if (!room) {
      return;
    }

    room.clients.delete(ws);

    console.log(`User left room: ${currentRoom}`);

    // Delete empty room from memory
    if (room.clients.size === 0) {
      rooms.delete(currentRoom);

      console.log(`Room removed from memory: ${currentRoom}`);
    }
  });
});