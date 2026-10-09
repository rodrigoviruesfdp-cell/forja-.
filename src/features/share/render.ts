/**
 * Draws the images to share, on the phone, with a canvas: nothing is uploaded (the photo
 * never leaves the device) and it works offline. Fonts are the system ones (SF Pro on
 * Apple devices, numbers in SF Pro Rounded), like the app.
 */
import { coverCrop, routineLayout, STICKER, STORY } from "@/domain/share";

export type Template = "photo" | "plain" | "sticker";

export interface SessionCard {
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  /** One line in a red pill (a record), or nothing. */
  highlight: string | null;
  /** Shown on the photo template before a photo is chosen. */
  photoHint: string;
}

export interface RoutineCard {
  title: string;
  subtitle: string;
  days: { badge: string; name: string; exercises: string[]; sport: boolean }[];
  /** "and {count} more" */
  more: (count: number) => string;
}

export type Photo = CanvasImageSource & { width: number; height: number };

const TEXT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif';
const ROUNDED = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif';
const YELLOW = "#ffd60a";
const RED = "#ff3b30";
const PAD = 84;
/** Instagram covers the top and bottom of a story with its own controls. */
const SAFE_TOP = 210;
const SAFE_BOTTOM = 280;

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.textBaseline = "alphabetic";
  return [element, ctx];
}

function font(ctx: CanvasRenderingContext2D, size: number, weight: number, family = TEXT) {
  ctx.font = `${weight} ${size}px ${family}`;
}

