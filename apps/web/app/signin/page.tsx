"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignin = async () => {
    console.log("SIGN IN BUTTON CLICKED");

    try {
      const response = await fetch(
        "http://localhost:3001/api/v1/signin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      console.log("SIGNIN STATUS:", response.status);

      const data = await response.json();

      console.log("SIGNIN RESPONSE:", data);

      if (!response.ok) {
        setMessage(data.message || "Signin failed");
        return;
      }

      localStorage.setItem("token", data.token);

      console.log("TOKEN SAVED");

      setMessage("Signin successful");

      router.push("/");
    } catch (error) {
      console.error("SIGNIN ERROR:", error);
      setMessage("Something went wrong");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "350px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
        }}
      >
        <h1>Sign In</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={handleSignin}
        >
          Sign In
        </button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}