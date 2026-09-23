// Small hand-drawn-style SVG doodles echoing the Na Lata tin illustration:
// a 5-petal flower, a wavy swirl (like the line under "lata"), a simple fish
// outline (like the fish inside the "a"), and a leafy vine branch.

const DOODLES = {
  flower: `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="#f36c72" stroke-width="3">
        <ellipse cx="50" cy="22" rx="11" ry="18" transform="rotate(0 50 50)"/>
        <ellipse cx="50" cy="22" rx="11" ry="18" transform="rotate(72 50 50)"/>
        <ellipse cx="50" cy="22" rx="11" ry="18" transform="rotate(144 50 50)"/>
        <ellipse cx="50" cy="22" rx="11" ry="18" transform="rotate(216 50 50)"/>
        <ellipse cx="50" cy="22" rx="11" ry="18" transform="rotate(288 50 50)"/>
      </g>
      <circle cx="50" cy="50" r="9" fill="#fc6b15" stroke="#00007c" stroke-width="2"/>
    </svg>`,
  swirl: `
    <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path d="M5 30 C 30 5, 60 5, 80 30 S 130 55, 150 30 C 165 15, 180 15, 190 27"
            stroke="#f36c72" stroke-width="3" stroke-linecap="round"/>
      <circle cx="192" cy="38" r="7" stroke="#f36c72" stroke-width="3" fill="none"/>
    </svg>`,
  fish: `
    <svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path d="M10 30 C 25 10, 55 10, 70 30 C 55 50, 25 50, 10 30 Z" stroke="#fc6b15" stroke-width="3"/>
      <path d="M70 30 L92 16 L92 44 Z" stroke="#fc6b15" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="24" cy="27" r="2.6" fill="#fc6b15"/>
    </svg>`,
  leaf: `
    <svg viewBox="0 0 60 120" xmlns="http://www.w3.org/2000/svg" fill="none">
      <path d="M30 5 C 20 30, 40 40, 30 65 C 20 90, 40 100, 30 115"
            stroke="#fc6b15" stroke-width="3" stroke-linecap="round"/>
      <g stroke="#fc6b15" stroke-width="2.5" fill="none">
        <ellipse cx="14" cy="25" rx="10" ry="5" transform="rotate(-30 14 25)"/>
        <ellipse cx="46" cy="50" rx="10" ry="5" transform="rotate(30 46 50)"/>
        <ellipse cx="14" cy="80" rx="10" ry="5" transform="rotate(-30 14 80)"/>
        <ellipse cx="46" cy="105" rx="10" ry="5" transform="rotate(30 46 105)"/>
      </g>
    </svg>`,
};

/**
 * Scatter decorative doodles into a container.
 * @param {HTMLElement} container
 * @param {Array<{type: keyof DOODLES, style: Partial<CSSStyleDeclaration>}>} items
 */
function scatterDoodles(container, items) {
  items.forEach(({ type, style }) => {
    const el = document.createElement("div");
    el.className = `doodle doodle-${type}`;
    el.innerHTML = DOODLES[type] || "";
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, style);
    container.appendChild(el);
  });
}
