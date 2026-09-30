import { expect, test } from '@playwright/test';

test('instala shell offline sem persistir páginas ou APIs financeiras', async ({
  page,
  context,
}) => {
  await page.goto('/login');

  const cacheState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) {
      return { supported: false, controlled: false, urls: [] };
    }

    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, 5_000);
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }

    const urls = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      urls.push(...requests.map((request) => new URL(request.url).pathname));
    }

    return {
      supported: true,
      controlled: Boolean(navigator.serviceWorker.controller),
      urls,
    };
  });

  expect(cacheState.supported).toBe(true);
  expect(cacheState.controlled).toBe(true);
  expect(cacheState.urls).toContain('/offline.html');
  expect(cacheState.urls).toContain('/manifest.json');
  expect(cacheState.urls.some((url) => url.startsWith('/api/'))).toBe(false);
  expect(cacheState.urls).not.toContain('/login');
  expect(cacheState.urls).not.toContain('/dashboard');

  await context.setOffline(true);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', { name: 'Você está offline' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Por segurança, dados financeiros e respostas da API não são armazenados para uso offline.',
      { exact: false },
    ),
  ).toBeVisible();

  await context.setOffline(false);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login$/);
});
