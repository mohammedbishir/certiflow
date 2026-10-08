"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { demoLoginRequest, saveTokens } from "@/lib/auth";

export function TryDemoButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const session = await demoLoginRequest();
      saveTokens(session.accessToken, session.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "The live demo is not available",
      );
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={className}
    >
      {loading ? "Preparing the demo…" : children}
    </button>
  );
}
