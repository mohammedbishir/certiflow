"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type TemplateCanvasEditorProps = {
  pdfUrl: string | null;
  sampleName: string;
  nameXPercent: number;
  nameYPercent: number;
  nameFontSize: number;
  nameColor: string;
  onChange: (next: {
    nameXPercent: number;
    nameYPercent: number;
  }) => void;
  onFontSizeChange: (size: number) => void;
  onColorChange: (color: string) => void;
  onSampleNameChange: (name: string) => void;
};

export function TemplateCanvasEditor({
  pdfUrl,
  sampleName,
  nameXPercent,
  nameYPercent,
  nameFontSize,
  nameColor,
  onChange,
  onFontSizeChange,
  onColorChange,
  onSampleNameChange,
}: TemplateCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderScale, setRenderScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const renderPdf = useCallback(async () => {
    if (!pdfUrl || !canvasRef.current) return;

    setLoadingPdf(true);
    setError(null);

    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const loadingTask = pdfjs.getDocument({
        url: pdfUrl,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const baseViewport = page.getViewport({ scale: 1 });
      const stageWidth = stageRef.current?.clientWidth || 900;
      const scale = Math.min(stageWidth / baseViewport.width, 1.35);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas not available");

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setRenderScale(scale);

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not render PDF. Try re-uploading.",
      );
    } finally {
      setLoadingPdf(false);
    }
  }, [pdfUrl]);

  useEffect(() => {
    void renderPdf();
  }, [renderPdf]);

  useEffect(() => {
    function onResize() {
      void renderPdf();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderPdf]);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const centerX = (rect.width * nameXPercent) / 100;
    const topY = (rect.height * nameYPercent) / 100;
    dragOffset.current = {
      x: event.clientX - rect.left - centerX,
      y: event.clientY - rect.top - topY,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - dragOffset.current.x;
    const y = event.clientY - rect.top - dragOffset.current.y;
    const nextX = Math.min(100, Math.max(0, (x / rect.width) * 100));
    const nextY = Math.min(100, Math.max(0, (y / rect.height) * 100));
    onChange({ nameXPercent: Number(nextX.toFixed(2)), nameYPercent: Number(nextY.toFixed(2)) });
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  const displayFontSize = Math.max(10, nameFontSize * renderScale);

  if (!pdfUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
        <p className="text-base font-medium text-foreground">
          Upload a designer PDF to open the visual editor
        </p>
        <p className="mt-2 text-sm text-muted">
          Drag the name onto the exact spot on your certificate.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[180px] flex-1">
          <span className="mb-1.5 block text-xs font-medium text-foreground">
            Sample name
          </span>
          <input
            value={sampleName}
            onChange={(e) => onSampleNameChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="w-28">
          <span className="mb-1.5 block text-xs font-medium text-foreground">
            Font size
          </span>
          <input
            type="number"
            min={8}
            max={120}
            value={nameFontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="w-28">
          <span className="mb-1.5 block text-xs font-medium text-foreground">
            Color
          </span>
          <input
            type="color"
            value={nameColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background px-1 py-1"
          />
        </label>
      </div>

      <div className="overflow-auto rounded-2xl border border-border bg-[#e8edf2] p-3">
        {loadingPdf ? (
          <p className="py-20 text-center text-sm text-muted">
            Rendering certificate PDF...
          </p>
        ) : error ? (
          <p className="py-20 text-center text-sm text-red-600">{error}</p>
        ) : (
          <div
            ref={stageRef}
            className="relative mx-auto w-fit touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas ref={canvasRef} className="block max-w-full rounded-lg shadow-md" />
            <div
              role="button"
              tabIndex={0}
              onPointerDown={onPointerDown}
              className={`absolute -translate-x-1/2 cursor-grab rounded border-2 border-dashed px-2 py-1 text-center font-semibold leading-none ${
                dragging ? "cursor-grabbing border-accent bg-white/70" : "border-accent/70 bg-white/40"
              }`}
              style={{
                left: `${nameXPercent}%`,
                top: `${nameYPercent}%`,
                color: nameColor,
                fontSize: `${displayFontSize}px`,
                whiteSpace: "nowrap",
              }}
            >
              {sampleName || "Recipient Name"}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        Drag the name box onto the correct place. Position: X {nameXPercent}% · Y{" "}
        {nameYPercent}%
      </p>
    </div>
  );
}
