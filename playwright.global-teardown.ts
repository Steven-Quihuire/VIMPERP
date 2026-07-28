import { execSync } from 'node:child_process';

export default function globalTeardown() {
  if (process.env.CI) {
    return;
  }

  try {
    execSync('docker compose down -v --remove-orphans', {
      stdio: 'ignore',
    });
  } catch {
    // Best-effort cleanup for local runs.
  }
}
