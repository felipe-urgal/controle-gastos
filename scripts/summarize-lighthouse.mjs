import { readFile, writeFile } from "node:fs/promises";

const reports = [
  ["/", ".lighthouse/home.json"],
  ["/login", ".lighthouse/login.json"],
  ["/contas", ".lighthouse/contas.json"],
  ["/transacoes", ".lighthouse/transacoes.json"],
  ["/calendario", ".lighthouse/calendario.json"],
];

const score = (report, category) => {
  const value = report.categories?.[category]?.score;
  return value === null || value === undefined ? "n/a" : Math.round(value * 100);
};

const milliseconds = (report, audit) => {
  const value = report.audits?.[audit]?.numericValue;
  return value === null || value === undefined ? "n/a" : Math.round(value);
};

const decimal = (report, audit) => {
  const value = report.audits?.[audit]?.numericValue;
  return value === null || value === undefined ? "n/a" : Number(value).toFixed(3);
};

const rows = [];

for (const [route, path] of reports) {
  const report = JSON.parse(await readFile(path, "utf8"));

  if (report.runtimeError) {
    throw new Error(
      `${route}: Lighthouse runtime error ${report.runtimeError.code ?? "UNKNOWN"}`,
    );
  }

  const finalUrl = new URL(report.finalUrl ?? report.requestedUrl);
  if (finalUrl.pathname !== route) {
    throw new Error(`${route}: Lighthouse ended on unexpected path ${finalUrl.pathname}`);
  }

  if (report.categories?.performance?.score == null) {
    throw new Error(`${route}: missing performance score`);
  }

  rows.push({
    route,
    performance: score(report, "performance"),
    accessibility: score(report, "accessibility"),
    bestPractices: score(report, "best-practices"),
    lcp: milliseconds(report, "largest-contentful-paint"),
    cls: decimal(report, "cumulative-layout-shift"),
    tbt: milliseconds(report, "total-blocking-time"),
  });
}

const lines = [
  "## Lighthouse lab baseline (mobile)",
  "",
  "Build local de produção, PostgreSQL efêmero e sessão de teste isolada.",
  "",
  "| Rota | Performance | Accessibility | Best Practices | LCP (ms) | CLS | TBT (ms) |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...rows.map(
    (row) =>
      `| \`${row.route}\` | ${row.performance} | ${row.accessibility} | ${row.bestPractices} | ${row.lcp} | ${row.cls} | ${row.tbt} |`,
  ),
  "",
  "> Lighthouse é uma medição lab. TBT é usado como proxy de responsividade; INP real depende de dados de campo.",
  "",
];

const markdown = `${lines.join("\n")}\n`;
await writeFile(".lighthouse/baseline.md", markdown);
process.stdout.write(markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: "a" });
}
