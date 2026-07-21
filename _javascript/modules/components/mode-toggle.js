/**
 * Add listener for theme mode toggle
 */

const toggles = document.querySelectorAll('[data-mode-toggle]');

function renderToggle(toggle) {
  const isDark = Theme.visualState === Theme.DARK;
  const label = isDark ? '라이트 모드로 전환' : '다크 모드로 전환';

  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-checked', String(isDark));
  toggle.setAttribute('title', label);
}

export function modeWatcher() {
  if (toggles.length === 0) {
    return;
  }

  toggles.forEach((toggle) => {
    renderToggle(toggle);
    toggle.addEventListener('click', () => {
      Theme.flip();
      toggles.forEach(renderToggle);
    });
  });
}
