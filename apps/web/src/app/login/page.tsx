"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginRequest, saveTokens } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mohammed@abctech.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginRequest(email.trim(), password);
      saveTokens(result.accessToken, result.refreshToken);
      toast.success(result.message || "Login successful");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex flex-1 flex-col">
      <div className="flex justify-end px-6 py-4">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow)]">
          <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
            CertiFlow
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            Admin login
          </h1>
          <p className="mt-2 text-muted">
            Sign in to manage events and certificates.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
