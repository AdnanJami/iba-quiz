function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function setStatus(el, message, kind) {
  el.textContent = message;
  el.className = "import-status" + (kind ? ` import-status-${kind}` : "");
}

function init() {
  const form = document.getElementById("import-form");
  const fileInput = document.getElementById("html-file");
  const textArea = document.getElementById("html-text");
  const idInput = document.getElementById("exam-id");
  const templateCheckbox = document.getElementById("as-template");
  const statusEl = document.getElementById("import-status");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      textArea.value = await readFileAsText(file);
      if (!idInput.value) {
        idInput.value = file.name.replace(/\.html?$/i, "");
      }
    } catch (err) {
      setStatus(statusEl, "Couldn't read that file.", "error");
      console.error(err);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const html = textArea.value.trim();
    if (!html) {
      setStatus(statusEl, "Paste some HTML or choose a file first.", "error");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    setStatus(statusEl, "Converting and saving…");

    try {
      const result = await api.importExam({
        html,
        filename: idInput.value.trim() || undefined,
        asTemplate: templateCheckbox.checked,
      });

      setStatus(statusEl, `Saved "${result.title}" (${result.totalQuestions} questions) as "${result.id}".`, "success");

      const link = document.createElement("a");
      link.href = `/exam.html?id=${encodeURIComponent(result.id)}`;
      link.textContent = "Open it now →";
      link.className = "btn btn-coral btn-small";
      link.style.marginTop = "10px";
      link.style.display = "inline-block";
      statusEl.appendChild(document.createElement("br"));
      statusEl.appendChild(link);
    } catch (err) {
      setStatus(statusEl, err.message || "Import failed.", "error");
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  scatterDoodles(document.body, [
    { type: "leaf", style: { top: "4%", right: "1%", width: "46px", opacity: "0.5" } },
    { type: "flower", style: { bottom: "4%", left: "1%", width: "60px", opacity: "0.5" } },
  ]);
}

init();
