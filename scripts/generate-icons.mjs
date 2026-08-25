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
import { writeFile } from 'node:fs/promises';

/**
 * Packs an array of PNG buffers into a Windows .ico file.
 *
 * Modern Windows (Vista+) supports PNG-compressed ICO entries, so we
 * can embed the PNG bytes directly without any BMP conversion.
 *
 * @param {Buffer[]} pngBuffers - PNG image data, one per size
 * @param {number[]} sizes     - pixel dimensions matching pngBuffers
 */
function toIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  let offset = headerSize + dirSize;

  const dirEntries = pngBuffers.map((buf, i) => {
    const entry = Buffer.alloc(dirEntrySize);
    const size = buf.length;
    // width/height byte can hold 1-255; 0 means 256
    const dim = sizes[i] >= 256 ? 0 : sizes[i];
    entry.writeUInt8(dim, 0); // width
    entry.writeUInt8(dim, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(size, 8); // image size
    entry.writeUInt32LE(offset, 12); // offset to image data
    offset += size;
    return entry;
  });

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(count, 4); // number of images

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

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

  const ico = await toIco(pngs, SIZES);
  await writeFile(OUTPUT, ico);
  console.log(`Generated ${OUTPUT} with ${SIZES.length} sizes (${SIZES.join(', ')} px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});