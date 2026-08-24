/**
 * Generates a multi-size icon.ico from the 512x512 PNG source.
 *
 * Windows shows icons in the taskbar, Alt-Tab, jump lists, and
 * notifications.  The .ico must contain multiple sizes so Windows can
 * pick the right one for each context.
 *
 * Run with:  npm run icons
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import { writeFile } from 'node:fs/promises';

const SOURCE = 'public/icon-512x512.png';
const OUTPUT = 'public/icon.ico';

// Sizes that Windows requests for taskbar, Alt-Tab, jump lists, and notifications.
const SIZES = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const sourceBuf = await sharp(SOURCE).png().toBuffer();

  const pngs = await Promise.all(
    SIZES.map((size) =>
      sharp(sourceBuf)
        .resize(size, size, { fit: 'fill' })
        .png()
        .toBuffer(),
    ),
  );

  const ico = await toIco(pngs);
  await writeFile(OUTPUT, ico);
  console.log(`Generated ${OUTPUT} with ${SIZES.length} sizes (${SIZES.join(', ')} px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});