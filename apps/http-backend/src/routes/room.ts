import { Router } from "express";
import { prisma } from "@repo/db";
import { authMiddleware } from "../middleware/auth";

const router: ReturnType<typeof Router> = Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({
        message: "Slug is required",
      });
    }

    const existingRoom = await prisma.room.findUnique({
      where: {
        slug,
      },
    });

    if (existingRoom) {
      return res.status(409).json({
        message: "Room already exists",
      });
    }

    const room = await prisma.room.create({
      data: {
        slug,
        adminId: req.userId!,
      },
    });

    return res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("CREATE ROOM ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const room = await prisma.room.findUnique({
      where: {
        slug,
      },
    });

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    return res.status(200).json({
      room,
    });
  } catch (error) {
    console.error("GET ROOM ERROR:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;