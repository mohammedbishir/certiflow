"use client";

import { useEffect, useState } from "react";
import {
  updateCertificate,
  type CertificateItem,
} from "@/lib/certificates";
import type { Placement } from "@/lib/events";

type Props = {
  certificate: CertificateItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (certificate: CertificateItem) => void;
};

export function EditCertificateModal({
  certificate,
  open,
  onClose,
  onSaved,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [placement, setPlacement] = useState<Placement>("FIRST");
  const [teamLabel, setTeamLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSports = Boolean(certificate?.gameResult);

  useEffect(() => {
    if (!certificate || !open) return;
    setFullName(certificate.participant.fullName);
    setEmail(certificate.participant.email);
    setPlacement(certificate.gameResult?.placement ?? "FIRST");
    setTeamLabel(certificate.gameResult?.teamLabel ?? "");
    setError(null);
  }, [certificate, open]);

  if (!open || !certificate) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!certificate) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateCertificate(certificate.id, {
        fullName: fullName.trim(),
        email: email.trim(),
        ...(isSports
          ? {
              placement,
              teamLabel: teamLabel.trim() || null,
            }
          : {}),
      });
      onSaved(result.certificate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-cert-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Edit issued certificate
        </p>
        <h2
          id="edit-cert-title"
          className="mt-2 text-xl font-semibold text-foreground"
        >
          {certificate.certificateNumber}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Changes rebuild the PDF. The certificate number stays the same.
          {isSports && certificate.gameResult
            ? ` · ${certificate.gameResult.game.name}`
            : ""}
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Full name
            </span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-foreground">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
            />
          </label>
          {isSports ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  Place
                </span>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value as Placement)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none"
                >
                  <option value="FIRST">1st Place</option>
                  <option value="SECOND">2nd Place</option>
                  <option value="THIRD">3rd Place</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  Team / house
                </span>
                <input
                  value={teamLabel}
                  onChange={(e) => setTeamLabel(e.target.value)}
                  placeholder="Optional"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
                />
              </label>
            </>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & rebuild PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
