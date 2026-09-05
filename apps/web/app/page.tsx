"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(localStorage.getItem("token")));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
  };

  const createRoom = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/signin");
      return;
    }

    try {
      setLoading(true);

      const slug = Math.random().toString(36).substring(2, 10);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slug }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          setLoggedIn(false);
          router.push("/signin");
          return;
        }

        alert(data.message || "Unable to create room");
        return;
      }

      router.push(`/room/${data.room.slug}`);
    } catch (error) {
      console.error("Create room error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loggedIn === null) {
    return (
      <main className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-slate-950 text-white">
      <nav className="h-16 border-b border-white/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold">
              D
            </div>

            <span className="text-lg font-bold tracking-tight">
              DrawSpace
            </span>
          </button>

          {loggedIn && (
            <button
              onClick={logout}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      <section className="h-[calc(100vh-4rem)]">
        <div className="mx-auto grid h-full max-w-7xl items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Real-time collaboration
            </div>

            <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Turn your ideas into
              <span className="block text-indigo-400">
                beautiful drawings.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              A simple and powerful collaborative whiteboard for creating,
              sharing, and working together in real time.
            </p>

            <div className="mt-7">
              <button
                onClick={createRoom}
                disabled={loading}
                className="rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating room..." : "Create a room"}
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Live collaboration
              </div>

              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Easy to use
              </div>

              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Secure rooms
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-indigo-600/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>

                <span className="text-xs text-slate-500">
                  collaborative-board
                </span>

                <div className="h-6 w-6 rounded-full bg-indigo-500/30" />
              </div>

              <div className="grid grid-cols-[48px_1fr]">
                <div className="flex flex-col items-center gap-5 border-r border-white/10 bg-slate-950/50 py-5">
                  <div className="rounded-lg bg-indigo-600 p-2 text-white">
                    ✎
                  </div>
                  <div className="text-slate-500">▱</div>
                  <div className="text-slate-500">□</div>
                  <div className="text-slate-500">T</div>
                  <div className="text-slate-500">⌕</div>
                </div>

                <div className="relative h-[300px] overflow-hidden bg-white sm:h-[350px]">
                  <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" />

                  <svg
                    viewBox="0 0 500 360"
                    className="relative h-full w-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M80 245C120 180 150 120 210 155C260 185 270 260 330 215C370 185 390 130 425 105"
                      stroke="#6366F1"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />

                    <rect
                      x="125"
                      y="70"
                      width="120"
                      height="80"
                      rx="8"
                      stroke="#0F172A"
                      strokeWidth="5"
                    />

                    <circle
                      cx="350"
                      cy="115"
                      r="38"
                      stroke="#F59E0B"
                      strokeWidth="7"
                    />

                    <path
                      d="M275 275L320 235L365 275L320 315L275 275Z"
                      stroke="#10B981"
                      strokeWidth="7"
                      strokeLinejoin="round"
                    />

                    <text
                      x="185"
                      y="112"
                      fill="#0F172A"
                      fontSize="18"
                      fontFamily="Arial"
                      fontWeight="bold"
                    >
                      Ideas
                    </text>
                  </svg>

                  <div className="absolute bottom-4 left-4 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-lg">
                    3 people are editing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}