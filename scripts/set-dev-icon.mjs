/**
 * Sets the app icon on the development electron.exe so Windows shows
 * the correct icon in the taskbar, Alt-Tab, and notifications during
 * `npm run electron:dev`.
 *
 * In dev mode the process is `node_modules/electron/dist/electron.exe`,
 * which has the default Electron icon.  Windows displays the icon of
 * the process executable in the taskbar — the BrowserWindow icon only
 * affects the window title bar.  We use rcedit to replace the icon
 * resource inside electron.exe.
 *
 * Run with:  node scripts/set-dev-icon.mjs
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const electronExe = join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const iconPath = join(root, 'public', 'icon.ico');

// rcedit ships inside electron-builder's winCodeSign cache.
const cacheBase = join(
  process.env.LOCALAPPDATA || '',
  'electron-builder',
  'Cache',
  'winCodeSign',
);

function findRcedit() {
  if (!existsSync(cacheBase)) return null;
  for (const dir of readdirSync(cacheBase)) {
    const candidate = join(cacheBase, dir, 'rcedit-x64.exe');
    if (existsSync(candidate)) return candidate;
    // Also check nested winCodeSign-<version> directories
    const nested = join(cacheBase, dir);
    if (existsSync(nested)) {
      for (const sub of readdirSync(nested)) {
        const subCandidate = join(nested, sub, 'rcedit-x64.exe');
        if (existsSync(subCandidate)) return subCandidate;
      }
    }
  }
  return null;
}

function main() {
  if (!existsSync(electronExe)) {
    console.log('⚠  electron.exe not found — skipping dev icon setup');
    return;
  }
  if (!existsSync(iconPath)) {
    console.log('⚠  public/icon.ico not found — skipping dev icon setup');
    return;
  }

  const rcedit = findRcedit();
  if (!rcedit) {
    console.log('⚠  rcedit not found in electron-builder cache — skipping dev icon setup');
    console.log('   Run `npm run electron:build` once to populate the cache.');
    return;
  }

  const result = spawnSync(rcedit, [electronExe, '--set-icon', iconPath], {
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    console.error('✖  rcedit failed:', result.stderr?.toString().trim() || result.stdout?.toString().trim());
    process.exit(1);
  }

  console.log('✓  Dev electron.exe icon set to public/icon.ico');
}

main();