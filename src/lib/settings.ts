export interface AccentOption {
  name: string;
  value: string;
}

export const DEFAULT_ACCENT = "#7b8cff";

export const ACCENTS: AccentOption[] = [
  { name: "Iris", value: "#7b8cff" },
  { name: "Cyan", value: "#5ec8d8" },
  { name: "Mint", value: "#74c991" },
  { name: "Amber", value: "#d1b06b" },
  { name: "Coral", value: "#e06c75" },
  { name: "Violet", value: "#b39ddb" },
  { name: "Ice", value: "#a9c4e8" },
  { name: "Rose", value: "#e8a4c8" },
];

const KEY = "gitweft.settings";

export function normalizeAccent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null;
}

export function loadAccent(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ACCENT;
    const parsed = JSON.parse(raw);
    return normalizeAccent(parsed?.accent) ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export function saveAccent(accent: string): string {
  const value = normalizeAccent(accent) ?? DEFAULT_ACCENT;
  try {
    localStorage.setItem(KEY, JSON.stringify({ accent: value }));
  } catch {
    // ignore storage errors
  }
  return value;
}

function lighten(hex: string, amount = 0.16): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((n & 255) + 255 * amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function applyAccent(accent: string) {
  if (typeof document === "undefined") return;
  const value = normalizeAccent(accent) ?? DEFAULT_ACCENT;
  const root = document.documentElement;
  root.style.setProperty("--primary-color", value);
  root.style.setProperty("--accent-hover", lighten(value));
}
