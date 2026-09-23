// Simple countdown timer. Ticks once a second, calls onTick with the
// remaining seconds, and calls onExpire once when it hits zero.

function createCountdownTimer({ durationSeconds, onTick, onExpire }) {
  let remaining = durationSeconds;
  let intervalId = null;
  let expired = false;

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      remaining = 0;
      onTick(remaining);
      stop();
      if (!expired) {
        expired = true;
        onExpire();
      }
      return;
    }
    onTick(remaining);
  }

  function start() {
    onTick(remaining);
    intervalId = setInterval(tick, 1000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getRemaining() {
    return remaining;
  }

  function getElapsedSeconds() {
    return durationSeconds - remaining;
  }

  return { start, stop, getRemaining, getElapsedSeconds };
}

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
