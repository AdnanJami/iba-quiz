import { Router, Request, Response } from "express";
import { parseExamHtml, templatize } from "../htmlToJson";
import { upsertExam } from "../db";
import type { ExamTemplate } from "../types";

const router = Router();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ImportBody {
  html?: string;
  filename?: string;
  id?: string;
  title?: string;
  /** Defaults to true: strip scores/selected-answers, keep the answer key. */
  asTemplate?: boolean;
}

// POST /api/exams/import - convert an HTML export to JSON and save it
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as ImportBody;

  if (!body || typeof body.html !== "string" || !body.html.trim()) {
    res.status(400).json({ error: "Request body must include a non-empty 'html' string" });
    return;
  }

  let template: ExamTemplate;
  try {
    template = parseExamHtml(body.html);
  } catch (err) {
    res.status(400).json({ error: `Failed to parse HTML: ${(err as Error).message}` });
    return;
  }

  if (!Array.isArray(template.questions) || template.questions.length === 0) {
    res.status(422).json({
      error:
        "No questions could be parsed from that HTML. Check the markup matches the expected 'Exam Details' export format.",
    });
    return;
  }

  if (body.asTemplate !== false) {
    template = templatize(template);
  }

  const title = body.title || template.exam_summary?.exam_title || body.filename || "Untitled exam";
  const baseId = body.id || body.filename || title;
  const id = slugify(baseId) || `exam-${Date.now()}`;

  try {
    await upsertExam(id, title, template);
  } catch (err) {
    res.status(500).json({ error: `Failed to save exam: ${(err as Error).message}` });
    return;
  }

  res.json({
    id,
    title,
    totalQuestions: template.questions.length,
  });
});

export default router;