export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val == null ? "" : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface DocumentData {
  title: string;
  agency?: string | null;
  modality?: string | null;
  estimated_value?: number | null;
  deadline_at?: string | null;
  description?: string | null;
  status: string;
  risk_score?: number | null;
}

interface AlertData {
  title: string;
  description?: string | null;
  severity: number;
  status: string;
}

export function exportToPDF(doc: DocumentData, alerts: AlertData[]) {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const severityLabel = (s: number) =>
    ["", "Muito Baixa", "Baixa", "Média", "Alta", "Crítica"][s] || String(s);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${doc.title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${doc.title}</h1>
<p class="meta">Status: ${doc.status} · Risco: ${doc.risk_score ?? "—"}</p>

<h2>Dados Extraídos</h2>
<table>
  <tr><th>Campo</th><th>Valor</th></tr>
  <tr><td>Órgão</td><td>${doc.agency || "—"}</td></tr>
  <tr><td>Modalidade</td><td>${doc.modality || "—"}</td></tr>
  <tr><td>Valor Estimado</td><td>${doc.estimated_value != null ? formatCurrency(doc.estimated_value) : "—"}</td></tr>
  <tr><td>Prazo</td><td>${doc.deadline_at ? new Date(doc.deadline_at).toLocaleDateString("pt-BR") : "—"}</td></tr>
  <tr><td>Descrição</td><td>${doc.description || "—"}</td></tr>
</table>

<h2>Alertas (${alerts.length})</h2>
${alerts.length ? `<table>
  <tr><th>Título</th><th>Descrição</th><th>Severidade</th><th>Status</th></tr>
  ${alerts.map(a => `<tr><td>${a.title}</td><td>${a.description || "—"}</td><td>${severityLabel(a.severity)}</td><td>${a.status}</td></tr>`).join("")}
</table>` : "<p>Nenhum alerta identificado.</p>"}
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
}
