// Shared types, mirroring the JSON schema produced by html_to_json.py --template

export interface ExamOption {
  label: string | null;
  text: string | null;
  is_correct: boolean;
  is_selected: boolean;
  selected_and_wrong: boolean;
}

export interface ExamQuestion {
  question_number: number | null;
  question_id: string | null;
  answer_id?: string | null;
  category: string | null;
  status: string | null;
  marks_awarded: number | string | null;
  comprehension: string | null;
  question_text: string | null;
  options: ExamOption[];
  correct_answer: string | null;
  selected_answer: string | null;
  explanation: string | null;
}

export interface ExamSummary {
  exam_title?: string;
  date?: string;
  duration?: string;
  total_marks?: string;
  total_questions?: string;
  score_text?: string | null;
  score_obtained?: number | null;
  score_total?: number | null;
}

export interface CategoryPerformance {
  category: string;
  score: string | null;
  pass_marks: string;
  total_marks: string;
  status: string | null;
}

export interface ExamTemplate {
  exam_summary: ExamSummary;
  submission_overview: Record<string, unknown>;
  category_performance: CategoryPerformance[];
  questions: ExamQuestion[];
  stats: {
    num_questions_parsed: number;
    num_correct: number | null;
    num_wrong: number | null;
  };
}

// A row as stored in SQLite
export interface ExamRow {
  id: string;
  title: string;
  duration_minutes: number | null;
  data: string; // JSON-serialized ExamTemplate
  created_at: string;
}

// Sanitized exam sent to the client BEFORE an attempt is submitted.
// Correct answers and explanations are stripped so they can't be read
// from the network tab while taking the quiz.
export interface PublicOption {
  label: string | null;
  text: string | null;
}

export interface PublicQuestion {
  question_id: string | null;
  question_number: number | null;
  category: string | null;
  comprehension: string | null;
  question_text: string | null;
  options: PublicOption[];
}

export interface PublicExam {
  id: string;
  title: string;
  durationMinutes: number | null;
  totalQuestions: number;
  questions: PublicQuestion[];
}

export interface ExamListItem {
  id: string;
  title: string;
  durationMinutes: number | null;
  totalQuestions: number;
}

// What the client posts when submitting an attempt
export interface SubmitAnswersBody {
  answers: Record<string, string | null>; // question_id -> selected label
  timeTakenSeconds?: number;
}

// Per-question breakdown returned after grading
export interface ResultQuestionBreakdown {
  question_id: string | null;
  question_number: number | null;
  category: string | null;
  question_text: string | null;
  options: ExamOption[]; // full options, is_correct now visible
  correct_answer: string | null;
  selected_answer: string | null;
  is_correct: boolean;
  is_unattempted: boolean;
  explanation: string | null;
}

export interface ExamResult {
  examId: string;
  examTitle: string;
  attemptId: string;
  submittedAt: string; // ISO timestamp
  timeTakenSeconds: number | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  score: number; // points, 1 per correct
  scoreTotal: number; // = totalQuestions
  scorePercent: number;
  breakdown: ResultQuestionBreakdown[];
}
