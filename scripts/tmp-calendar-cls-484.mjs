import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const baseUrl = "http://127.0.0.1:5100";
const server = spawn("pnpm", ["exec", "next", "start", "-p", "5100"], {
  env: process.env,
  stdio: ["ignore", "inherit", "inherit"],
});

async function waitForHealth() {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("Application did not become healthy on port 5100");
}

try {
  await waitForHealth();

  const suffix = `${Date.now()}-${process.pid}`;
  const email = `calendar-cls-${suffix}@example.test`;
  const password = `Cls-${suffix}-Aa1!`;

  const signup = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Calendar CLS", email, password }),
  });
  if (!signup.ok) throw new Error(`Signup failed with ${signup.status}`);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Login failed with ${login.status}`);

  const setCookie = login.headers.get("set-cookie") ?? "";
  const token = setCookie.match(/(?:^|,\s*)token=([^;]+)/i)?.[1];
  if (!token) throw new Error("Login did not return the token cookie");

  await mkdir(".lighthouse", { recursive: true });
  const results = [];

  for (let run = 1; run <= 3; run += 1) {
    const output = `.lighthouse/calendario-484-${run}.json`;
    const result = spawnSync(
      process.execPath,
      ["scripts/run-lighthouse.mjs", `${baseUrl}/calendario`, output],
      {
        env: {
          ...process.env,
          LIGHTHOUSE_EXTRA_HEADERS: JSON.stringify({ Cookie: `token=${token}` }),
        },
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    const report = JSON.parse(await readFile(output, "utf8"));
    const cls = report.audits?.["cumulative-layout-shift"]?.numericValue;
    const performance = report.categories?.performance?.score;
    const shifts = report.audits?.["layout-shifts"]?.details?.items ?? [];
    results.push({ run, cls, performance, shifts });
  }

  for (const { run, cls, performance, shifts } of results) {
    console.log(`CALENDAR_CLS run=${run} performance=${Math.round((performance ?? 0) * 100)} cls=${cls}`);
    for (const [index, shift] of shifts.entries()) {
      console.log(`CALENDAR_SHIFT run=${run} index=${index + 1} score=${shift.score ?? shift.value ?? "n/a"}`);
      for (const node of shift.nodes ?? []) {
        console.log(`CALENDAR_SHIFT_NODE ${node.node?.selector ?? node.node?.snippet ?? node.selector ?? "unknown"}`);
      }
    }
  }

  if (results.some(({ cls }) => typeof cls !== "number" || cls > 0.1)) {
    console.error("Calendar CLS regression reproduced: expected every run to stay <= 0.10");
    process.exitCode = 1;
  }
} finally {
  server.kill("SIGTERM");
}
