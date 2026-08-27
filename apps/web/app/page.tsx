"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPoint = useRef<Point | null>(null);

  const [connected, setConnected] = useState(false);

  // -----------------------------
  // WebSocket connection
  // -----------------------------

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");

      setConnected(true);

      ws.send(
        JSON.stringify({
          type: "join-room",
          roomId: "my-first-room",
        })
      );
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      console.log("Received:", message);

      if (message.type === "draw") {
        drawLine(
          message.data.from,
          message.data.to
        );
      }
    };

    ws.onerror = () => {
      console.log("WebSocket error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");

      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // -----------------------------
  // Get mouse position
  // -----------------------------

  const getPosition = (
    event: React.MouseEvent<HTMLCanvasElement>
  ): Point => {
    const canvas = canvasRef.current!;

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  // -----------------------------
  // Draw line
  // -----------------------------

  const drawLine = (
    from: Point,
    to: Point
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.beginPath();

    ctx.moveTo(from.x, from.y);

    ctx.lineTo(to.x, to.y);

    ctx.strokeStyle = "black";

    ctx.lineWidth = 3;

    ctx.lineCap = "round";

    ctx.stroke();
  };

  // -----------------------------
  // Mouse down
  // -----------------------------

  const handleMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    drawing.current = true;

    const point = getPosition(event);

    lastPoint.current = point;

    console.log("Started drawing");
  };

  // -----------------------------
  // Mouse move
  // -----------------------------

  const handleMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!drawing.current) return;

    const currentPoint = getPosition(event);

    const previousPoint = lastPoint.current;

    if (!previousPoint) return;

    // Draw locally
    drawLine(
      previousPoint,
      currentPoint
    );

    // Send drawing to WebSocket
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "draw",

          data: {
            from: previousPoint,
            to: currentPoint,
          },
        })
      );
    }

    lastPoint.current = currentPoint;
  };

  // -----------------------------
  // Mouse up
  // -----------------------------

  const handleMouseUp = () => {
    drawing.current = false;

    lastPoint.current = null;

    console.log("Stopped drawing");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#222",
        padding: "40px",
      }}
    >

      {/* Header */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >

        <h1
          style={{
            color: "white",
            fontSize: "30px",
          }}
        >
          Excalidraw Clone
        </h1>

        <div
          style={{
            color: connected
              ? "#22c55e"
              : "#ef4444",
            fontSize: "18px",
          }}
        >
          WebSocket:{" "}
          {connected
            ? "Connected ✅"
            : "Disconnected ❌"}
        </div>

      </div>

      {/* Canvas */}

      <canvas
        ref={canvasRef}
        width={2000}
        height={1000}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "block",
          background: "white",
          border: "3px solid red",
          cursor: "crosshair",
        }}
      />

    </div>
  );
}