// Generates the PWA icons from one SVG. Run: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#15171a";
const ACCENT = "#f5c518";

/** A geometric "F" built from bars (no font needed), centered in a 512 grid. */
function mark(scale = 1) {
  const s = (n) => 256 + (n - 256) * scale;
  return `
    <rect x="${s(176)}" y="${s(128)}" width="${72 * scale}" height="${256 * scale}" rx="${10 * scale}" fill="${ACCENT}"/>
    <rect x="${s(176)}" y="${s(128)}" width="${168 * scale}" height="${64 * scale}" rx="${10 * scale}" fill="${ACCENT}"/>
    <rect x="${s(176)}" y="${s(232)}" width="${136 * scale}" height="${60 * scale}" rx="${10 * scale}" fill="${ACCENT}"/>`;
}

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${BG}"/>${mark()}
</svg>`;

// Full-bleed square for "maskable" (Android crops it) and Apple (iOS rounds it itself).
const square = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>${mark(scale)}
</svg>`;

await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/icon.svg", rounded);

const outputs = [
  ["public/icons/icon-192.png", rounded, 192],
  ["public/icons/icon-512.png", rounded, 512],
  ["public/icons/icon-maskable-512.png", square(0.8), 512],
  ["public/icons/apple-touch-icon.png", square(0.9), 180],
];

for (const [file, svg, size] of outputs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
