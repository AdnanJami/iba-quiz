import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import type { ExamRow, ExamTemplate } from "./types";

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    duration_minutes INTEGER,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

/** Parse a duration string like "25 minutes" into an integer minute count. */
export function parseDurationMinutes(duration?: string | null): number | null {
  if (!duration) return null;
  const m = duration.match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

export function upsertExam(id: string, title: string, template: ExamTemplate): void {
  const durationMinutes = parseDurationMinutes(template.exam_summary?.duration);
  const stmt = db.prepare(`
    INSERT INTO exams (id, title, duration_minutes, data)
    VALUES (@id, @title, @duration_minutes, @data)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      duration_minutes = excluded.duration_minutes,
      data = excluded.data
  `);
  stmt.run({
    id,
    title,
    duration_minutes: durationMinutes,
    data: JSON.stringify(template),
  });
}

export function getAllExamRows(): ExamRow[] {
  return db
    .prepare(`SELECT id, title, duration_minutes, data, created_at FROM exams ORDER BY created_at DESC`)
    .all() as ExamRow[];
}

export function getExamRowById(id: string): ExamRow | undefined {
  return db
    .prepare(`SELECT id, title, duration_minutes, data, created_at FROM exams WHERE id = ?`)
    .get(id) as ExamRow | undefined;
}
