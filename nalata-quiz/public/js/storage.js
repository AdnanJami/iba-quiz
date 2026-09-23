// Browser-cache (localStorage) helpers for exam results.
// Each exam keeps its most recent attempt under a stable key, so a user
// who revisits the site sees their last result, and can retake to
// overwrite it.

const STORAGE_PREFIX = "nalata:result:";

function resultKey(examId) {
  return `${STORAGE_PREFIX}${examId}`;
}

const resultStore = {
  save(examId, result) {
    try {
      localStorage.setItem(resultKey(examId), JSON.stringify(result));
    } catch (err) {
      console.warn("Could not save result to localStorage:", err);
    }
  },

  get(examId) {
    try {
      const raw = localStorage.getItem(resultKey(examId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn("Could not read result from localStorage:", err);
      return null;
    }
  },

  clear(examId) {
    localStorage.removeItem(resultKey(examId));
  },

  has(examId) {
    return localStorage.getItem(resultKey(examId)) !== null;
  },
};
