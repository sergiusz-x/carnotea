import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let currentDir = import.meta.dirname;

for (let depth = 0; depth < 5; depth += 1) {
  const envPath = resolve(currentDir, '.env');
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    break;
  }
  currentDir = resolve(currentDir, '..');
}
