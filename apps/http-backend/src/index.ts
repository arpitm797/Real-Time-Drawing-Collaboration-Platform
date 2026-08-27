import express from "express";
import cors from "cors";
import { prisma } from "@repo/db";
import router from "./routes/auth";
import { authMiddleware } from "./middleware/auth";
import roomRouter from "./routes/room";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/v1",router);
app.use("/api/v1/room", roomRouter);

app.get("/api/v1/me", authMiddleware, (req, res) => {
  res.json({
    userId: req.userId,
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Excalidraw backend is running",
  });
});
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
  console.error("DATABASE ERROR:");
  console.error(error);

  res.status(500).json({
    error: "Database query failed",
  });
}
});
app.listen(3001, () => {
  console.log("HTTP backend running on port 3001");
});