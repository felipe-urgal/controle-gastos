import { expect, test } from '@playwright/test';

const password = 'Playwright123!';

const routeExpectations = [
  {
    route: '/dashboard',
    endpoints: ['/api/user', '/api/dashboard', '/api/forecast'],
  },
  {
    route: '/transacoes',
    endpoints: ['/api/user', '/api/accounts', '/api/categories', '/api/transactions'],
  },
  {
    route: '/calendario',
    endpoints: ['/api/user', '/api/accounts', '/api/transactions'],
  },
  {
    route: '/transacoes/importar',
    endpoints: ['/api/user', '/api/accounts', '/api/categories'],
  },
];

async function createAuthenticatedSession(context, projectName) {
  const unique = `${projectName}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `initial-fetches-${unique}@example.test`;

  const signup = await context.request.post('/api/auth/signup', {
    data: {
      name: 'Initial Fetches E2E',
      email,
      password,
    },
  });
  expect(signup.ok()).toBe(true);

  const login = await context.request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(login.ok()).toBe(true);
}

async function collectInitialApiRequests(context, route) {
  const page = await context.newPage();
  const counts = new Map();

  page.on('request', (request) => {
    if (request.method() !== 'GET') return;

    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return;

    counts.set(url.pathname, (counts.get(url.pathname) ?? 0) + 1);
  });

  await page.goto(route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  await page.close();

  return counts;
}

test('restauração de sessão não duplica leituras iniciais das rotas críticas', async ({ context }, testInfo) => {
  await createAuthenticatedSession(context, testInfo.project.name);

  for (const { route, endpoints } of routeExpectations) {
    const counts = await collectInitialApiRequests(context, route);

    for (const endpoint of endpoints) {
      expect(
        counts.get(endpoint) ?? 0,
        `${route} deve chamar ${endpoint} uma única vez no carregamento inicial`,
      ).toBe(1);
    }
  }
});
