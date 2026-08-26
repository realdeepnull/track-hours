// afterPack hook for electron-builder.
// Flips Electron Fuses on the built binary to harden the app against
// runtime tampering (e.g. ELECTRON_RUN_AS_NODE, --inspect, asar
// integrity bypass).  Fuses are embedded in the Electron binary and
// cannot be changed at runtime — they are flipped post-build only.
//
// See: https://github.com/electron/fuses
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';
import path from 'node:path';
import fs from 'node:fs';

/**
 * @param {object} params             electron-builder afterPack params
 * @param {string} params.appOutDir   Output dir containing the built app
 * @param {object} params.electronVersion
 * @param {string} params.packager
 * @returns {Promise<void>}
 */
export default async function afterPack({ appOutDir, electronVersion, packager }) {
  // electron-builder places the executable directly inside appOutDir.
  // On Windows: appOutDir/Track Hours.exe
  // On macOS:   appOutDir/Track Hours.app/Contents/MacOS/Track Hours
  // On Linux:   appOutDir/track-hours
  const exeName = packager.appInfo.productFilename;
  const platform = packager.platform.nodeName;
  let binaryPath;
  if (platform === 'darwin') {
    binaryPath = path.join(appOutDir, `${exeName}.app`, 'Contents', 'MacOS', exeName);
  } else if (platform === 'win32') {
    binaryPath = path.join(appOutDir, `${exeName}.exe`);
  } else {
    binaryPath = path.join(appOutDir, exeName);
  }

  if (!fs.existsSync(binaryPath)) {
    console.warn(`[fuses] Binary not found at ${binaryPath}, skipping fuse flip.`);
    return;
  }

  console.log(`[fuses] Flipping fuses on ${binaryPath} (Electron ${electronVersion})`);

  await flipFuses(binaryPath, {
    version: FuseVersion.V1,
    override: {
      // Disallow running the app as a plain Node.js process
      // (ELECTRON_RUN_AS_NODE).  Without this, an attacker can bypass the
      // renderer sandbox by launching the binary with that env var set.
      [FuseV1Options.RunAsNode]: false,
      // Disable --inspect / --inspect-brk so debuggers cannot attach to
      // the production binary and extract internal state.
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      // Prevent loading a custom V8 snapshot from an untrusted path.
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      // Validate the integrity of app.asar at launch so tampered app
      // bundles are rejected.  Requires electron-builder asar support
      // (enabled via `asar: true` in electron-builder.yml).
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      // Load the app only from app.asar — not from a loose app/ folder.
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    },
    // Reset the fuse wire format to a clean state before writing.
    resetAdditionalELnuFuses: true,
  });

  console.log('[fuses] All fuses flipped successfully.');
}