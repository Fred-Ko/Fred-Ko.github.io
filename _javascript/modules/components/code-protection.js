/**
 * Code Protection Module (Snapshot & Replace Strategy)
 *
 * 1Password, Grammarly 같은 브라우저 확장은 코드 블록 내부에 별도 span/class를
 * 주입할 수 있다. Rouge가 생성한 코드 블록은 table, line number, copy 버튼이
 * HTML 구조에 의존하므로 이런 주입이 발생하면 포매팅이 깨진다.
 *
 * 이 모듈은 code 요소의 최초 HTML을 스냅샷으로 저장해 두고, 확장 프로그램이
 * DOM을 오염시킨 흔적을 발견하면 오염된 code 요소만 원본 스냅샷으로 교체한다.
 * 단순한 cleanup 코드가 아니라 렌더링 안정성을 위한 클라이언트 방어막이다.
 */

export function initCodeProtection() {
  if (typeof document === 'undefined') return;

  const protectionAttrs = {
    'data-1p-ignore': '',
    'data-lpignore': 'true',
    'data-form-type': 'other',
    autocomplete: 'off',
    spellcheck: 'false',
    translate: 'no',
    'data-gramm': 'false'
  };

  // code element -> immutable snapshot. WeakMap keeps removed DOM nodes collectible.
  const goldenMap = new WeakMap();

  // Elements currently being restored. This only prevents observer self-feedback;
  // restored nodes must keep being watched because extensions can mutate them again.
  const restoringElements = new WeakSet();

  function applyProtectionAttrs(element) {
    Object.entries(protectionAttrs).forEach(([key, val]) => {
      element.setAttribute(key, val);
    });
  }

  /**
   * Replace the contaminated code element with a clean copy from the snapshot.
   */
  function restoreElement(element) {
    if (restoringElements.has(element)) return;

    const originalData = goldenMap.get(element);
    if (!originalData) return;

    const newElement = document.createElement(element.tagName.toLowerCase());

    newElement.innerHTML = originalData.innerHTML;
    newElement.className = originalData.className;

    originalData.attributes.forEach(({ name, value }) => {
      newElement.setAttribute(name, value);
    });

    applyProtectionAttrs(newElement);

    if (element.parentNode) {
      restoringElements.add(newElement);
      goldenMap.set(newElement, originalData);
      element.replaceWith(newElement);

      queueMicrotask(() => {
        restoringElements.delete(newElement);
      });
    }
  }

  /**
   * Detect extension-like mutations inside code blocks.
   */
  function isContaminated(element) {
    if (
      element.querySelector('.token') ||
      element.classList.contains('token')
    ) {
      return true;
    }

    const originalData = goldenMap.get(element);
    if (originalData && element.innerHTML !== originalData.innerHTML) {
      if (!restoringElements.has(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Capture a clean snapshot before browser extensions get a chance to mutate it.
   */
  function captureGoldenCopy(codeEl) {
    if (goldenMap.has(codeEl)) return;

    goldenMap.set(codeEl, {
      innerHTML: codeEl.innerHTML,
      className: codeEl.className,
      attributes: codeEl.attributes
        ? Array.from(codeEl.attributes, ({ name, value }) => ({ name, value }))
        : []
    });

    applyProtectionAttrs(codeEl);
  }

  /**
   * Watch the whole document because extensions often mutate nodes after page JS
   * has already finished initialization.
   */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const targets = [];
          if (node.matches && node.matches('code')) targets.push(node);
          if (node.querySelectorAll) {
            targets.push(...node.querySelectorAll('code'));
          }

          targets.forEach((codeEl) => {
            if (!isContaminated(codeEl)) {
              captureGoldenCopy(codeEl);
            }
          });
        });
      }

      let target = mutation.target;

      if (target.nodeType === Node.TEXT_NODE) {
        target = target.parentNode;
      }

      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

      const codeBlock = target.closest('code');
      if (codeBlock) {
        if (isContaminated(codeBlock)) {
          restoreElement(codeBlock);
        }
      }
    });
  });

  // 감시 시작
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
    attributeFilter: ['class', 'style']
  });

  document.querySelectorAll('code').forEach(captureGoldenCopy);
}
