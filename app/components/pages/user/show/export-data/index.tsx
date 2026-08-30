"use client";

import { useState } from "react";
import { FaDownload } from "react-icons/fa";

type ExportFormat = "csv" | "json";

function getDownloadFilename(response: Response, format: ExportFormat) {
  const header = response.headers.get("content-disposition") ?? "";
  const candidate = header.match(/filename="?([^";]+)"?/i)?.[1];

  if (
    candidate &&
    /^controle-gastos-\d{4}-\d{2}-\d{2}\.(csv|json)$/.test(candidate)
  ) {
    return candidate;
  }

  return `controle-gastos-${new Date().toISOString().slice(0, 10)}.${format}`;
}

export default function ExportData() {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleExport() {
    if (isExporting) return;

    setIsExporting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/user/export?format=${format}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "Não foi possível exportar os dados.";

        try {
          const body = await response.json();
          message = body?.error?.message ?? message;
        } catch {
          // Keep the generic message when the server does not return JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getDownloadFilename(response, format);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);

      setFeedback({
        type: "success",
        message: `Exportação ${format.toUpperCase()} pronta.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível exportar os dados.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section
      aria-labelledby="export-data-title"
      className="mt-6 rounded-xl border border-slate-200/20 bg-slate-900/20 p-4"
    >
      <div className="mb-4">
        <h2 id="export-data-title" className="text-lg font-semibold">
          Exportar dados
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Baixe um snapshot das suas contas, categorias e transações.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Formato
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
            disabled={isExporting}
            className="min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-wait disabled:opacity-60"
          >
            <option value="json">JSON — snapshot completo</option>
            <option value="csv">CSV — transações</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60"
        >
          <FaDownload aria-hidden="true" />
          {isExporting ? "Exportando..." : "Baixar exportação"}
        </button>
      </div>

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={`mt-3 text-sm ${
            feedback.type === "error" ? "text-red-300" : "text-emerald-300"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </section>
  );
}
