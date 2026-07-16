// Renders the PWA icons (burgundy queen) to public/icons. Run:
//   node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#722F37"/>
  <text x="256" y="352" font-size="320" text-anchor="middle"
        font-family="Georgia, serif" fill="#FAF7F2">♛</text>
</svg>`;

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}
