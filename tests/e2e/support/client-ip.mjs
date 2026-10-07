export async function setIsolatedClientIp(page, seed) {
  let hash = 2166136261;

  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const second = ((hash >>> 16) % 200) + 20;
  const third = ((hash >>> 8) % 250) + 1;
  const fourth = (hash % 250) + 1;

  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `10.${second}.${third}.${fourth}`,
  });
}
