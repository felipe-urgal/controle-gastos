import { test } from '@playwright/test';
import { createVerifiedUser, seedBulkTransactions } from './support/verified-user.mjs';

/**
 * Baseline de performance mobile (CPU 4× mais lenta, rede 4G): bytes de JS carregados, LCP e
 * tarefas longas por rota. Só roda com `PERF_BASELINE=1`; imprime uma tabela.
 *
 *   PERF_BASELINE=1 pnpm test:e2e perf-baseline --project=chromium
 */
const ROUTES = ['/dashboard', '/transacoes', '/transacoes/nova', '/contas', '/categorias', '/investimentos', '/patrimonio', '/calendario'];

test('baseline de performance', async ({ page, context }) => {
  test.skip(!process.env.PERF_BASELINE, 'defina PERF_BASELINE=1');
  test.setTimeout(300_000);

  const email = `perf-${Date.now()}@example.test`;
  const user = await createVerifiedUser({ name: 'Perf', email, password: 'Playwright123!' });
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill('Playwright123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/dashboard/);
  // Massa de dados para as listas: 240 transações no mês corrente (direto no banco).
  await seedBulkTransactions({ userId: user.id, count: 240 });
  await page.setViewportSize({ width: 390, height: 780 });

  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.enable');
  // "Fast 4G" (aprox. das presets do Lighthouse): 9 Mbps, 150 ms.
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (9 * 1024 * 1024) / 8 });

  const rows = [];
  for (const route of ROUTES) {
    let jsBytes = 0;
    let jsFiles = 0;
    const names = [];
    const onResponse = async (response) => {
      const url = response.url();
      if (!/\/_next\/static\/.*\.js/.test(url)) return;
      const length = Number(response.headers()['content-length'] ?? 0) || (await response.body().catch(() => Buffer.alloc(0))).length;
      jsBytes += length;
      jsFiles += 1;
      names.push(`${url.split('/').pop()}:${Math.round(length / 1024)}`);
    };
    page.on('response', onResponse);
    await page.addInitScript(() => {
      window.__perf = { lcp: 0, longTasks: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__perf.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__perf.longTasks += Math.max(0, entry.duration - 50);
      }).observe({ type: 'longtask', buffered: true });
    });
    // Cache frio por rota: abre em aba nova sem cache do navegador.
    await client.send('Network.clearBrowserCache');
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const perf = await page.evaluate(() => window.__perf);
    page.off('response', onResponse);
    if (process.env.PERF_FILES) console.log(`[files] ${route} ${names.join(' ')}`);
    const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    rows.push({ route, 'nós DOM': domNodes, 'JS (KiB)': Math.round(jsBytes / 1024), arquivos: jsFiles, 'LCP (ms)': Math.round(perf.lcp), 'TBT~ (ms)': Math.round(perf.longTasks) });
  }
  console.table(rows);
  console.log('[perf]', JSON.stringify(rows));
});
