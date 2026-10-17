export function relativeTime(unixSeconds: number): string {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

export interface DiffLine {
  type: "meta" | "hunk" | "add" | "del" | "context" | "none";
  content: string;
  oldNo: number | null;
  newNo: number | null;
}

export interface DiffFile {
  header: string;
  lines: DiffLine[];
}

function parseHunkHeader(
  line: string,
): { oldStart: number; newStart: number } | null {
  const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if (!m) return null;
  return { oldStart: Number(m[1]), newStart: Number(m[2]) };
}

export function parsePatch(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  if (!patch.trim()) return files;

  let current: DiffFile | null = null;
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;

  for (const raw of patch.split("\n")) {
    if (raw.startsWith("diff --git") || raw.startsWith("diff --cc")) {
      const m = /^diff --(?:git|cc) .*? b\/(.*)$/.exec(raw);
      current = { header: m ? m[1] : raw.replace(/^diff --(git|cc) /, ""), lines: [] };
      files.push(current);
      inHunk = false;
      continue;
    }
    if (!current) {
      const m = /^\+\+\+ b\/(.*)$/.exec(raw);
      current = { header: m ? m[1] : "", lines: [] };
      files.push(current);
    }

    if (raw.startsWith("@@")) {
      const h = parseHunkHeader(raw);
      if (h) {
        oldNo = h.oldStart;
        newNo = h.newStart;
      }
      current.lines.push({ type: "hunk", content: raw, oldNo: null, newNo: null });
      inHunk = true;
      continue;
    }

    // File-level metadata only appears before the first hunk of a file.
    if (!inHunk) {
      if (
        raw.startsWith("+++") ||
        raw.startsWith("---") ||
        raw.startsWith("index ")
      ) {
        continue;
      }
      if (
        raw.startsWith("new file") ||
        raw.startsWith("deleted file") ||
        raw.startsWith("old mode") ||
        raw.startsWith("new mode") ||
        raw.startsWith("similarity index") ||
        raw.startsWith("rename ") ||
        raw.startsWith("copy ")
      ) {
        current.lines.push({ type: "meta", content: raw, oldNo: null, newNo: null });
        continue;
      }
    }

    if (raw.startsWith("+")) {
      current.lines.push({ type: "add", content: raw.slice(1), oldNo: null, newNo: newNo++ });
      continue;
    }
    if (raw.startsWith("-")) {
      current.lines.push({ type: "del", content: raw.slice(1), oldNo: oldNo++, newNo: null });
      continue;
    }
    if (raw.startsWith(" ") || raw === "") {
      current.lines.push({
        type: raw === "" ? "none" : "context",
        content: raw.slice(1),
        oldNo: raw === "" ? null : oldNo++,
        newNo: raw === "" ? null : newNo++,
      });
      continue;
    }
    current.lines.push({ type: "meta", content: raw, oldNo: null, newNo: null });
  }

  return files;
}
