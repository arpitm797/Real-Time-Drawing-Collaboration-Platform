"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    setLoggedIn(!!token);
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
      const slug = Math.random()
        .toString(36)
        .substring(2, 10);

      const response = await fetch(
        "http://localhost:3001/api/v1/room",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            slug,
          }),
        }
      );

      const data = await response.json();

      console.log("Room response:", data);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          setLoggedIn(false);
          router.push("/signin");
          return;
        }

        console.error("Create room failed:", data);
        return;
      }

      router.push(`/room/${data.room.slug}`);
    } catch (error) {
      console.error("Create room error:", error);
    }
  };

  // Don't show buttons until we know login state
  if (loggedIn === null) {
    return null;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
      }}
    >
      <h1>Excalidraw Clone</h1>

      {loggedIn ? (
        <>
          <button onClick={createRoom}>
            Create Room
          </button>

          <button onClick={logout}>
            Logout
          </button>
        </>
      ) : (
        <>
          <button onClick={() => router.push("/signin")}>
            Sign In
          </button>

          <button onClick={() => router.push("/signup")}>
            Sign Up
          </button>
        </>
      )}
    </main>
  );
}