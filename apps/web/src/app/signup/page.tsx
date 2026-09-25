"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ThemeToggle } from "@/components/theme-toggle";
import { registerRequest, saveTokens } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    organizationName: "",
    organizationEmail: "",
    organizationPhone: "",
    name: "",
    email: "",
    password: "",
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await registerRequest({
        organizationName: form.organizationName.trim(),
        organizationEmail: form.organizationEmail.trim(),
        organizationPhone: form.organizationPhone.trim() || undefined,
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      saveTokens(result.accessToken, result.refreshToken);
      toast.success(result.message || "Organization created");
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
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
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow)]">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            CertiFlow
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            Create organization
          </h1>
          <p className="mt-2 text-muted">
            Register your school or company and an admin account.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Organization
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Organization name
              </span>
              <input
                required
                minLength={2}
                value={form.organizationName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, organizationName: e.target.value }))
                }
                placeholder="ABC Public School"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Organization email
              </span>
              <input
                type="email"
                required
                value={form.organizationEmail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, organizationEmail: e.target.value }))
                }
                placeholder="office@school.edu"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Phone (optional)
              </span>
              <input
                value={form.organizationPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, organizationPhone: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>

            <p className="pt-2 text-xs font-medium uppercase tracking-wide text-accent">
              Admin account
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Your name
              </span>
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Login email
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
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
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                autoComplete="new-password"
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
              {loading ? "Creating..." : "Create organization"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-accent hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
