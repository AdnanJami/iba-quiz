function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function statusTag(item) {
  if (item.is_unattempted) return `<span class="tag tag-unattempted">Unattempted</span>`;
  if (item.is_correct) return `<span class="tag tag-correct">Correct</span>`;
  return `<span class="tag tag-wrong">Wrong</span>`;
}

function optionReviewHTML(opt, item) {
  const isCorrectOpt = opt.label === item.correct_answer;
  const isSelectedWrong = opt.label === item.selected_answer && !item.is_correct && !item.is_unattempted;

  let cls = "option-review";
  if (isCorrectOpt) cls += " is-correct-opt";
  else if (isSelectedWrong) cls += " is-selected-wrong";

  const marker = isCorrectOpt ? " ✓ correct" : isSelectedWrong ? " ✗ your answer" : "";

  return `
    <div class="${cls}">
      <strong>${escapeHTML(opt.label)}.</strong>
      <span>${escapeHTML(opt.text)}${marker}</span>
    </div>
  `;
}

function breakdownItemHTML(item, index) {
  const explanation = item.explanation
    ? `<div class="explanation">${escapeHTML(item.explanation)}</div>`
    : "";

  const options = item.options.map((opt) => optionReviewHTML(opt, item)).join("");

  return `
    <article class="brutal breakdown-question">
      <div class="q-top">
        <span class="q-number">Question ${index + 1}</span>
        ${statusTag(item)}
      </div>
      <p class="question-text">${item.question_text}</p>
      ${options}
      ${explanation}
    </article>
  `;
}

function renderResult(root, examId, result) {
  const timeLabel =
    typeof result.timeTakenSeconds === "number"
      ? `${Math.floor(result.timeTakenSeconds / 60)}m ${result.timeTakenSeconds % 60}s`
      : null;

  root.innerHTML = `
    <div class="brutal score-card">
      <h1>${escapeHTML(result.examTitle)}</h1>
      <div class="score-big">${result.score} / ${result.scoreTotal}</div>
      <div class="score-sub">${result.scorePercent}% correct${timeLabel ? " · " + timeLabel : ""}</div>

      <div class="stat-row">
        <span class="stat-chip correct">${result.correctCount} correct</span>
        <span class="stat-chip wrong">${result.wrongCount} wrong</span>
        <span class="stat-chip unattempted">${result.unattemptedCount} unattempted</span>
      </div>

      <div class="result-actions">
        <a class="btn btn-primary" href="/exam.html?id=${encodeURIComponent(examId)}&retake=1">Retake test</a>
        <a class="btn btn-ghost-dark" href="/">Back to tests</a>
      </div>
    </div>

    <div class="breakdown-toggle">
      <button id="toggle-breakdown" class="btn btn-coral btn-small">Review all answers</button>
    </div>

    <div id="breakdown" style="display:none;"></div>
  `;

  const breakdownEl = document.getElementById("breakdown");
  const toggleBtn = document.getElementById("toggle-breakdown");
  let rendered = false;

  toggleBtn.addEventListener("click", () => {
    const showing = breakdownEl.style.display !== "none";
    if (showing) {
      breakdownEl.style.display = "none";
      toggleBtn.textContent = "Review all answers";
      return;
    }
    if (!rendered) {
      breakdownEl.innerHTML = result.breakdown.map(breakdownItemHTML).join("");
      rendered = true;
    }
    breakdownEl.style.display = "block";
    toggleBtn.textContent = "Hide answers";
  });
}

function init() {
  const root = document.getElementById("result-root");
  const examId = getQueryParam("id");

  scatterDoodles(document.body, [
    { type: "flower", style: { top: "5%", left: "2%", width: "60px" } },
    { type: "swirl", style: { top: "4%", right: "0%", width: "120px" } },
  ]);

  if (!examId) {
    root.innerHTML = `<p class="empty-state">No exam specified. <a href="/">Go back home</a>.</p>`;
    return;
  }

  const result = resultStore.get(examId);
  if (!result) {
    root.innerHTML = `
      <p class="empty-state">
        No saved result for this test yet.<br />
        <a class="btn btn-primary" style="margin-top:14px;" href="/exam.html?id=${encodeURIComponent(examId)}">Take the test</a>
      </p>
    `;
    return;
  }

  renderResult(root, examId, result);
}

init();