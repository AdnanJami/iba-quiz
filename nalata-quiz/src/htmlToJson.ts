/**
 * htmlToJson.ts
 *
 * TypeScript port of html_to_json.py. Parses a Capstone-style exam-submission
 * HTML export ("Exam Details" / "Your Submission" page) into the same JSON
 * shape used elsewhere in this app (see ./types.ts), using cheerio as the
 * Node equivalent of BeautifulSoup.
 *
 * NOTE on underlines: question_text and comprehension are extracted as a
 * *sanitized HTML string* (via extractRichText) rather than plain text, so
 * that <u>...</u> markers around the erroneous word survive. Every other
 * tag is unwrapped (dropped, keeping its inner text) and all literal text
 * is HTML-escaped. The client renders these two fields with innerHTML
 * (not escapeHTML) since they're already safe -- see public/js/exam.js and
 * public/js/result.js.
 */

import * as cheerio from "cheerio";
import type {
  CategoryPerformance,
  ExamOption,
  ExamQuestion,
  ExamSummary,
  ExamTemplate,
} from "./types";

/** Collapse whitespace from a cheerio selection's text, mirroring
 *  BeautifulSoup's get_text(" ", strip=True). Plain text, no markup. */
function cleanText($el: any): string {
  if (!$el || $el.length === 0) return "";
  return $el.text().replace(/\s+/g, " ").trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Recursively render a cheerio/DOM node to a sanitized HTML string that
 *  keeps only <u> tags; every other tag is unwrapped (its children are
 *  kept, the tag itself is dropped), and text is HTML-escaped. */
function renderNodeKeepUnderline(node: any): string {
  if (!node) return "";

  if (node.type === "text") {
    return escapeHtml(node.data || "");
  }

  if (node.type === "tag") {
    const inner = (node.children || []).map((child: any) => renderNodeKeepUnderline(child)).join("");
    if (node.name === "u") return `<u>${inner}</u>`;
    if (node.name === "br") return " ";
    return inner; // unwrap: drop the tag, keep its contents
  }

  return "";
}

/** Like cleanText, but preserves <u> tags as sanitized HTML instead of
 *  stripping them. Everything else is unwrapped/escaped. */
function extractRichText($el: any): string {
  if (!$el || $el.length === 0) return "";
  const node = $el.get(0);
  return renderNodeKeepUnderline(node).replace(/\s+/g, " ").trim();
}

function parseExamSummary($: any): ExamSummary {
  const summary: ExamSummary = {};

  summary.exam_title = cleanText($(".card-body h2").first());

  const badgeTexts = $(".card-body .mb-3 .badge")
    .map((_: number, el: any) => cleanText($(el)))
    .get() as string[];

  for (const t of badgeTexts) {
    if (/\d{4}-\d{2}-\d{2}/.test(t)) summary.date = t;
    else if (/minute/i.test(t)) summary.duration = t;
    else if (/mark/i.test(t)) summary.total_marks = t;
    else if (/question/i.test(t)) summary.total_questions = t;
  }

  const scoreP = $(".alert-success p").first();
  if (scoreP.length) {
    const scoreText = cleanText(scoreP).replace("Your Score:", "").trim();
    summary.score_text = scoreText;
    const m = scoreText.match(/^([\d.]+)\s*\/\s*([\d.]+)/);
    if (m) {
      summary.score_obtained = parseFloat(m[1]);
      summary.score_total = parseFloat(m[2]);
    }
  }

  return summary;
}

function parseSubmissionOverview($: any): Record<string, unknown> {
  const container = $(".d-flex.flex-wrap.gap-2").first();
  const result: Record<string, unknown> = {};
  if (!container.length) return result;

  const badges = container
    .find(".badge")
    .map((_: number, el: any) => cleanText($(el)))
    .get() as string[];

  for (const b of badges) {
    const low = b.toLowerCase();
    if (low.includes("mark") && !low.includes("pass marks")) result.total_marks_awarded = b;
    else if (low.includes("passed") || low.includes("failed")) result.pass_status = b;
    else if (low.includes("correct")) result.correct_count = b;
    else if (low.includes("wrong")) result.wrong_count = b;
    else if (low.includes("pending")) result.pending_count = b;
    else if (low.includes("unattempted")) result.unattempted_count = b;
    else if (low.includes("pass marks")) result.pass_marks = b;
  }

  return result;
}

function parseCategoryPerformance($: any): CategoryPerformance[] {
  const categories: CategoryPerformance[] = [];
  const table = $("table.table-bordered").first();
  if (!table.length) return categories;

  table.find("tbody tr").each((_: number, row: any) => {
    const cells = $(row)
      .find("td")
      .map((_: number, td: any) => cleanText($(td)))
      .get() as string[];

    if (cells.length >= 4) {
      categories.push({
        category: cells[0],
        score: cells[1],
        pass_marks: cells[2],
        total_marks: cells[3],
        status: cells.length > 4 ? cells[4] : null,
      });
    }
  });

  return categories;
}

function parseOptions($: any, card: any): ExamOption[] {
  const options: ExamOption[] = [];
  const optionDivs = card.find(".d-flex.flex-column.mb-3.gap-2 > div.border");

  optionDivs.each((_: number, el: any) => {
    const div = $(el);

    const labelEl = div.find("strong").first();
    const label = labelEl.length ? cleanText(labelEl).replace(/\.$/, "") : null;

    const textSpan = div.find("span.ms-1").first();
    const text = textSpan.length ? cleanText(textSpan) : null;

    const classes = (div.attr("class") || "").split(/\s+/);
    const isCorrect = classes.includes("border-success") || classes.includes("bg-success-transparent");
    const isSelectedWrong = classes.includes("border-danger") || classes.includes("bg-danger-transparent");
    const isSelected = div.find(".badge.bg-primary").length > 0;

    options.push({
      label,
      text,
      is_correct: isCorrect,
      is_selected: isSelected,
      selected_and_wrong: isSelectedWrong,
    });
  });

  return options;
}

function parseQuestionCard($: any, card: any): ExamQuestion {
  const questionId = card.attr("data-question-id") || null;
  const answerId = card.attr("data-answer-id") || null;

  const questionLabel = cleanText(card.find(".card-header h6").first());
  const qNumMatch = questionLabel.match(/(\d+)/);
  const questionNumber = qNumMatch ? parseInt(qNumMatch[1], 10) : null;

  const category = cleanText(card.find(".card-header .badge.bg-primary-transparent").first());
  const status = cleanText(card.find("[data-status-badge] .badge").first());

  const comprehensionEl = card.find(".question-comprehension").first();
  // Rich text: keeps <u> markup (rare here, but consistent with question_text).
  const comprehension = comprehensionEl.length ? extractRichText(comprehensionEl) : null;

  let questionText: string | null = null;
  const candidateDivs = card.find(".card-body > div.mb-3");
  for (let i = 0; i < candidateDivs.length; i++) {
    const div = $(candidateDivs[i]);
    const classes = (div.attr("class") || "").split(/\s+/);
    if (classes.includes("question-comprehension")) continue;
    // Rich text: preserves the <u>...</u> underline around the erroneous word.
    questionText = extractRichText(div);
    break;
  }

  const marksEl = card.find("[data-marks-value]").first();
  let marksAwarded: number | string | null = null;
  if (marksEl.length) {
    const raw = cleanText(marksEl);
    const num = parseFloat(raw);
    marksAwarded = Number.isNaN(num) ? raw : num;
  }

  const options = parseOptions($, card);
  const correctOption = options.find((o) => o.is_correct)?.label ?? null;
  const selectedOption = options.find((o) => o.is_selected)?.label ?? null;

  const solutionEl = card.find(".solution-text").first();
  let explanation: string | null = solutionEl.length ? cleanText(solutionEl) : null;
  let answerLetter = correctOption;

  if (explanation) {
    const m = explanation.match(/Answer:\s*([A-E])/);
    if (m) {
      answerLetter = m[1];
      explanation = explanation.replace(/^Answer:\s*[A-E]\.?\s*/, "").trim();
      explanation = explanation.replace(/^Explanation:\s*/, "").trim();
    }
  }

  return {
    question_number: questionNumber,
    question_id: questionId,
    answer_id: answerId,
    category,
    status,
    marks_awarded: marksAwarded,
    comprehension,
    question_text: questionText,
    options,
    correct_answer: answerLetter,
    selected_answer: selectedOption,
    explanation,
  };
}

/** Parse a full HTML export string into the app's ExamTemplate shape. */
export function parseExamHtml(html: string): ExamTemplate {
  const $ = cheerio.load(html);

  const questions: ExamQuestion[] = [];
  $("div.card.custom-card[data-question-id]").each((_: number, el: any) => {
    questions.push(parseQuestionCard($, $(el)));
  });

  const data: ExamTemplate = {
    exam_summary: parseExamSummary($),
    submission_overview: parseSubmissionOverview($),
    category_performance: parseCategoryPerformance($),
    questions,
    stats: {
      num_questions_parsed: questions.length,
      num_correct: questions.filter((q) => q.status === "Correct").length,
      num_wrong: questions.filter((q) => q.status === "Wrong").length,
    },
  };

  return data;
}

/**
 * Strip every submission-specific value (scores, pass/fail, marks awarded,
 * per-question status, selected answers, and stats) while keeping the
 * exam/question structure and the answer key intact, so the result can be
 * reused as a blank template for a fresh attempt.
 */
export function templatize(data: ExamTemplate): ExamTemplate {
  data.exam_summary = {
    ...data.exam_summary,
    score_text: null,
    score_obtained: null,
    score_total: null,
  };

  data.submission_overview = {};

  data.category_performance = data.category_performance.map((cat) => ({
    ...cat,
    score: null,
    status: null,
  }));

  data.questions = data.questions.map((q) => ({
    ...q,
    status: null,
    marks_awarded: null,
    selected_answer: null,
    options: q.options.map((opt) => ({
      ...opt,
      is_selected: false,
      selected_and_wrong: false,
    })),
  }));

  data.stats = {
    num_questions_parsed: data.questions.length,
    num_correct: null,
    num_wrong: null,
  };

  return data;
}