"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import {
  getAccessToken,
  meRequest,
  type OrganizationStatus,
} from "@/lib/auth";
import {
  listOrganizations,
  reviewOrganization,
  type PlatformOrganization,
} from "@/lib/platform";

const FILTERS: Array<{ value: OrganizationStatus | "ALL"; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_STYLES: Record<OrganizationStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-danger-soft text-danger",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function PlatformAdminPage() {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<OrganizationStatus | "ALL">("PENDING");
  const [organizations, setOrganizations] = useState<PlatformOrganization[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    meRequest(token)
      .then((me) => setAllowed(me.isPlatformAdmin))
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    listOrganizations(filter === "ALL" ? undefined : filter)
      .then((list) => {
        if (active) setOrganizations(list);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load organizations");
        if (active) setOrganizations([]);
      });
    return () => {
      active = false;
    };
  }, [allowed, filter, reloadKey]);

  async function onReview(org: PlatformOrganization, decision: "approve" | "reject") {
    const ok = await confirm(
      decision === "approve"
        ? {
            title: `Approve ${org.name}?`,
            message: "They will be able to activate events and issue certificates that verify as valid.",
            confirmLabel: "Approve",
            cancelLabel: "Cancel",
          }
        : {
            title: `Reject ${org.name}?`,
            message: "Their active events will be closed and they won't be able to issue certificates.",
            confirmLabel: "Reject",
            cancelLabel: "Cancel",
            tone: "danger",
          },
    );
    if (!ok) return;

    setBusyId(org.id);
    try {
      const result = await reviewOrganization(org.id, decision);
      toast.success(result.message);
      setReloadKey((key) => key + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setBusyId(null);
    }
  }

  if (allowed === null) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-4 sm:px-6">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const backLink = (
    <Link
      href="/dashboard"
      className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
    >
      Dashboard
    </Link>
  );

  if (!allowed) {
    return (
      <AppShell title="Platform owner" actions={backLink}>
        <div className="rounded-2xl border border-border bg-surface p-5 text-muted sm:p-8">
          This page is only available to the CertiFlow platform owner.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Review organizations"
      subtitle="Approve new schools and companies before they can issue certificates."
      actions={backLink}
    >
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (option.value === filter) return;
              setOrganizations(null);
              setFilter(option.value);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === option.value
                ? "bg-accent text-accent-foreground"
                : "border border-border bg-surface text-foreground hover:bg-surface-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {organizations === null ? (
          <p className="text-muted">Loading organizations...</p>
        ) : organizations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
            No {filter === "ALL" ? "" : filter.toLowerCase()} organizations.
          </div>
        ) : (
          organizations.map((org) => {
            const admin = org.users[0];
            return (
              <div
                key={org.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-lg font-semibold text-foreground">{org.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[org.status]}`}>
                      {org.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="break-all text-sm text-muted">
                    {org.email}
                    {org.phone ? ` · ${org.phone}` : ""}
                    {org.website ? ` · ${org.website}` : ""}
                  </p>
                  {admin ? (
                    <p className="break-all text-sm text-muted">
                      Admin: <span className="text-foreground">{admin.name}</span> ({admin.email})
                    </p>
                  ) : null}
                  <p className="text-xs text-muted">
                    Signed up {formatDate(org.createdAt)} · {org._count.templates} templates ·{" "}
                    {org._count.events} events
                    {org.reviewedAt ? ` · reviewed ${formatDate(org.reviewedAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {org.status !== "APPROVED" ? (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => onReview(org, "approve")}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60 md:flex-none"
                    >
                      Approve
                    </button>
                  ) : null}
                  {org.status !== "REJECTED" ? (
                    <button
                      type="button"
                      disabled={busyId === org.id}
                      onClick={() => onReview(org, "reject")}
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-danger/40 px-5 text-sm font-medium text-danger transition hover:bg-danger-soft disabled:opacity-60 md:flex-none"
                    >
                      Reject
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
      {confirmDialog}
    </AppShell>
  );
}
