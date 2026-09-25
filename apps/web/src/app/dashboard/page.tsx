"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { InfoTip } from "@/components/tooltip";
import {
  clearTokens,
  getAccessToken,
  logoutRequest,
  meRequest,
} from "@/lib/auth";
import {
  getDashboardStats,
  type DashboardStats,
} from "@/lib/organizations";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    website?: string | null;
  };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([meRequest(token), getDashboardStats()])
      .then(([me, dashboard]) => {
        setProfile(me as Profile);
        setStats(dashboard);
      })
      .catch(() => {
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  async function onLogout() {
    const token = getAccessToken();
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Client logout still proceeds if API logout fails.
      }
    }
    clearTokens();
    router.replace("/login");
  }

  if (!profile || !stats) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  const { counts, recentEvents } = stats;

  const statCards = [
    {
      label: "Events",
      value: counts.eventsTotal,
      hint: `${counts.eventsActive} active`,
      href: "/events",
    },
    {
      label: "Participants",
      value: counts.participantsTotal,
      hint: "Across all events",
      href: "/events",
    },
    {
      label: "Certificates",
      value: counts.certificatesTotal,
      hint: `${counts.certificatesValid} valid · ${counts.certificatesRevoked} revoked`,
      href: "/events",
    },
    {
      label: "Templates",
      value: counts.templatesActive,
      hint: "Active templates",
      href: "/templates",
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      subtitle={`Signed in as ${profile.name} · ${profile.role}`}
      actions={
        <>
          <Link
            href="/templates"
            data-tooltip="Manage certificate templates"
            data-tooltip-pos="bottom"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Templates
          </Link>
          <Link
            href="/events"
            data-tooltip="View and manage events"
            data-tooltip-pos="bottom"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Events
          </Link>
          <Link
            href="/settings/organization"
            data-tooltip="Organization branding and profile"
            data-tooltip-pos="bottom"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Organization
          </Link>
          <button
            type="button"
            onClick={onLogout}
            data-tooltip="Sign out of CertiFlow"
            data-tooltip-pos="bottom"
            className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
          >
            Log out
          </button>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            data-tooltip={card.hint}
            className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] transition hover:border-accent/40"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </Link>
        ))}
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-accent">
                Recent events
                <InfoTip text="Your latest workshops and certificate issues" />
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Latest activity
              </h2>
            </div>
            <Link
              href="/events/new"
              data-tooltip="Create a new workshop or seminar"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              New event
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No events yet. Create your first workshop to start issuing
              certificates.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {recentEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    data-tooltip="Open event details"
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition hover:border-accent/40"
                  >
                    <div>
                      <p className="font-medium text-foreground">{event.name}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {formatDate(event.date)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p
                        className={
                          event.status === "ACTIVE"
                            ? "font-medium text-accent"
                            : "font-medium text-muted"
                        }
                      >
                        {event.status}
                      </p>
                      <p className="mt-1">
                        {event._count.participants} participants ·{" "}
                        {event._count.certificates} certs
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <p className="text-sm font-medium text-accent">
            Organization
            <InfoTip text="Issuer details used on certificates and registration pages" />
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {profile.organization.name}
          </h2>
          <div className="mt-5 space-y-2 text-sm">
            <p className="text-muted">Organization email</p>
            <p className="font-medium text-foreground">
              {profile.organization.email}
            </p>
            <p className="pt-2 text-muted">Your account</p>
            <p className="font-medium text-foreground">{profile.email}</p>
          </div>
          <Link
            href="/settings/organization"
            data-tooltip="Update logo, signature, and contact details"
            className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Edit organization
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
