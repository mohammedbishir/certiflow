"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken, meRequest, type MeResponse } from "@/lib/auth";

let cached: { token: string; me: Promise<MeResponse> } | null = null;

/** One /auth/me call per session token, shared across page navigations. */
function loadMe(token: string) {
  if (cached?.token !== token) {
    const me = meRequest(token);
    me.catch(() => {
      if (cached?.me === me) cached = null;
    });
    cached = { token, me };
  }
  return cached.me;
}

export function OrgStatusBanner() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let active = true;
    loadMe(token)
      .then((profile) => {
        if (active) setMe(profile);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!me) return null;
  const { status, isDemo } = me.organization;

  return (
    <>
      {isDemo ? (
        <Banner tone="info">
          <strong>You&apos;re exploring the live demo.</strong> Certificates are
          watermarked samples and can&apos;t be verified as real. Branding is
          locked and all data resets every 24 hours.
        </Banner>
      ) : status === "PENDING" ? (
        <Banner tone="warning">
          <strong>Your organization is awaiting approval.</strong> You can
          design templates and set up events now; activating events and issuing
          certificates unlock once it&apos;s approved.
        </Banner>
      ) : status === "REJECTED" ? (
        <Banner tone="danger">
          <strong>Your organization was not approved.</strong> It can&apos;t
          publish events or issue certificates. Contact the CertiFlow team if
          you think this is a mistake.
        </Banner>
      ) : null}
      {me.isPlatformAdmin ? (
        <div className="border-b border-border/80 bg-surface-muted/60">
          <div className="mx-auto flex max-w-5xl items-center justify-end px-4 py-1.5 sm:px-6">
            <Link
              href="/admin"
              className="text-xs font-semibold text-accent hover:underline"
            >
              Platform owner · Review organizations →
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

const TONES = {
  info: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

function Banner({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <div className={`border-b ${TONES[tone]}`}>
      <p className="mx-auto max-w-5xl px-4 py-2.5 text-sm leading-6 sm:px-6">
        {children}
      </p>
    </div>
  );
}