/** Shrinks the font until the text fits; cuts it with an ellipsis if even the smallest does not. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  minSize: number,
  weight: number,
  family = TEXT,
): { text: string; size: number } {
  for (let current = size; current >= minSize; current -= 2) {
    font(ctx, current, weight, family);
    if (ctx.measureText(text).width <= maxWidth) return { text, size: current };
  }
  font(ctx, minSize, weight, family);
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return { text: `${cut.trimEnd()}…`, size: minSize };
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  minSize: number,
  weight: number,
  family = TEXT,
): number {
  const fitted = fitText(ctx, text, maxWidth, size, minSize, weight, family);
  font(ctx, fitted.size, weight, family);
  ctx.fillText(fitted.text, x, y);
  return fitted.size;
}

/** The app's mark: the yellow plate and "Forja". */
function drawBrand(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.roundRect(x, y - size * 0.8, size * 0.8, size * 0.8, size * 0.24);
  ctx.fill();
  ctx.fillStyle = color;
  font(ctx, size, 700, ROUNDED);
  ctx.fillText("Forja", x + size * 1.05, y - size * 0.06);
  ctx.restore();
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const fitted = fitText(ctx, text, maxWidth - 56, 38, 28, 650);
  font(ctx, fitted.size, 650);
  const width = ctx.measureText(fitted.text).width + 56;
  const height = fitted.size + 34;
  ctx.save();
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.roundRect(x, y - height, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(fitted.text, x + 28, y - 17 - fitted.size * 0.12);
  ctx.restore();
  return height;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Stats side by side: small caps label over a big rounded number. Every number has the same
 * size, as big as fits, and each column is as wide as what it shows. Returns the block height.
 */
function drawStats(ctx: CanvasRenderingContext2D, stats: SessionCard["stats"], x: number, bottom: number, width: number, valueSize: number) {
  if (stats.length === 0) return 0;
  const labelSize = Math.round(valueSize * 0.34);
  const minGap = Math.round(valueSize * 0.5);
  const gaps = minGap * (stats.length - 1);
  const labels = stats.map((stat) => stat.label.toUpperCase());
  const columnWidths = (size: number) =>
    stats.map((stat, i) => {
      font(ctx, labelSize, 600);
      const label = ctx.measureText(labels[i] ?? "").width;
      font(ctx, size, 650, ROUNDED);
      return Math.max(label, ctx.measureText(stat.value).width);
    });

  let size = valueSize;
  let columns = columnWidths(size);
  while (sum(columns) + gaps > width && size > valueSize * 0.6) {
    size -= 2;
    columns = columnWidths(size);
  }
  // Still too wide (a very long label): equal columns, cut with an ellipsis.
  if (sum(columns) + gaps > width) columns = stats.map(() => (width - gaps) / stats.length);
  const gap = stats.length > 1 ? Math.min(valueSize, Math.max(minGap, (width - sum(columns)) / (stats.length - 1))) : 0;

  let left = x;
  stats.forEach((stat, i) => {
    const column = columns[i] ?? 0;
    ctx.globalAlpha = 0.72;
    font(ctx, labelSize, 600);
    ctx.fillText(labels[i] ?? "", left, bottom - size - 14, column);
    ctx.globalAlpha = 1;
    drawFitted(ctx, stat.value, left, bottom, column, size, Math.round(size * 0.6), 650, ROUNDED);
    left += column + gap;
  });
  return size + labelSize + 14;
}

/**
 * The text block of a session (title, subtitle, record, stats), drawn upwards from `bottom`.
 * Returns where it starts.
 */
function drawSessionText(ctx: CanvasRenderingContext2D, card: SessionCard, bottom: number, width: number, scale = 1) {
  let y = bottom;
  y -= drawStats(ctx, card.stats, PAD, y, width, Math.round(96 * scale)) + (card.stats.length ? 64 * scale : 0);
  if (card.highlight) {
    y -= drawPill(ctx, card.highlight, PAD, y, width) + 44 * scale;
  }
  ctx.globalAlpha = 0.82;
  drawFitted(ctx, card.subtitle, PAD, y, width, Math.round(40 * scale), 28, 500);
  ctx.globalAlpha = 1;
  y -= 40 * scale + 22 * scale;
  drawFitted(ctx, card.title, PAD, y, width, Math.round(112 * scale), 60, 800);
  return y - 112 * scale;
}

/** "#ffc300" → "rgba(255, 195, 0, alpha)". */
function rgba(hex: string, alpha: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

function darkBackground(ctx: CanvasRenderingContext2D, width: number, height: number, glowColor = YELLOW, at = { x: 0.85, y: 0.12 }) {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#1c1c1e");
  base.addColorStop(1, "#000");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * at.x, height * at.y, 0, width * at.x, height * at.y, width * 0.9);
  glow.addColorStop(0, rgba(glowColor, 0.28));
  glow.addColorStop(1, rgba(glowColor, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

/** The story's background: your photo (cover-cropped, darkened at the bottom) or the dark one. */
function storyBackground(
  ctx: CanvasRenderingContext2D,
  template: Template,
  photo: Photo | null,
  photoHint: string,
  glowColor?: string,
) {
  const { width, height } = STORY;
  if (template === "photo" && photo) {
    const crop = coverCrop(photo.width, photo.height, width, height);
    ctx.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
    const scrim = ctx.createLinearGradient(0, height * 0.42, 0, height);
    scrim.addColorStop(0, "rgba(0, 0, 0, 0)");
    scrim.addColorStop(1, "rgba(0, 0, 0, 0.8)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, width, height);
    const top = ctx.createLinearGradient(0, 0, 0, SAFE_TOP + 120);
    top.addColorStop(0, "rgba(0, 0, 0, 0.35)");
    top.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, SAFE_TOP + 120);
    return;
  }
  darkBackground(ctx, width, height, glowColor);
  if (template === "photo") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    font(ctx, 44, 600);
    ctx.textAlign = "center";
    ctx.fillText(photoHint, width / 2, height * 0.38);
    ctx.textAlign = "left";
  }
}

/** Shadow under white text on photos (sand, snow and sky are bright). */
function photoTextShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 16;
}

/** A session as a story (with your photo or on a dark background) or as a transparent sticker. */
export function renderSession(card: SessionCard, template: Template, photo: Photo | null): HTMLCanvasElement {
  if (template === "sticker") {
    const [element, ctx] = canvas(STICKER.width, STICKER.height);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
    drawSessionText(ctx, card, STICKER.height - 64, STICKER.width - PAD * 2, 0.92);
    drawBrand(ctx, PAD, 104, 44, "#fff");
    return element;
  }

  const { width, height } = STORY;
  const [element, ctx] = canvas(width, height);
  storyBackground(ctx, template, photo, card.photoHint);
  ctx.fillStyle = "#fff";
  if (template === "photo" && photo) photoTextShadow(ctx);
  drawSessionText(ctx, card, height - SAFE_BOTTOM, width - PAD * 2, template === "plain" ? 1.12 : 1);
  drawBrand(ctx, PAD, SAFE_TOP + 40, 52, "#fff");
  return element;
}

/**
 * Fills at most `maxLines` lines with the exercises, joined by " · "; the last line says how
 * many did not fit ("+3 more").
 */
function packExercises(ctx: CanvasRenderingContext2D, items: string[], maxWidth: number, maxLines: number, more: (count: number) => string) {
  const lines: string[][] = [];
  let next = 0;
  while (next < items.length && lines.length < maxLines) {
    const line = [items[next] ?? ""];
    next += 1;
    while (next < items.length && ctx.measureText([...line, items[next]].join(" · ")).width <= maxWidth) {
      line.push(items[next] ?? "");
      next += 1;
    }
    lines.push(line);
  }
  const text = lines.map((line) => line.join(" · "));
  const last = lines.at(-1);
  if (next < items.length && last) {
    let left = items.length - next;
    const withCount = () => `${last.join(" · ")} ${more(left)}`;
    while (last.length > 1 && ctx.measureText(withCount()).width > maxWidth) {
      last.pop();
      left += 1;
    }
    text[text.length - 1] = withCount();
  }
  return text;
}

/** A routine as a story: its days, and the exercises of each as far as they fit. */
export function renderRoutine(card: RoutineCard): HTMLCanvasElement {
  const { width, height } = STORY;
  const [element, ctx] = canvas(width, height);
  darkBackground(ctx, width, height);
  const textWidth = width - PAD * 2;
  ctx.fillStyle = "#fff";
  drawBrand(ctx, PAD, SAFE_TOP + 40, 52, "#fff");

  const badge = 72;
  const rowGap = 30;
  const nameBaseline = 52;
  const lineHeight = 46;
  const textX = PAD + badge + 28;
  const textMax = width - PAD - textX;
  const header = 112 + 60 + 80;
  const top = SAFE_TOP + 160;
  const bottom = height - SAFE_BOTTOM;

  const layout = routineLayout(
    card.days.map((day) => day.exercises.length),
    bottom - top - header,
    badge + rowGap,
    lineHeight,
  );
  font(ctx, 34, 500);
  const days = card.days.slice(0, layout.days).map((day) => ({
    ...day,
    lines: layout.lines > 0 ? packExercises(ctx, day.exercises, textMax, layout.lines, card.more) : [],
  }));
  const rowHeight = (lines: number) => Math.max(badge, nameBaseline + lines * lineHeight + 16);
  const hidden = card.days.length - days.length;
  const blockHeight = header + sum(days.map((day) => rowHeight(day.lines.length) + rowGap)) + (hidden > 0 ? lineHeight : 0);

  // Anchored to the bottom, like the session images.
  let y = Math.max(top, bottom - blockHeight) + 96;
  drawFitted(ctx, card.title, PAD, y, textWidth, 96, 56, 800);
  y += 60;
  ctx.globalAlpha = 0.75;
  drawFitted(ctx, card.subtitle, PAD, y, textWidth, 40, 28, 500);
  ctx.globalAlpha = 1;
  y += 80;

  for (const day of days) {
    ctx.fillStyle = day.sport ? "rgba(10, 132, 255, 0.9)" : "#fff";
    ctx.beginPath();
    ctx.roundRect(PAD, y, badge, badge, 20);
    ctx.fill();
    ctx.fillStyle = day.sport ? "#fff" : "#000";
    ctx.textAlign = "center";
    drawFitted(ctx, day.badge, PAD + badge / 2, y + badge / 2 + 16, badge - 14, 44, 24, 800, ROUNDED);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    drawFitted(ctx, day.name, textX, y + nameBaseline, textMax, 48, 32, 700);
    ctx.globalAlpha = 0.68;
    day.lines.forEach((line, i) => {
      drawFitted(ctx, line, textX, y + nameBaseline + (i + 1) * lineHeight, textMax, 34, 26, 500);
    });
    ctx.globalAlpha = 1;
    y += rowHeight(day.lines.length) + rowGap;
  }
  if (hidden > 0) {
    ctx.globalAlpha = 0.68;
    drawFitted(ctx, card.more(hidden), PAD, y + 34, textWidth, 34, 26, 500);
    ctx.globalAlpha = 1;
  }
  return element;
}

export interface AchievementCard {
  /** "Achievement unlocked!" */
  eyebrow: string;
  title: string;
  /** "Level 2 of 4 · 50 gym sessions" */
  subtitle: string;
  date: string;
  /** The level's colour, for the glow. */
  color: string;
  photoHint: string;
}

/** Centred lines of text, each shrunk to fit. */
function centered(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, minSize: number, weight: number, family = TEXT) {
  ctx.textAlign = "center";
  drawFitted(ctx, text, ctx.canvas.width / 2, y, ctx.canvas.width - PAD * 2, size, minSize, weight, family);
  ctx.textAlign = "left";
}

/**
 * An achievement: the medal big in the middle (on the dark background or as a sticker), or
 * over your photo with the text at the bottom like a session.
 */
export function renderAchievement(card: AchievementCard, template: Template, photo: Photo | null, badge: CanvasImageSource | null): HTMLCanvasElement {
  if (template === "sticker") {
    const [element, ctx] = canvas(STICKER.width, STICKER.width);
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    if (badge) ctx.drawImage(badge, (STICKER.width - 560) / 2, 40, 560, 560);
    ctx.fillStyle = "#fff";
    centered(ctx, card.title, 730, 96, 56, 800);
    ctx.globalAlpha = 0.85;
    centered(ctx, card.subtitle, 800, 42, 28, 600);
    centered(ctx, card.date, 860, 34, 26, 500);
    ctx.globalAlpha = 1;
    drawBrand(ctx, (STICKER.width - 52 * 3.4) / 2, 1000, 52, "#fff");
    return element;
  }

  const { width, height } = STORY;
  const [element, ctx] = canvas(width, height);
  storyBackground(ctx, template, photo, card.photoHint, card.color);

  if (template === "photo" && photo) {
    photoTextShadow(ctx);
    let y = height - SAFE_BOTTOM;
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.75;
    drawFitted(ctx, card.date, PAD, y, width - PAD * 2, 36, 26, 500);
    ctx.globalAlpha = 0.9;
    y -= 60;
    drawFitted(ctx, card.subtitle, PAD, y, width - PAD * 2, 44, 28, 600);
    ctx.globalAlpha = 1;
    y -= 76;
    drawFitted(ctx, card.title, PAD, y, width - PAD * 2, 108, 60, 800);
    y -= 124;
    ctx.fillStyle = YELLOW;
    drawFitted(ctx, card.eyebrow.toUpperCase(), PAD, y, width - PAD * 2, 36, 26, 700);
    if (badge) ctx.drawImage(badge, PAD - 8, y - 60 - 300, 300, 300);
    ctx.fillStyle = "#fff";
    drawBrand(ctx, PAD, SAFE_TOP + 40, 52, "#fff");
    return element;
  }

  // The medal's own glow behind it.
  const center = { x: width / 2, y: 690 };
  const halo = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 520);
  halo.addColorStop(0, rgba(card.color, 0.45));
  halo.addColorStop(1, rgba(card.color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  if (badge) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.drawImage(badge, center.x - 300, center.y - 300, 600, 600);
    ctx.restore();
  }
  ctx.fillStyle = YELLOW;
  centered(ctx, card.eyebrow.toUpperCase(), 1150, 38, 26, 700);
  ctx.fillStyle = "#fff";
  centered(ctx, card.title, 1270, 112, 60, 800);
  ctx.globalAlpha = 0.85;
  centered(ctx, card.subtitle, 1350, 44, 28, 600);
  ctx.globalAlpha = 0.6;
  centered(ctx, card.date, 1415, 36, 26, 500);
  ctx.globalAlpha = 1;
  drawBrand(ctx, PAD, SAFE_TOP + 40, 52, "#fff");
  return element;
}

/** An <svg> (the medal) as an image to draw on the canvas, at `size` pixels. */
export async function svgToImage(svg: SVGSVGElement, size: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  clone.removeAttribute("class");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface TransformationCard {
  before: { label: string; date: string };
  after: { label: string; date: string };
  /** "8 meses después" */
  headline: string;
  /** "−4,2 kg de peso corporal", or nothing. */
  detail: string | null;
}

/**
 * A transformation: the two photos side by side, full height, with "Before / After" and their
 * dates, how long passed and (if you want) the weight change, over a dark fade at the bottom.
 */
export function renderTransformation(card: TransformationCard, before: Photo, after: Photo): HTMLCanvasElement {
  const { width, height } = STORY;
  const [element, ctx] = canvas(width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  const half = (width - 4) / 2;
  [before, after].forEach((photo, i) => {
    const crop = coverCrop(photo.width, photo.height, half, height);
    ctx.drawImage(photo, crop.sx, crop.sy, crop.sw, crop.sh, i * (half + 4), 0, half, height);
  });

  const scrim = ctx.createLinearGradient(0, height * 0.5, 0, height);
  scrim.addColorStop(0, "rgba(0, 0, 0, 0)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0.85)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);
  const top = ctx.createLinearGradient(0, 0, 0, SAFE_TOP + 120);
  top.addColorStop(0, "rgba(0, 0, 0, 0.4)");
  top.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, width, SAFE_TOP + 120);

  photoTextShadow(ctx);
  ctx.textAlign = "center";
  [card.before, card.after].forEach((side, i) => {
    const x = i * (half + 4) + half / 2;
    ctx.fillStyle = YELLOW;
    font(ctx, 36, 700);
    ctx.fillText(side.label.toUpperCase(), x, height - SAFE_BOTTOM - 250);
    ctx.fillStyle = "#fff";
    drawFitted(ctx, side.date, x, height - SAFE_BOTTOM - 200, half - 40, 40, 28, 600);
  });
  ctx.fillStyle = "#fff";
  drawFitted(ctx, card.headline, width / 2, height - SAFE_BOTTOM - (card.detail ? 70 : 10), width - PAD * 2, 92, 52, 800);
  if (card.detail) {
    ctx.globalAlpha = 0.9;
    drawFitted(ctx, card.detail, width / 2, height - SAFE_BOTTOM - 4, width - PAD * 2, 44, 28, 600);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
  drawBrand(ctx, PAD, SAFE_TOP + 40, 52, "#fff");
  return element;
}

export function canvasBlob(element: HTMLCanvasElement, type: "image/jpeg" | "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    element.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image"))), type, 0.92);
  });
}

/**
 * Loads a photo picked by the user (the browser applies its EXIF rotation). Call `release`
 * when it is no longer shown.
 */
export async function loadPhoto(file: Blob): Promise<{ photo: Photo; release: () => void }> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return { photo: image, release: () => URL.revokeObjectURL(url) };
}
