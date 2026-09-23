// Minimal fetch helpers for the /api/exams endpoints.

const api = {
  async listExams() {
    const res = await fetch("/api/exams");
    if (!res.ok) throw new Error("Failed to load exams");
    return res.json();
  },

  async getExam(id) {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to load exam");
    return res.json();
  },

  async submitExam(id, payload) {
    const res = await fetch(`/api/exams/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit exam");
    return res.json();
  },

  async importExam(payload) {
    const res = await fetch("/api/exams/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body && body.error ? body.error : "Failed to import exam";
      throw new Error(message);
    }
    return body;
  },
};