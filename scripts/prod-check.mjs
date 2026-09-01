import { spawn } from 'node:child_process';

import { resolveCheckDatabaseUrl } from './lib/check-database.mjs';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpm, args, {
      cwd: process.cwd(),
      env,
      shell: false,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (signal) {
        reject(new Error(`Comando interrompido por ${signal}.`));
        return;
      }
      if ((code ?? 1) !== 0) {
        reject(new Error(`Comando falhou com exit code ${code ?? 1}.`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  const databaseUrl = resolveCheckDatabaseUrl();
  const checkEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    JWT_SECRET:
      process.env.JWT_SECRET ??
      'local-check-only-placeholder-secret-with-sufficient-length',
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? 're_local_check_placeholder',
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:5100',
  };

  delete checkEnv.CHECK_DATABASE_URL;

  const steps = [
    ['lint'],
    ['typecheck'],
    ['exec', 'prisma', 'migrate', 'deploy'],
    ['test'],
    ['build'],
    ['check:frontend-budget'],
  ];

  for (const args of steps) {
    await run(args, checkEnv);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Falha desconhecida.';
  console.error(`prod:check: ${message}`);
  process.exitCode = 1;
});
