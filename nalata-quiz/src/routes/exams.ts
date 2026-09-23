import { Router, Request, Response } from "express";
import { getAllExamRows, getExamRowById } from "../db";
import { gradeAttempt, toPublicExam } from "../grading";
import type { ExamListItem, ExamResult, ExamTemplate, SubmitAnswersBody } from "../types";

const router = Router();

// GET /api/exams - list all exams (no questions, just metadata)
router.get("/", (_req: Request, res: Response) => {
  const rows = getAllExamRows();
  const list: ExamListItem[] = rows.map((row) => {
    const template: ExamTemplate = JSON.parse(row.data);
    return {
      id: row.id,
      title: row.title,
      durationMinutes: row.duration_minutes,
      totalQuestions: template.questions.length,
    };
  });
  res.json(list);
});

// GET /api/exams/:id - sanitized exam (no answer key) for taking the test
router.get("/:id", (req: Request, res: Response) => {
  const row = getExamRowById(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const template: ExamTemplate = JSON.parse(row.data);
  const publicExam = toPublicExam(row.id, row.title, row.duration_minutes, template);
  res.json(publicExam);
});

// POST /api/exams/:id/submit - grade an attempt and return full breakdown
router.post("/:id/submit", (req: Request, res: Response) => {
  const row = getExamRowById(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const body = req.body as SubmitAnswersBody;
  if (!body || typeof body.answers !== "object" || body.answers === null) {
    res.status(400).json({ error: "Request body must include an 'answers' object" });
    return;
  }

  const template: ExamTemplate = JSON.parse(row.data);
  const graded = gradeAttempt(template, body);

  const result: ExamResult = {
    examId: row.id,
    examTitle: row.title,
    attemptId: `${row.id}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    timeTakenSeconds: typeof body.timeTakenSeconds === "number" ? body.timeTakenSeconds : null,
    totalQuestions: template.questions.length,
    correctCount: graded.correctCount,
    wrongCount: graded.wrongCount,
    unattemptedCount: graded.unattemptedCount,
    score: graded.score,
    scoreTotal: graded.scoreTotal,
    scorePercent: graded.scorePercent,
    breakdown: graded.breakdown,
  };

  res.json(result);
});

export default router;
