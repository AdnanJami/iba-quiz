import type {
  ExamTemplate,
  PublicExam,
  ResultQuestionBreakdown,
  SubmitAnswersBody,
} from "./types";

/**
 * Strip the answer key (correct_answer, is_correct, explanation) from a
 * template before sending it to the client to take the quiz.
 */
export function toPublicExam(id: string, title: string, durationMinutes: number | null, template: ExamTemplate): PublicExam {
  return {
    id,
    title,
    durationMinutes,
    totalQuestions: template.questions.length,
    questions: template.questions.map((q) => ({
      question_id: q.question_id,
      question_number: q.question_number,
      category: q.category,
      comprehension: q.comprehension,
      question_text: q.question_text,
      options: q.options.map((o) => ({ label: o.label, text: o.text })),
    })),
  };
}

export interface GradedAttempt {
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  score: number;
  scoreTotal: number;
  scorePercent: number;
  breakdown: ResultQuestionBreakdown[];
}

/**
 * Grade a submitted attempt against the stored template.
 * Scoring is intentionally simple: +1 per correct answer, 0 for wrong or
 * unattempted, no negative marking. That keeps the app generic for any
 * template produced by html_to_json.py --template.
 */
export function gradeAttempt(template: ExamTemplate, body: SubmitAnswersBody): GradedAttempt {
  const answers = body.answers || {};
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  const breakdown: ResultQuestionBreakdown[] = template.questions.map((q) => {
    const qid = q.question_id ?? String(q.question_number);
    const selected = answers[qid] ?? null;
    const isUnattempted = selected === null || selected === undefined || selected === "";
    const isCorrect = !isUnattempted && selected === q.correct_answer;

    if (isUnattempted) unattemptedCount += 1;
    else if (isCorrect) correctCount += 1;
    else wrongCount += 1;

    return {
      question_id: q.question_id,
      question_number: q.question_number,
      category: q.category,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      selected_answer: isUnattempted ? null : selected,
      is_correct: isCorrect,
      is_unattempted: isUnattempted,
      explanation: q.explanation,
    };
  });

  const scoreTotal = template.questions.length;
  const score = correctCount;
  const scorePercent = scoreTotal > 0 ? Math.round((score / scoreTotal) * 1000) / 10 : 0;

  return { correctCount, wrongCount, unattemptedCount, score, scoreTotal, scorePercent, breakdown };
}
