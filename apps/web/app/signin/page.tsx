"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "Demo@12345";

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fillDemoCredentials() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password");
      }

      const token =
        data.token ||
        data.accessToken ||
        data.user?.token;

      if (!token) {
        throw new Error("Login successful, but token was not received");
      }

      localStorage.setItem("token", token);

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left Section */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-black/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-indigo-600">
                D
              </div>

              <span className="text-xl font-bold tracking-tight">
                DrawSpace
              </span>
            </div>

            <div className="mt-32 max-w-xl">
              <h1 className="text-5xl font-bold leading-tight xl:text-6xl">
                Create.
                <br />
                Collaborate.
                <br />
                Bring ideas to life.
              </h1>

              <p className="mt-7 max-w-lg text-lg leading-8 text-indigo-100">
                Work together on a shared canvas in real time with your team,
                classmates, or friends.
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-sm text-indigo-100">
              Your ideas deserve a space where everyone can contribute.
            </p>
          </div>
        </section>

        {/* Right Section */}
        <section className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 sm:px-12 lg:px-20">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black">
                  D
                </div>

                <span className="text-xl font-bold">DrawSpace</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Sign in to continue to your workspace.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              Use demo credentials
            </button>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="font-medium text-slate-300">
                Demo account
              </p>

              <p className="mt-2 text-slate-500">
                Email:{" "}
                <span className="text-slate-300">{DEMO_EMAIL}</span>
              </p>

              <p className="mt-1 text-slate-500">
                Password:{" "}
                <span className="text-slate-300">{DEMO_PASSWORD}</span>
              </p>
            </div>

            <p className="mt-8 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="font-semibold text-indigo-400 transition hover:text-indigo-300"
              >
                Sign up
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}