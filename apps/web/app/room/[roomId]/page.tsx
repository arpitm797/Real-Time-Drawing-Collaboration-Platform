"use client";

import {
  MouseEvent,
  PointerEvent,
  WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";

type Point = {
  x: number;
  y: number;
};

type Tool =
  | "select"
  | "freehand"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "eraser";

type DrawData = {
  id: string;
  type: Exclude<Tool, "select" | "eraser">;
  from: Point;
  to: Point;
  points?: Point[];
  text?: string;
};

type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";

const GRID_SIZE = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const ERASER_RADIUS = 10;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();

  const roomId = params.roomId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const drawingsRef = useRef<DrawData[]>([]);
  const historyRef = useRef<DrawData[][]>([]);
  const redoRef = useRef<DrawData[][]>([]);

  const viewportRef = useRef<Viewport>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const drawingRef = useRef(false);
  const panningRef = useRef(false);
  const erasingRef = useRef(false);
  const spacePressedRef = useRef(false);

  const startPointRef = useRef<Point | null>(null);
  const lastPointRef = useRef<Point | null>(null);
  const panStartRef = useRef<Point | null>(null);
  const panOriginRef = useRef<Viewport | null>(null);

  // Tracks the last size we actually resized the canvas backing store to,
  // so renderCanvas() doesn't reset the canvas (and drop in-flight drawing
  // state) on every single pointer-move sample.
  const lastSizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  const [tool, setTool] = useState<Tool>("freehand");
  const [connected, setConnected] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveHistory() {
    historyRef.current.push(
      JSON.parse(JSON.stringify(drawingsRef.current))
    );

    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }

    redoRef.current = [];
  }

  function screenToWorld(point: Point): Point {
    const viewport = viewportRef.current;

    return {
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom,
    };
  }

  function worldToScreen(point: Point): Point {
    const viewport = viewportRef.current;

    return {
      x: point.x * viewport.zoom + viewport.x,
      y: point.y * viewport.zoom + viewport.y,
    };
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function sendMessage(message: unknown) {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function addDrawing(drawing: DrawData, broadcast = true) {
    drawingsRef.current.push(drawing);

    if (broadcast) {
      sendMessage({
        type: "draw",
        roomId,
        data: drawing,
      });
    }

    renderCanvas();
  }

  function removeDrawing(id: string) {
    drawingsRef.current = drawingsRef.current.filter(
      (drawing) => drawing.id !== id
    );

    renderCanvas();
  }

  function clearCanvas() {
    if (drawingsRef.current.length === 0) return;

    saveHistory();
    drawingsRef.current = [];

    sendMessage({
      type: "clear",
      roomId,
    });

    renderCanvas();
  }

  function undo() {
    if (historyRef.current.length === 0) return;

    redoRef.current.push(
      JSON.parse(JSON.stringify(drawingsRef.current))
    );

    drawingsRef.current =
      historyRef.current.pop() || [];

    sendMessage({
      type: "replace",
      roomId,
      data: drawingsRef.current,
    });

    renderCanvas();
  }

  function redo() {
    if (redoRef.current.length === 0) return;

    historyRef.current.push(
      JSON.parse(JSON.stringify(drawingsRef.current))
    );

    drawingsRef.current =
      redoRef.current.pop() || [];

    sendMessage({
      type: "replace",
      roomId,
      data: drawingsRef.current,
    });

    renderCanvas();
  }

  // --- Eraser hit-testing -------------------------------------------------

  function distanceToSegment(p: Point, a: Point, b: Point) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return Math.hypot(p.x - a.x, p.y - a.y);
    }

    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));

    const projX = a.x + t * dx;
    const projY = a.y + t * dy;

    return Math.hypot(p.x - projX, p.y - projY);
  }

  function hitTestDrawing(
    drawing: DrawData,
    point: Point,
    threshold: number
  ) {
    if (drawing.type === "freehand" && drawing.points) {
      for (let index = 0; index < drawing.points.length - 1; index++) {
        const a = drawing.points[index];
        const b = drawing.points[index + 1];

        if (a && b && distanceToSegment(point, a, b) <= threshold) {
          return true;
        }
      }
      return false;
    }

    if (drawing.type === "line" || drawing.type === "arrow") {
      return distanceToSegment(point, drawing.from, drawing.to) <= threshold;
    }

    if (
      drawing.type === "rectangle" ||
      drawing.type === "circle" ||
      drawing.type === "text"
    ) {
      const minX = Math.min(drawing.from.x, drawing.to.x) - threshold;
      const maxX = Math.max(drawing.from.x, drawing.to.x) + threshold;
      const minY = Math.min(drawing.from.y, drawing.to.y) - threshold;
      const maxY = Math.max(drawing.from.y, drawing.to.y) + threshold;

      return (
        point.x >= minX &&
        point.x <= maxX &&
        point.y >= minY &&
        point.y <= maxY
      );
    }

    return false;
  }

  function eraseAtPoint(worldPoint: Point) {
    const threshold = ERASER_RADIUS / viewportRef.current.zoom;

    const hit = drawingsRef.current.find((drawing) =>
      hitTestDrawing(drawing, worldPoint, threshold)
    );

    if (!hit) return;

    saveHistory();

    drawingsRef.current = drawingsRef.current.filter(
      (drawing) => drawing.id !== hit.id
    );

    sendMessage({
      type: "erase",
      roomId,
      data: { id: hit.id },
    });

    renderCanvas();
  }

  // --- Rendering -----------------------------------------------------------

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const viewport = viewportRef.current;

    ctx.save();

    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, width, height);

    const startX =
      Math.floor(-viewport.x / viewport.zoom / GRID_SIZE) *
        GRID_SIZE -
      GRID_SIZE;

    const endX =
      Math.ceil(
        (width - viewport.x) / viewport.zoom / GRID_SIZE
      ) * GRID_SIZE +
      GRID_SIZE;

    const startY =
      Math.floor(-viewport.y / viewport.zoom / GRID_SIZE) *
        GRID_SIZE -
      GRID_SIZE;

    const endY =
      Math.ceil(
        (height - viewport.y) / viewport.zoom / GRID_SIZE
      ) * GRID_SIZE +
      GRID_SIZE;

    ctx.strokeStyle = "#1c2230";
    ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += GRID_SIZE) {
      const screenX = x * viewport.zoom + viewport.x;

      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();
    }

    for (let y = startY; y <= endY; y += GRID_SIZE) {
      const screenY = y * viewport.zoom + viewport.y;

      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawShape(
    ctx: CanvasRenderingContext2D,
    drawing: DrawData
  ) {
    const from = worldToScreen(drawing.from);
    const to = worldToScreen(drawing.to);

    ctx.save();

    ctx.strokeStyle = "#f5f6fa";
    ctx.fillStyle = "transparent";
    ctx.lineWidth = Math.max(2, 2.5 * viewportRef.current.zoom);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (drawing.type === "freehand") {
      const points = drawing.points || [drawing.from, drawing.to];

      if (points.length === 0) {
        ctx.restore();
        return;
      }

      const firstPoint = points[0];

      if (!firstPoint) {
        ctx.restore();
        return;
      }

      ctx.beginPath();

      const first = worldToScreen(firstPoint);
      ctx.moveTo(first.x, first.y);

      for (let index = 1; index < points.length; index++) {
        const point = points[index];

        if (!point) continue;

        const screenPoint = worldToScreen(point);
        ctx.lineTo(screenPoint.x, screenPoint.y);
      }

      if (points.length === 1) {
        ctx.fillStyle = "#f5f6fa";
        ctx.beginPath();
        ctx.arc(first.x, first.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }

    if (drawing.type === "line") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    if (drawing.type === "arrow") {
      const angle = Math.atan2(
        to.y - from.y,
        to.x - from.x
      );

      const arrowLength = 12;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        to.x - arrowLength * Math.cos(angle - Math.PI / 6),
        to.y - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(to.x, to.y);
      ctx.lineTo(
        to.x - arrowLength * Math.cos(angle + Math.PI / 6),
        to.y - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }

    if (drawing.type === "rectangle") {
      ctx.strokeRect(
        from.x,
        from.y,
        to.x - from.x,
        to.y - from.y
      );
    }

    if (drawing.type === "circle") {
      const radiusX = Math.abs(to.x - from.x) / 2;
      const radiusY = Math.abs(to.y - from.y) / 2;

      const centerX = Math.min(from.x, to.x) + radiusX;
      const centerY = Math.min(from.y, to.y) + radiusY;

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
      ctx.stroke();
    }

    if (drawing.type === "text" && drawing.text) {
      ctx.fillStyle = "#f5f6fa";
      ctx.font = `${16 * viewportRef.current.zoom}px sans-serif`;
      ctx.fillText(drawing.text, from.x, from.y);
    }

    ctx.restore();
  }

  function renderCanvas() {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const sizeChanged =
      lastSizeRef.current.width !== rect.width ||
      lastSizeRef.current.height !== rect.height ||
      lastSizeRef.current.dpr !== dpr;

    // Only touch canvas.width/height when the size actually changed.
    // Reassigning them (even to the same value) wipes the backing store,
    // and this function runs on every single pointer-move sample while
    // drawing, so doing it unconditionally made strokes stutter/drop.
    if (sizeChanged) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      lastSizeRef.current = { width: rect.width, height: rect.height, dpr };
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGrid(ctx, rect.width, rect.height);

    for (const drawing of drawingsRef.current) {
      drawShape(ctx, drawing);
    }
  }

  // --- Pointer handling ------------------------------------------------------

  function handlePointerDown(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    const point = getCanvasPoint(event);

    const shouldPan =
      event.button === 1 ||
      event.button === 2 ||
      spacePressedRef.current ||
      tool === "select";

    if (shouldPan) {
      event.preventDefault();

      panningRef.current = true;
      panStartRef.current = point;
      panOriginRef.current = {
        ...viewportRef.current,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== 0) return;

    const worldPoint = screenToWorld(point);

    if (tool === "eraser") {
      erasingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      eraseAtPoint(worldPoint);
      return;
    }

    drawingRef.current = true;
    startPointRef.current = worldPoint;
    lastPointRef.current = worldPoint;

    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "freehand") {
      drawingsRef.current.push({
        id: `temporary-${generateId()}`,
        type: "freehand",
        from: worldPoint,
        to: worldPoint,
        points: [worldPoint],
      });

      renderCanvas();
    }
  }

  function handlePointerMove(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    const point = getCanvasPoint(event);

    if (erasingRef.current) {
      eraseAtPoint(screenToWorld(point));
      return;
    }

    if (panningRef.current) {
      const panStart = panStartRef.current;
      const panOrigin = panOriginRef.current;

      if (!panStart || !panOrigin) return;

      viewportRef.current = {
        ...viewportRef.current,
        x: panOrigin.x + point.x - panStart.x,
        y: panOrigin.y + point.y - panStart.y,
      };

      renderCanvas();
      return;
    }

    if (!drawingRef.current) return;

    const start = startPointRef.current;
    const last = lastPointRef.current;

    if (!start || !last) return;

    const current = screenToWorld(point);

    if (tool === "freehand") {
      const existing = drawingsRef.current.find((drawing) =>
        drawing.id.startsWith("temporary-")
      );

      if (existing) {
        existing.points = [
          ...(existing.points || []),
          current,
        ];
        existing.to = current;
      } else {
        drawingsRef.current.push({
          id: `temporary-${generateId()}`,
          type: "freehand",
          from: start,
          to: current,
          points: [start, current],
        });
      }

      lastPointRef.current = current;
      renderCanvas();
      return;
    }

    const temporaryDrawing: DrawData = {
      id: "temporary-preview",
      type: tool as Exclude<Tool, "select" | "eraser">,
      from: start,
      to: current,
    };

    const drawingsWithoutPreview = drawingsRef.current.filter(
      (drawing) => drawing.id !== "temporary-preview"
    );

    drawingsRef.current = [
      ...drawingsWithoutPreview,
      temporaryDrawing,
    ];

    renderCanvas();
  }

  function handlePointerUp(
    event: PointerEvent<HTMLCanvasElement>
  ) {
    if (erasingRef.current) {
      erasingRef.current = false;
      return;
    }

    if (panningRef.current) {
      panningRef.current = false;
      panStartRef.current = null;
      panOriginRef.current = null;
      return;
    }

    if (!drawingRef.current) return;

    drawingRef.current = false;

    const start = startPointRef.current;
    const last = lastPointRef.current;

    if (!start || !last) return;

    const point = getCanvasPoint(event);
    const end = screenToWorld(point);

    const temporaryDrawing = drawingsRef.current.find((drawing) =>
      drawing.id.startsWith("temporary-")
    );

    drawingsRef.current = drawingsRef.current.filter(
      (drawing) =>
        !drawing.id.startsWith("temporary-") &&
        drawing.id !== "temporary-preview"
    );

    if (tool === "text") {
      const text = window.prompt("Enter text");

      if (text) {
        saveHistory();

        addDrawing({
          id: generateId(),
          type: "text",
          from: start,
          to: end,
          text,
        });
      }

      return;
    }

    saveHistory();

    const drawing: DrawData = {
      id: generateId(),
      type: tool as Exclude<Tool, "select" | "eraser">,
      from: start,
      to: end,
    };

    if (tool === "freehand") {
      drawing.points = temporaryDrawing?.points || [start, end];
    }

    addDrawing(drawing);

    startPointRef.current = null;
    lastPointRef.current = null;
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const oldZoom = viewportRef.current.zoom;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, oldZoom * zoomFactor)
    );

    const worldX =
      (mouseX - viewportRef.current.x) / oldZoom;

    const worldY =
      (mouseY - viewportRef.current.y) / oldZoom;

    viewportRef.current = {
      zoom: newZoom,
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom,
    };

    setZoom(newZoom);
    renderCanvas();
  }

  function resetView() {
    viewportRef.current = {
      x: 0,
      y: 0,
      zoom: 1,
    };

    setZoom(1);
    renderCanvas();
  }

  function zoomIn() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const oldZoom = viewportRef.current.zoom;
    const newZoom = Math.min(MAX_ZOOM, oldZoom * 1.2);

    const worldX =
      (centerX - viewportRef.current.x) / oldZoom;

    const worldY =
      (centerY - viewportRef.current.y) / oldZoom;

    viewportRef.current = {
      zoom: newZoom,
      x: centerX - worldX * newZoom,
      y: centerY - worldY * newZoom,
    };

    setZoom(newZoom);
    renderCanvas();
  }

  function zoomOut() {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const oldZoom = viewportRef.current.zoom;
    const newZoom = Math.max(MIN_ZOOM, oldZoom * 0.8);

    const worldX =
      (centerX - viewportRef.current.x) / oldZoom;

    const worldY =
      (centerY - viewportRef.current.y) / oldZoom;

    viewportRef.current = {
      zoom: newZoom,
      x: centerX - worldX * newZoom,
      y: centerY - worldY * newZoom,
    };

    setZoom(newZoom);
    renderCanvas();
  }

  function handleContextMenu(event: MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
  }

  useEffect(() => {
    renderCanvas();

    const resizeObserver = new ResizeObserver(() => {
      renderCanvas();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);

      ws.send(
        JSON.stringify({
          type: "join-room",
          roomId,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "draw" && message.data) {
          drawingsRef.current.push(message.data);
          renderCanvas();
        }

        if (message.type === "existing-drawings") {
          drawingsRef.current = message.data || [];
          renderCanvas();
        }

        if (message.type === "clear") {
          drawingsRef.current = [];
          renderCanvas();
        }

        if (message.type === "erase" && message.data?.id) {
          removeDrawing(message.data.id);
        }

        if (message.type === "replace") {
          drawingsRef.current = message.data || [];
          renderCanvas();
        }
      } catch {
        console.error("Invalid WebSocket message");
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        spacePressedRef.current = true;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        undo();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "z"
      ) {
        event.preventDefault();
        redo();
      }

      if (event.key === "Escape") {
        setTool("select");
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        spacePressedRef.current = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const tools: { name: Tool; label: string; icon: string }[] = [
    { name: "select", label: "Pan", icon: "✋" },
    { name: "freehand", label: "Draw", icon: "✏️" },
    { name: "rectangle", label: "Rectangle", icon: "▭" },
    { name: "circle", label: "Circle", icon: "○" },
    { name: "line", label: "Line", icon: "╱" },
    { name: "arrow", label: "Arrow", icon: "➜" },
    { name: "text", label: "Text", icon: "T" },
    { name: "eraser", label: "Eraser", icon: "🧽" },
  ];

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white"
          >
            D
          </button>

          <div>
            <h1 className="text-sm font-bold text-slate-900">
              DrawSpace
            </h1>

            <p className="text-xs text-slate-500">
              Room: {roomId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-red-500"
              }`}
            />

            {connected ? "Connected" : "Disconnected"}
          </div>

          <button
            onClick={() => setShowHelp((value) => !value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            ?
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside className="absolute left-4 top-4 z-10 flex w-14 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-2xl shadow-black/40 backdrop-blur">
          {tools.map((item) => (
            <button
              key={item.name}
              title={item.label}
              onClick={() => setTool(item.name)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${
                tool === item.name
                  ? "bg-indigo-500 text-white shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
            </button>
          ))}

          <div className="my-1 h-px w-8 bg-white/10" />

          <button
            title="Undo"
            onClick={undo}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-slate-300 hover:bg-white/10 hover:text-white"
          >
            ↶
          </button>

          <button
            title="Redo"
            onClick={redo}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-slate-300 hover:bg-white/10 hover:text-white"
          >
            ↷
          </button>

          <button
            title="Clear canvas"
            onClick={clearCanvas}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-red-400 hover:bg-red-500/10"
          >
            🗑
          </button>
        </aside>

        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            className={`block h-full w-full touch-none ${
              tool === "select" || spacePressedRef.current
                ? "cursor-grab"
                : "cursor-crosshair"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={handleContextMenu}
          />

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1 shadow-2xl shadow-black/40 backdrop-blur">
            <button
              onClick={zoomOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-200 hover:bg-white/10"
            >
              −
            </button>

            <button
              onClick={resetView}
              className="min-w-16 rounded-lg px-2 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={zoomIn}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-200 hover:bg-white/10"
            >
              +
            </button>
          </div>

          {showHelp && (
            <div className="absolute right-4 top-4 w-64 rounded-2xl border border-white/10 bg-slate-900/90 p-4 text-sm text-slate-300 shadow-2xl shadow-black/40 backdrop-blur">
              <h2 className="mb-3 font-semibold text-white">
                Canvas controls
              </h2>

              <ul className="space-y-2 text-xs leading-5">
                <li>• Mouse wheel: zoom in or out</li>
                <li>• Middle mouse drag: move canvas</li>
                <li>• Space + drag: move canvas</li>
                <li>• Pan tool: move canvas</li>
                <li>• Eraser tool: click or drag over a shape to remove it</li>
                <li>• Ctrl + Z: undo</li>
                <li>• Ctrl + Shift + Z: redo</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}