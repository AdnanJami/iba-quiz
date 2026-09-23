function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function questionCardHTML(q, index, total) {
  // comprehension and question_text arrive from the server already
  // sanitized to plain text + <u> tags only (see src/htmlToJson.ts), so
  // they're inserted as-is here rather than run through escapeHTML -
  // that's what lets the underlined error markers survive.
  const comprehension = q.comprehension
    ? `<div class="comprehension">${q.comprehension}</div>`
    : "";

  const options = q.options
    .map(
      (opt) => `
      <label class="option" data-qid="${escapeHTML(q.question_id)}" data-label="${escapeHTML(opt.label)}">
        <input type="radio" name="q-${escapeHTML(q.question_id)}" value="${escapeHTML(opt.label)}" />
        <span><span class="opt-label">${escapeHTML(opt.label)}.</span> ${escapeHTML(opt.text)}</span>
      </label>
    `
    )
    .join("");

  return `
    <article class="brutal question-card" id="question-${escapeHTML(q.question_id)}">
      ${comprehension}
      <div class="q-top">
        <span class="q-number">Question ${index + 1} of ${total}</span>
        <span class="q-category">${escapeHTML(q.category || "")}</span>
      </div>
      <p class="question-text">${q.question_text}</p>
      <div class="options">${options}</div>
    </article>
  `;
}

async function main() {
  const root = document.getElementById("exam-root");
  const examId = getQueryParam("id");
  const isRetake = getQueryParam("retake") === "1";

  if (!examId) {
    root.innerHTML = `<p class="empty-state">No exam selected. <a href="/">Go back home</a>.</p>`;
    return;
  }

  // If there's already a saved result and this isn't an explicit retake,
  // send the user straight to their result instead of re-taking silently.
  if (!isRetake && resultStore.has(examId)) {
    window.location.replace(`/result.html?id=${encodeURIComponent(examId)}`);
    return;
  }

  if (isRetake) {
    resultStore.clear(examId);
  }

  let exam;
  try {
    exam = await api.getExam(examId);
  } catch (err) {
    root.innerHTML = `<p class="empty-state">Couldn't load that exam. <a href="/">Go back home</a>.</p>`;
    return;
  }

  const answers = {};
  let submitted = false;
  const startedAt = Date.now();

  const durationMinutes = exam.durationMinutes;
  const timerHTML = durationMinutes
    ? `<div id="timer" class="timer">--:--</div>`
    : `<div class="timer">untimed</div>`;

  root.innerHTML = `
    <div class="exam-header brutal">
      <div>
        <h1>${escapeHTML(exam.title)}</h1>
        <div class="exam-progress">${exam.totalQuestions} questions</div>
      </div>
      ${timerHTML}
    </div>

    <div id="questions"></div>

    <div class="submit-bar">
      <button id="submit-btn" class="btn btn-primary">Submit test</button>
    </div>
  `;

  const questionsEl = document.getElementById("questions");
  questionsEl.innerHTML = exam.questions
    .map((q, i) => questionCardHTML(q, i, exam.totalQuestions))
    .join("");

  scatterDoodles(document.body, [
    { type: "leaf", style: { top: "4%", right: "1%", width: "46px", opacity: "0.5" } },
    { type: "flower", style: { bottom: "4%", left: "1%", width: "60px", opacity: "0.5" } },
  ]);

  // Wire up option selection
  questionsEl.querySelectorAll(".option").forEach((optionEl) => {
    optionEl.addEventListener("click", () => {
      const qid = optionEl.dataset.qid;
      const label = optionEl.dataset.label;
      answers[qid] = label;

      const input = optionEl.querySelector("input");
      input.checked = true;

      document
        .querySelectorAll(`.option[data-qid="${CSS.escape(qid)}"]`)
        .forEach((el) => el.classList.remove("selected"));
      optionEl.classList.add("selected");
    });
  });

  async function submitExam() {
    if (submitted) return;
    submitted = true;

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";
    }

    const timeTakenSeconds = Math.round((Date.now() - startedAt) / 1000);

    try {
      const result = await api.submitExam(examId, { answers, timeTakenSeconds });
      resultStore.save(examId, result);
      window.location.href = `/result.html?id=${encodeURIComponent(examId)}`;
    } catch (err) {
      submitted = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit test";
      }
      alert("Couldn't submit your test. Please check your connection and try again.");
      console.error(err);
    }
  }

  document.getElementById("submit-btn").addEventListener("click", submitExam);

  if (durationMinutes) {
    const timerEl = document.getElementById("timer");
    const timer = createCountdownTimer({
      durationSeconds: durationMinutes * 60,
      onTick: (remaining) => {
        timerEl.textContent = formatMMSS(remaining);
        timerEl.classList.toggle("warn", remaining <= 60);
      },
      onExpire: () => {
        submitExam();
      },
    });
    timer.start();

    window.addEventListener("beforeunload", () => timer.stop());
  }
}

main();