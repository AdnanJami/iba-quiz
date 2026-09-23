import { get, put, BlobNotFoundError } from "@vercel/blob";
import type { ExamRow, ExamTemplate } from "./types";

// SQLite doesn't work on Vercel: its serverless functions have a read-only
// filesystem at runtime, and better-sqlite3 is a native module that has to
// match the exact serverless runtime it's deployed to. This module stores
// the whole "exams" table as a single JSON blob in Vercel Blob storage
// instead, keeping the same upsert/get/list interface the rest of the app
// already relies on (see routes/exams.ts, routes/import.ts, seed.ts).
//
// This store is PRIVATE, so both writes and reads require the token: the
// @vercel/blob SDK picks up BLOB_READ_WRITE_TOKEN from process.env
// automatically -- no explicit config needed, but the env var must be set
// (via .env locally, or the project's linked Blob store on Vercel).

const INDEX_PATHNAME = "nalata-db/exams.json";
const CACHE_TTL_MS = 5000; // avoid refetching the blob multiple times per request burst

interface ExamsIndex {
  exams: ExamRow[];
}

let cache: ExamsIndex | null = null;
let cacheLoadedAt = 0;

/** Drain a web ReadableStream (or Node Readable, just in case) to a UTF-8 string. */
async function streamToText(stream: any): Promise<string> {
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function loadIndex(forceRefresh = false): Promise<ExamsIndex> {
  if (!forceRefresh && cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return cache;
  }

  let index: ExamsIndex;

  try {
    const blob = await get(INDEX_PATHNAME, { access: "private" });

    // Blob does not exist yet — this is the first seed.
    if (!blob) {
      index = { exams: [] };
    } else {
      const text = await streamToText(blob.stream);
      index = JSON.parse(text) as ExamsIndex;
    }
  } catch (err) {
    const isNotFound =
      err instanceof BlobNotFoundError ||
      (err as { name?: string })?.name === "BlobNotFoundError";

    if (!isNotFound) {
      throw err;
    }

    index = { exams: [] };
  }

  cache = index;
  cacheLoadedAt = Date.now();

  return index;
}
async function saveIndex(index: ExamsIndex): Promise<void> {
  await put(INDEX_PATHNAME, JSON.stringify(index), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  cache = index;
  cacheLoadedAt = Date.now();
}

/** Parse a duration string like "25 minutes" into an integer minute count. */
export function parseDurationMinutes(duration?: string | null): number | null {
  if (!duration) return null;
  const m = duration.match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

export async function upsertExam(id: string, title: string, template: ExamTemplate): Promise<void> {
  const durationMinutes = parseDurationMinutes(template.exam_summary?.duration);
  const index = await loadIndex(true); // always read fresh right before a write

  const existing = index.exams.find((e) => e.id === id);

  const row: ExamRow = {
    id,
    title,
    duration_minutes: durationMinutes,
    data: JSON.stringify(template),
    created_at: existing ? existing.created_at : new Date().toISOString(),
  };

  const nextExams = existing
    ? index.exams.map((e) => (e.id === id ? row : e))
    : [row, ...index.exams];

  await saveIndex({ exams: nextExams });
}

export async function getAllExamRows(): Promise<ExamRow[]> {
  const index = await loadIndex();
  return [...index.exams].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getExamRowById(id: string): Promise<ExamRow | undefined> {
  const index = await loadIndex();
  return index.exams.find((e) => e.id === id);
}