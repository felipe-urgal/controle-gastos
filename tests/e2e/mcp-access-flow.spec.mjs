import { expect, test } from '@playwright/test';

import { setIsolatedClientIp } from './support/client-ip.mjs';
import {
  createVerifiedUser,
  expireMcpTokens,
  seedPrivacyFinancialFixture,
  setUserActive,
} from './support/verified-user.mjs';

const password = 'Playwright123!';

async function login(page, email) {
  await setIsolatedClientIp(page, email);
  await page.goto('/login');
  await page.getByLabel(/^E-mail\b/).fill(email);
  await page.getByLabel(/^Senha\b/).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function openMcpPanel(page) {
  await page.goto('/usuario');
  await page.getByRole('button', { name: 'Integrações', exact: true }).click();
  const panel = page.locator('section[aria-labelledby="mcp-access-title"]');
  await expect(panel).toBeVisible();
  return panel;
}

async function createTokenViaUi(panel, name) {
  await panel.getByLabel(/^Nome do token\b/).fill(name);
  await panel.getByLabel(/^Senha atual\b/).fill(password);
  await panel.getByRole('button', { name: 'Gerar token MCP' }).click();
  const code = panel.locator('code').filter({ hasText: /^cgmcp_/ });
  await expect(code).toBeVisible();
  return (await code.textContent()).trim();
}

let nextId = 1;
function mcpCall(request, token, method, params, headers = {}) {
  return request.post('/api/mcp', {
    headers: { authorization: `Bearer ${token}`, ...headers },
    data: { jsonrpc: '2.0', id: nextId++, method, params },
  });
}

function callTool(request, token, name, args = {}) {
  return mcpCall(request, token, 'tools/call', { name, arguments: args });
}

test('fluxo real: token → initialize → tools → ownership → revogação/expiração/inativo', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const suffix = `${Date.now()}-${test.info().project.name}`;
  const emailA = `mcp-a-${suffix}@example.test`;
  const emailB = `mcp-b-${suffix}@example.test`;

  await createVerifiedUser({ name: 'QA MCP A', email: emailA, password });
  await createVerifiedUser({ name: 'QA MCP B', email: emailB, password });
  const fixtureA = await seedPrivacyFinancialFixture({ email: emailA });
  const fixtureB = await seedPrivacyFinancialFixture({ email: emailB });

  await login(page, emailA);
  const panel = await openMcpPanel(page);
  await expect(panel.getByText(/Ocultar valores na interface não limita/)).toBeVisible();
  const tokenA = await createTokenViaUi(panel, 'E2E A');

  // Sem bearer → 401
  const anonymous = await request.post('/api/mcp', {
    data: { jsonrpc: '2.0', id: 1, method: 'ping' },
  });
  expect(anonymous.status()).toBe(401);

  // initialize + tools/list (somente leitura, sem mutation)
  const init = await mcpCall(request, tokenA, 'initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '1.0.0' },
  });
  expect(init.status()).toBe(200);
  expect((await init.json()).result.serverInfo.name).toBe('controle-gastos');

  const list = await mcpCall(request, tokenA, 'tools/list', {});
  const tools = (await list.json()).result.tools;
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'get_accounts',
    'get_forecast',
    'get_monthly_summary',
    'get_net_worth',
    'search_transactions',
  ]);
  for (const tool of tools) expect(tool.annotations.readOnlyHint).toBe(true);

  const mutation = await callTool(request, tokenA, 'create_transaction', {});
  expect((await mutation.json()).error.code).toBe(-32602);

  // get_accounts → somente dados do usuário A
  const accounts = await callTool(request, tokenA, 'get_accounts');
  const accountsBody = JSON.stringify((await accounts.json()).result.structuredContent);
  expect(accountsBody).toContain(fixtureA.accountId);
  expect(accountsBody).not.toContain(fixtureB.accountId);

  // resumo mensal do mês corrente
  const today = new Date();
  const summary = await callTool(request, tokenA, 'get_monthly_summary', {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  });
  expect((await summary.json()).result.isError).toBe(false);

  // userId do cliente é rejeitado (schema strict)
  const forged = await callTool(request, tokenA, 'get_accounts', {
    userId: fixtureB.userId,
  });
  expect((await forged.json()).error.code).toBe(-32602);

  // body > 64 KB sem Content-Length (chunked)
  const big = new TextEncoder().encode(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
      params: { pad: 'x'.repeat(70 * 1024) },
    }),
  );
  const oversized = await fetch(new URL('/api/mcp', baseURL), {
    method: 'POST',
    headers: { authorization: `Bearer ${tokenA}`, 'content-type': 'application/json' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(big.slice(0, 30_000));
        controller.enqueue(big.slice(30_000));
        controller.close();
      },
    }),
    duplex: 'half',
  });
  expect(oversized.status).toBe(413);

  // revogação pela UI → 401
  await panel.getByRole('button', { name: 'Revogar' }).first().click();
  await expect
    .poll(async () => (await mcpCall(request, tokenA, 'ping')).status())
    .toBe(401);

  // expiração
  const tokenExpiring = await createTokenViaUi(panel, 'E2E expira');
  expect((await mcpCall(request, tokenExpiring, 'ping')).status()).toBe(200);
  await expireMcpTokens({ email: emailA });
  expect((await mcpCall(request, tokenExpiring, 'ping')).status()).toBe(401);

  // usuário inativo
  const tokenInactive = await createTokenViaUi(panel, 'E2E inativo');
  expect((await mcpCall(request, tokenInactive, 'ping')).status()).toBe(200);
  await setUserActive({ email: emailA, isActive: false });
  expect((await mcpCall(request, tokenInactive, 'ping')).status()).toBe(401);
  await setUserActive({ email: emailA, isActive: true });

  // rate limit por token (120/min)
  let limited = 0;
  for (let i = 0; i < 125 && limited === 0; i += 1) {
    const response = await mcpCall(request, tokenInactive, 'ping');
    if (response.status() === 429) limited += 1;
  }
  expect(limited).toBe(1);
});

test('gestão de tokens MCP no Perfil não gera overflow horizontal no mobile', async ({
  page,
}) => {
  const email = `mcp-mobile-${Date.now()}-${test.info().project.name}@example.test`;
  await createVerifiedUser({ name: 'QA MCP Mobile', email, password });
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, email);

  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const panel = await openMcpPanel(page);
    if (width === 320) await createTokenViaUi(panel, 'Token mobile com nome razoavelmente longo');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
