"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/confirm-modal";
import { EditCertificateModal } from "@/components/edit-certificate-modal";
import { InfoTip } from "@/components/tooltip";
import type { CertificateItem } from "@/lib/certificates";
import {
  createEventGame,
  deleteEventGame,
  importGameResultsCsv,
  listEventGames,
  placementLabel,
  upsertGameResult,
  type EventGameItem,
  type GameResultItem,
  type Placement,
} from "@/lib/events";

type Props = {
  eventId: string;
  onCertificatesChanged?: () => void;
};

export function SportsGamesPanel({ eventId, onCertificatesChanged }: Props) {
  const { confirm, confirmDialog } = useConfirm();
  const [games, setGames] = useState<EventGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameName, setGameName] = useState("");
  const [gameCategory, setGameCategory] = useState("");
  const [savingGame, setSavingGame] = useState(false);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [resultForm, setResultForm] = useState({
    fullName: "",
    email: "",
    placement: "FIRST" as Placement,
    teamLabel: "",
  });
  const [savingResult, setSavingResult] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingCertificate, setEditingCertificate] =
    useState<CertificateItem | null>(null);

  async function loadGames() {
    const data = await listEventGames(eventId);
    setGames(data);
    if (!activeGameId && data[0]) setActiveGameId(data[0].id);
  }

  useEffect(() => {
    loadGames()
      .catch(() => toast.error("Failed to load games"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const activeGame = games.find((g) => g.id === activeGameId) ?? null;

  function openEditResult(row: GameResultItem) {
    if (!row.certificate || !activeGame) {
      setResultForm({
        fullName: row.participant.fullName,
        email: row.participant.email,
        placement: row.placement,
        teamLabel: row.teamLabel ?? "",
      });
      toast.info("Update the form and save to edit this result");
      return;
    }
    setEditingCertificate({
      id: row.certificate.id,
      certificateNumber: row.certificate.certificateNumber,
      status: (row.certificate.status as "VALID" | "REVOKED") || "VALID",
      issuedAt: new Date().toISOString(),
      participant: row.participant,
      gameResult: {
        id: row.id,
        placement: row.placement,
        teamLabel: row.teamLabel,
        game: {
          id: activeGame.id,
          name: activeGame.name,
          category: activeGame.category,
        },
      },
    });
  }

  async function onAddGame() {
    if (!gameName.trim()) {
      toast.error("Enter a game name");
      return;
    }
    setSavingGame(true);
    try {
      const result = await createEventGame(eventId, {
        name: gameName.trim(),
        category: gameCategory.trim() || undefined,
      });
      toast.success(result.message);
      setGameName("");
      setGameCategory("");
      await loadGames();
      setActiveGameId(result.game.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add game");
    } finally {
      setSavingGame(false);
    }
  }

  async function onDeleteGame(game: EventGameItem) {
    const ok = await confirm({
      title: "Delete this game?",
      message: `“${game.name}” and its 1st/2nd/3rd results will be removed.`,
      confirmLabel: "Yes, delete",
      cancelLabel: "No",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteEventGame(eventId, game.id);
      toast.success("Game deleted");
      if (activeGameId === game.id) setActiveGameId(null);
      await loadGames();
      onCertificatesChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onAddResult() {
    if (!activeGame) return;
    if (!resultForm.email.trim()) {
      toast.error("Email is required");
      return;
    }
    setSavingResult(true);
    try {
      const result = await upsertGameResult(eventId, activeGame.id, {
        email: resultForm.email.trim(),
        fullName: resultForm.fullName.trim() || undefined,
        placement: resultForm.placement,
        teamLabel: resultForm.teamLabel.trim() || undefined,
      });
      toast.success(result.message);
      setResultForm({
        fullName: "",
        email: "",
        placement: "FIRST",
        teamLabel: "",
      });
      await loadGames();
      onCertificatesChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save result");
    } finally {
      setSavingResult(false);
    }
  }

  async function onImportResults(file: File | null) {
    if (!file || !activeGame) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const result = await importGameResultsCsv(eventId, activeGame.id, csv);
      toast.success(
        `${result.summary.created} results imported · ${result.summary.failed} failed`,
      );
      await loadGames();
      onCertificatesChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <p className="text-sm text-muted">Loading games...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent">
            Sports games
            <InfoTip text="Add every competition (e.g. 100m Relay Men). Record 1st / 2nd / 3rd — each gets a certificate. Ties allowed. Use Edit to change an issued certificate." />
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Games & places
          </h2>
          <p className="mt-1 text-sm text-muted">
            One sports meet · many games · 1st / 2nd / 3rd certificates per game.
            Admins can edit issued certificates anytime.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr_auto]">
        <input
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Game name — e.g. 100m Relay Men"
          className="h-10 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none ring-accent focus:ring-2"
        />
        <input
          value={gameCategory}
          onChange={(e) => setGameCategory(e.target.value)}
          placeholder="Category (optional) — Track"
          className="h-10 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none ring-accent focus:ring-2"
        />
        <button
          type="button"
          disabled={savingGame}
          onClick={() => void onAddGame()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {savingGame ? "Adding..." : "Add game"}
        </button>
      </div>

      {games.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          No games yet. Add “100m Relay Men”, “Long Jump Girls”, etc.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="space-y-2">
            {games.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setActiveGameId(game.id)}
                className={`flex w-full items-start justify-between gap-2 rounded-xl border px-4 py-3 text-left transition ${
                  activeGameId === game.id
                    ? "border-accent bg-accent/10"
                    : "border-border bg-background hover:border-accent/40"
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">{game.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {game.category || "General"} · {game._count?.results ?? game.results.length}{" "}
                    results
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteGame(game);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      void onDeleteGame(game);
                    }
                  }}
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-danger hover:bg-danger-soft"
                >
                  Delete
                </span>
              </button>
            ))}
          </div>

          {activeGame ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    Results
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    {activeGame.name}
                  </h3>
                </div>
                <label className="inline-flex cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted">
                  {importing ? "Importing..." : "Import CSV"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    disabled={importing}
                    onChange={(e) => {
                      void onImportResults(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted">
                CSV columns:{" "}
                <code className="text-foreground">
                  fullName,email,placement,team
                </code>{" "}
                — placement = 1 / 2 / 3
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input
                  value={resultForm.fullName}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, fullName: e.target.value }))
                  }
                  placeholder="Athlete name"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none ring-accent focus:ring-2"
                />
                <input
                  value={resultForm.email}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="Email"
                  type="email"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none ring-accent focus:ring-2"
                />
                <select
                  value={resultForm.placement}
                  onChange={(e) =>
                    setResultForm((p) => ({
                      ...p,
                      placement: e.target.value as Placement,
                    }))
                  }
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none"
                >
                  <option value="FIRST">1st Place</option>
                  <option value="SECOND">2nd Place</option>
                  <option value="THIRD">3rd Place</option>
                </select>
                <input
                  value={resultForm.teamLabel}
                  onChange={(e) =>
                    setResultForm((p) => ({ ...p, teamLabel: e.target.value }))
                  }
                  placeholder="Team / house (optional)"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none ring-accent focus:ring-2"
                />
              </div>
              <button
                type="button"
                disabled={savingResult}
                onClick={() => void onAddResult()}
                className="mt-3 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60"
              >
                {savingResult ? "Saving..." : "Save place + issue certificate"}
              </button>

              {activeGame.results.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No places recorded yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Place</th>
                        <th className="px-3 py-2 font-medium">Athlete</th>
                        <th className="px-3 py-2 font-medium">Team</th>
                        <th className="px-3 py-2 font-medium">Certificate</th>
                        <th className="px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeGame.results.map((row) => (
                        <tr key={row.id} className="bg-surface">
                          <td className="px-3 py-2 font-medium text-accent">
                            {placementLabel(row.placement)}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-foreground">
                              {row.participant.fullName}
                            </p>
                            <p className="text-xs text-muted">
                              {row.participant.email}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {row.teamLabel || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-foreground">
                            {row.certificate?.certificateNumber || "Pending"}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => openEditResult(row)}
                              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
      <EditCertificateModal
        open={Boolean(editingCertificate)}
        certificate={editingCertificate}
        onClose={() => setEditingCertificate(null)}
        onSaved={() => {
          toast.success("Certificate updated");
          void loadGames();
          onCertificatesChanged?.();
        }}
      />
      {confirmDialog}
    </section>
  );
}
