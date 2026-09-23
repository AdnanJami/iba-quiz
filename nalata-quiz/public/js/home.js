function examCardHTML(exam) {
  const result = resultStore.get(exam.id);
  const durationLabel = exam.durationMinutes ? `${exam.durationMinutes} min` : "untimed";

  const actions = result
    ? `
      <a class="btn btn-primary btn-small" href="/result.html?id=${encodeURIComponent(exam.id)}">View result</a>
      <a class="btn btn-ghost-dark btn-small" href="/exam.html?id=${encodeURIComponent(exam.id)}&retake=1">Retake</a>
    `
    : `
      <a class="btn btn-primary btn-small" href="/exam.html?id=${encodeURIComponent(exam.id)}">Start test</a>
    `;

  const scoreLine = result
    ? `<div class="pill pill-orange">Last score: ${result.score}/${result.scoreTotal}</div>`
    : "";

  return `
    <article class="brutal exam-card">
      <h3>${escapeHTML(exam.title)}</h3>
      <div class="exam-meta">
        <span class="pill">${exam.totalQuestions} questions</span>
        <span class="pill pill-coral">${durationLabel}</span>
        ${scoreLine}
      </div>
      <div class="exam-card-actions">${actions}</div>
    </article>
  `;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function init() {
  const grid = document.getElementById("exam-grid");

  scatterDoodles(document.body, [
    { type: "flower", style: { top: "6%", left: "2%", width: "70px" } },
    { type: "leaf", style: { top: "12%", right: "3%", width: "50px" } },
    { type: "fish", style: { bottom: "6%", left: "4%", width: "80px" } },
    { type: "swirl", style: { bottom: "3%", right: "2%", width: "130px" } },
  ]);

  try {
    const exams = await api.listExams();
    if (exams.length === 0) {
      grid.innerHTML = `<p class="empty-state">No exams have been seeded yet. Run <code>npm run seed</code> after dropping a template JSON into <code>data/templates/</code>.</p>`;
      return;
    }
    grid.innerHTML = exams.map(examCardHTML).join("");
  } catch (err) {
    grid.innerHTML = `<p class="empty-state">Couldn't load exams. Is the server running?</p>`;
    console.error(err);
  }
}

init();
