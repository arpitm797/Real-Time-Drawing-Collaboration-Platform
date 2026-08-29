"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Point = {
  x: number;
  y: number;
};

type Tool =
  | "freehand"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "eraser";

type DrawData = {
  id: string;
  type: Tool;
  from: Point;
  to: Point;
  text?: string;
};

export default function RoomPage() {
  const params = useParams();

  const roomId = params.roomId as string;

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const wsRef =
    useRef<WebSocket | null>(null);

  const drawingsRef =
    useRef<DrawData[]>([]);

  const drawingRef =
    useRef(false);

  const startPointRef =
    useRef<Point | null>(null);

  const lastPointRef =
    useRef<Point | null>(null);

  const historyRef =
    useRef<DrawData[][]>([]);

  const redoRef =
    useRef<DrawData[][]>([]);

  const [tool, setTool] =
    useState<Tool>("freehand");

  const [connected, setConnected] =
    useState(false);

  // ==========================================
  // CREATE ID
  // ==========================================

  const generateId = () => {
    return (
      Date.now().toString() +
      Math.random()
        .toString(36)
        .substring(2, 9)
    );
  };

  // ==========================================
  // CLEAR CANVAS
  // ==========================================

  const clearCanvas = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.fillStyle = "black";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  };

  // ==========================================
  // FREEHAND
  // ==========================================

  const drawFreehand = (
    from: Point,
    to: Point
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.beginPath();

    ctx.moveTo(
      from.x,
      from.y
    );

    ctx.lineTo(
      to.x,
      to.y
    );

    ctx.strokeStyle = "white";

    ctx.lineWidth = 3;

    ctx.lineCap = "round";

    ctx.stroke();
  };

  // ==========================================
  // LINE
  // ==========================================

  const drawLine = (
    from: Point,
    to: Point
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.beginPath();

    ctx.moveTo(
      from.x,
      from.y
    );

    ctx.lineTo(
      to.x,
      to.y
    );

    ctx.strokeStyle = "white";

    ctx.lineWidth = 3;

    ctx.stroke();
  };

  // ==========================================
  // RECTANGLE
  // ==========================================

  const drawRectangle = (
    from: Point,
    to: Point
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const x = Math.min(
      from.x,
      to.x
    );

    const y = Math.min(
      from.y,
      to.y
    );

    const width = Math.abs(
      to.x - from.x
    );

    const height = Math.abs(
      to.y - from.y
    );

    ctx.beginPath();

    ctx.rect(
      x,
      y,
      width,
      height
    );

    ctx.strokeStyle = "white";

    ctx.lineWidth = 3;

    ctx.stroke();
  };

  // ==========================================
  // CIRCLE
  // ==========================================

  const drawCircle = (
    from: Point,
    to: Point
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const centerX =
      (from.x + to.x) / 2;

    const centerY =
      (from.y + to.y) / 2;

    const radiusX =
      Math.abs(
        to.x - from.x
      ) / 2;

    const radiusY =
      Math.abs(
        to.y - from.y
      ) / 2;

    ctx.beginPath();

    ctx.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle = "white";

    ctx.lineWidth = 3;

    ctx.stroke();
  };

  // ==========================================
  // ARROW
  // ==========================================

  const drawArrow = (
    from: Point,
    to: Point
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const angle =
      Math.atan2(
        to.y - from.y,
        to.x - from.x
      );

    const arrowLength = 15;

    // Main line

    ctx.beginPath();

    ctx.moveTo(
      from.x,
      from.y
    );

    ctx.lineTo(
      to.x,
      to.y
    );

    ctx.strokeStyle = "white";

    ctx.lineWidth = 3;

    ctx.stroke();

    // Arrow head

    ctx.beginPath();

    ctx.moveTo(
      to.x,
      to.y
    );

    ctx.lineTo(
      to.x -
        arrowLength *
          Math.cos(
            angle - Math.PI / 6
          ),
      to.y -
        arrowLength *
          Math.sin(
            angle - Math.PI / 6
          )
    );

    ctx.lineTo(
      to.x -
        arrowLength *
          Math.cos(
            angle + Math.PI / 6
          ),
      to.y -
        arrowLength *
          Math.sin(
            angle + Math.PI / 6
          )
    );

    ctx.closePath();

    ctx.fillStyle = "white";

    ctx.fill();
  };

  // ==========================================
  // TEXT
  // ==========================================

  const drawText = (
    point: Point,
    text: string
  ) => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.font =
      "24px Arial";

    ctx.fillStyle =
      "white";

    ctx.fillText(
      text,
      point.x,
      point.y
    );
  };

  // ==========================================
  // DRAW SHAPE
  // ==========================================

  const drawShape = (
    drawing: DrawData
  ) => {
    if (
      drawing.type ===
      "freehand"
    ) {
      drawFreehand(
        drawing.from,
        drawing.to
      );
    }

    if (
      drawing.type ===
      "rectangle"
    ) {
      drawRectangle(
        drawing.from,
        drawing.to
      );
    }

    if (
      drawing.type ===
      "circle"
    ) {
      drawCircle(
        drawing.from,
        drawing.to
      );
    }

    if (
      drawing.type ===
      "line"
    ) {
      drawLine(
        drawing.from,
        drawing.to
      );
    }

    if (
      drawing.type ===
      "arrow"
    ) {
      drawArrow(
        drawing.from,
        drawing.to
      );
    }

    if (
      drawing.type ===
        "text" &&
      drawing.text
    ) {
      drawText(
        drawing.from,
        drawing.text
      );
    }
  };

  // ==========================================
  // REDRAW EVERYTHING
  // ==========================================

  const redrawCanvas = () => {
    clearCanvas();

    drawingsRef.current.forEach(
      (drawing) => {
        drawShape(drawing);
      }
    );
  };

  // ==========================================
  // SAVE HISTORY
  // ==========================================

  const saveHistory = () => {
    historyRef.current.push(
      JSON.parse(
        JSON.stringify(
          drawingsRef.current
        )
      )
    );

    redoRef.current = [];
  };

  // ==========================================
  // SEND DRAWING
  // ==========================================

  const sendDrawing = (
    drawing: DrawData
  ) => {
    drawingsRef.current.push(
      drawing
    );

    if (
      wsRef.current &&
      wsRef.current.readyState ===
        WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          type: "draw",
          data: drawing,
        })
      );
    }
  };

  // ==========================================
  // DISTANCE BETWEEN TWO POINTS
  // ==========================================

  const distanceToPoint = (
    a: Point,
    b: Point
  ) => {
    return Math.hypot(
      a.x - b.x,
      a.y - b.y
    );
  };

  // ==========================================
  // DISTANCE TO LINE
  // ==========================================

  const distanceToLine = (
    point: Point,
    lineStart: Point,
    lineEnd: Point
  ) => {
    const dx =
      lineEnd.x -
      lineStart.x;

    const dy =
      lineEnd.y -
      lineStart.y;

    if (
      dx === 0 &&
      dy === 0
    ) {
      return distanceToPoint(
        point,
        lineStart
      );
    }

    const t =
      ((point.x -
        lineStart.x) *
        dx +
        (point.y -
          lineStart.y) *
          dy) /
      (dx * dx + dy * dy);

    const clampedT =
      Math.max(
        0,
        Math.min(1, t)
      );

    const closest = {
      x:
        lineStart.x +
        clampedT * dx,

      y:
        lineStart.y +
        clampedT * dy,
    };

    return distanceToPoint(
      point,
      closest
    );
  };

  // ==========================================
  // CHECK IF ERASER TOUCHES SHAPE
  // ==========================================

  const isPointNearDrawing = (
    point: Point,
    drawing: DrawData
  ) => {
    const threshold = 25;

    // LINE / ARROW / FREEHAND

    if (
      drawing.type ===
        "freehand" ||
      drawing.type ===
        "line" ||
      drawing.type ===
        "arrow"
    ) {
      return (
        distanceToLine(
          point,
          drawing.from,
          drawing.to
        ) < threshold
      );
    }

    // RECTANGLE

    if (
      drawing.type ===
      "rectangle"
    ) {
      const left =
        Math.min(
          drawing.from.x,
          drawing.to.x
        );

      const right =
        Math.max(
          drawing.from.x,
          drawing.to.x
        );

      const top =
        Math.min(
          drawing.from.y,
          drawing.to.y
        );

      const bottom =
        Math.max(
          drawing.from.y,
          drawing.to.y
        );

      const nearLeft =
        Math.abs(
          point.x - left
        ) < threshold &&
        point.y >=
          top - threshold &&
        point.y <=
          bottom + threshold;

      const nearRight =
        Math.abs(
          point.x - right
        ) < threshold &&
        point.y >=
          top - threshold &&
        point.y <=
          bottom + threshold;

      const nearTop =
        Math.abs(
          point.y - top
        ) < threshold &&
        point.x >=
          left - threshold &&
        point.x <=
          right + threshold;

      const nearBottom =
        Math.abs(
          point.y - bottom
        ) < threshold &&
        point.x >=
          left - threshold &&
        point.x <=
          right + threshold;

      return (
        nearLeft ||
        nearRight ||
        nearTop ||
        nearBottom
      );
    }

    // CIRCLE

    if (
      drawing.type ===
      "circle"
    ) {
      const centerX =
        (drawing.from.x +
          drawing.to.x) /
        2;

      const centerY =
        (drawing.from.y +
          drawing.to.y) /
        2;

      const radiusX =
        Math.abs(
          drawing.to.x -
            drawing.from.x
        ) / 2;

      const radiusY =
        Math.abs(
          drawing.to.y -
            drawing.from.y
        ) / 2;

      if (
        radiusX === 0 ||
        radiusY === 0
      ) {
        return false;
      }

      const dx =
        point.x - centerX;

      const dy =
        point.y - centerY;

      const normalizedDistance =
        Math.sqrt(
          (dx * dx) /
            (radiusX *
              radiusX) +
            (dy * dy) /
              (radiusY *
                radiusY)
        );

      return (
        Math.abs(
          normalizedDistance -
            1
        ) < 0.2
      );
    }

    // TEXT

    if (
      drawing.type ===
      "text"
    ) {
      return (
        distanceToPoint(
          point,
          drawing.from
        ) < 40
      );
    }

    return false;
  };

  // ==========================================
  // GET MOUSE POSITION
  // ==========================================

  const getPosition = (
    event: React.MouseEvent<HTMLCanvasElement>
  ): Point => {
    const canvas =
      canvasRef.current!;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,
    };
  };

  // ==========================================
  // MOUSE DOWN
  // ==========================================

  const handleMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const point =
      getPosition(event);

    // TEXT

    if (
      tool === "text"
    ) {
      const text =
        window.prompt(
          "Enter text:"
        );

      if (!text) return;

      saveHistory();

      const drawing: DrawData =
        {
          id: generateId(),
          type: "text",
          from: point,
          to: point,
          text,
        };

      drawText(
        point,
        text
      );

      sendDrawing(
        drawing
      );

      return;
    }

    // ERASER

    if (
      tool === "eraser"
    ) {
      saveHistory();

      drawingRef.current =
        true;

      lastPointRef.current =
        point;

      return;
    }

    // OTHER TOOLS

    saveHistory();

    drawingRef.current =
      true;

    startPointRef.current =
      point;

    lastPointRef.current =
      point;
  };

  // ==========================================
  // MOUSE MOVE
  // ==========================================

  const handleMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (
      !drawingRef.current
    ) {
      return;
    }

    const currentPoint =
      getPosition(event);

    // ========================================
    // FREEHAND
    // ========================================

    if (
      tool === "freehand"
    ) {
      const previous =
        lastPointRef.current;

      if (!previous) return;

      drawFreehand(
        previous,
        currentPoint
      );

      const drawing: DrawData =
        {
          id: generateId(),
          type: "freehand",
          from: previous,
          to: currentPoint,
        };

      drawingsRef.current.push(
        drawing
      );

      if (
        wsRef.current &&
        wsRef.current.readyState ===
          WebSocket.OPEN
      ) {
        wsRef.current.send(
          JSON.stringify({
            type: "draw",
            data: drawing,
          })
        );
      }

      lastPointRef.current =
        currentPoint;

      return;
    }

    // ========================================
    // ERASER
    // ========================================

    if (
      tool === "eraser"
    ) {
      const previous =
        lastPointRef.current;

      if (!previous) return;

      const oldDrawings =
        drawingsRef.current;

      const newDrawings =
        oldDrawings.filter(
          (drawing) => {
            return !isPointNearDrawing(
              currentPoint,
              drawing
            );
          }
        );

      if (
        newDrawings.length !==
        oldDrawings.length
      ) {
        drawingsRef.current =
          newDrawings;

        redrawCanvas();
      }

      lastPointRef.current =
        currentPoint;

      return;
    }

    // ========================================
    // SHAPE PREVIEW
    // ========================================

    redrawCanvas();

    const start =
      startPointRef.current;

    if (!start) return;

    if (
      tool === "rectangle"
    ) {
      drawRectangle(
        start,
        currentPoint
      );
    }

    if (
      tool === "circle"
    ) {
      drawCircle(
        start,
        currentPoint
      );
    }

    if (
      tool === "line"
    ) {
      drawLine(
        start,
        currentPoint
      );
    }

    if (
      tool === "arrow"
    ) {
      drawArrow(
        start,
        currentPoint
      );
    }
  };

  // ==========================================
  // MOUSE UP
  // ==========================================

  const handleMouseUp = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (
      !drawingRef.current
    ) {
      return;
    }

    const currentPoint =
      getPosition(event);

    const start =
      startPointRef.current;

    // ERASER

    if (
      tool === "eraser"
    ) {
      drawingRef.current =
        false;

      lastPointRef.current =
        null;

      return;
    }

    if (!start) {
      drawingRef.current =
        false;

      return;
    }

    // SHAPES

    if (
      tool === "rectangle" ||
      tool === "circle" ||
      tool === "line" ||
      tool === "arrow"
    ) {
      const drawing: DrawData =
        {
          id: generateId(),

          type: tool,

          from: start,

          to: currentPoint,
        };

      sendDrawing(
        drawing
      );
    }

    drawingRef.current =
      false;

    startPointRef.current =
      null;

    lastPointRef.current =
      null;

    redrawCanvas();
  };

  // ==========================================
  // UNDO
  // ==========================================

  const undo = () => {
    if (
      historyRef.current
        .length === 0
    ) {
      return;
    }

    redoRef.current.push(
      JSON.parse(
        JSON.stringify(
          drawingsRef.current
        )
      )
    );

    const previous =
      historyRef.current.pop();

    if (!previous) return;

    drawingsRef.current =
      previous;

    redrawCanvas();
  };

  // ==========================================
  // REDO
  // ==========================================

  const redo = () => {
    if (
      redoRef.current
        .length === 0
    ) {
      return;
    }

    historyRef.current.push(
      JSON.parse(
        JSON.stringify(
          drawingsRef.current
        )
      )
    );

    const next =
      redoRef.current.pop();

    if (!next) return;

    drawingsRef.current =
      next;

    redrawCanvas();
  };

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.ctrlKey &&
        event.key.toLowerCase() ===
          "z"
      ) {
        event.preventDefault();

        undo();
      }

      if (
        event.ctrlKey &&
        event.key.toLowerCase() ===
          "y"
      ) {
        event.preventDefault();

        redo();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // WEBSOCKET
  // ==========================================

  useEffect(() => {
    if (!roomId) return;

    const ws =
      new WebSocket(
        "ws://localhost:8080"
      );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        "WebSocket connected"
      );

      setConnected(true);

      ws.send(
        JSON.stringify({
          type: "join-room",
          roomId,
        })
      );
    };

    ws.onmessage = (
      event
    ) => {
      const message =
        JSON.parse(
          event.data
        );

      console.log(
        "WebSocket message:",
        message
      );

      // EXISTING DRAWINGS

      if (
        message.type ===
        "existing-drawings"
      ) {
        drawingsRef.current =
          message.drawings;

        redrawCanvas();
      }

      // NEW DRAWING

      if (
        message.type ===
        "draw"
      ) {
        drawingsRef.current.push(
          message.data
        );

        drawShape(
          message.data
        );
      }
    };

    ws.onerror = (
      error
    ) => {
      console.error(
        "WebSocket error:",
        error
      );
    };

    ws.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );

      setConnected(false);
    };

    return () => {
      ws.close();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ==========================================
  // INITIAL CANVAS
  // ==========================================

  useEffect(() => {
    clearCanvas();
  }, []);

  // ==========================================
  // BUTTON STYLE
  // ==========================================

  const buttonStyle = (
    active: boolean
  ) => ({
    padding:
      "10px 14px",

    borderRadius:
      "8px",

    border:
      "1px solid #555",

    background:
      active
        ? "#444"
        : "#222",

    color:
      "white",

    cursor:
      "pointer",

    fontSize:
      "14px",
  });

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#111",

        padding:
          "20px",

        boxSizing:
          "border-box",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          marginBottom:
            "15px",
        }}
      >
        <h1
          style={{
            color:
              "white",

            margin:
              0,
          }}
        >
          Excalidraw Clone
        </h1>

        <div
          style={{
            color:
              connected
                ? "#4ade80"
                : "#ef4444",
          }}
        >
          {connected
            ? "● Connected"
            : "● Disconnected"}
        </div>
      </div>

      {/* TOOLBAR */}

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          gap:
            "8px",

          marginBottom:
            "15px",
        }}
      >
        <button
          style={buttonStyle(
            tool ===
              "freehand"
          )}
          onClick={() =>
            setTool(
              "freehand"
            )
          }
        >
          ✏️ Freehand
        </button>

        <button
          style={buttonStyle(
            tool ===
              "rectangle"
          )}
          onClick={() =>
            setTool(
              "rectangle"
            )
          }
        >
          ▭ Rectangle
        </button>

        <button
          style={buttonStyle(
            tool ===
              "circle"
          )}
          onClick={() =>
            setTool(
              "circle"
            )
          }
        >
          ◯ Circle
        </button>

        <button
          style={buttonStyle(
            tool ===
              "line"
          )}
          onClick={() =>
            setTool(
              "line"
            )
          }
        >
          ／ Line
        </button>

        <button
          style={buttonStyle(
            tool ===
              "arrow"
          )}
          onClick={() =>
            setTool(
              "arrow"
            )
          }
        >
          ➜ Arrow
        </button>

        <button
          style={buttonStyle(
            tool ===
              "text"
          )}
          onClick={() =>
            setTool(
              "text"
            )
          }
        >
          T Text
        </button>

        <button
          style={buttonStyle(
            tool ===
              "eraser"
          )}
          onClick={() =>
            setTool(
              "eraser"
            )
          }
        >
          🗑 Eraser
        </button>

        <button
          style={buttonStyle(
            false
          )}
          onClick={
            undo
          }
        >
          ↶ Undo
        </button>

        <button
          style={buttonStyle(
            false
          )}
          onClick={
            redo
          }
        >
          ↷ Redo
        </button>
      </div>

      {/* ROOM ID */}

      <div
        style={{
          color:
            "#aaa",

          marginBottom:
            "10px",
        }}
      >
        Room: {roomId}
      </div>

      {/* CANVAS */}

      <div
        style={{
          overflow:
            "auto",

          border:
            "1px solid #444",
        }}
      >
        <canvas
          ref={
            canvasRef
          }

          width={
            2000
          }

          height={
            1000
          }

          onMouseDown={
            handleMouseDown
          }

          onMouseMove={
            handleMouseMove
          }

          onMouseUp={
            handleMouseUp
          }

          onMouseLeave={
            handleMouseUp
          }

          style={{
            display:
              "block",

            background:
              "black",

            cursor:
              tool ===
              "text"
                ? "text"
                : "crosshair",
          }}
        />
      </div>
    </div>
  );
}