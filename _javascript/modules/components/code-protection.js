/**
 * 1Password 확장이 코드 블록에 주입하는 Prism.js 스타일을 제거하는 모듈
 * MutationObserver를 사용하여 실시간으로 DOM 변경을 감지하고 되돌립니다.
 */
export function initCodeProtection() {
  if (typeof document === 'undefined') {
    return;
  }

  // document.body가 없으면 DOMContentLoaded를 기다림
  if (!document.body) {
    if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', initCodeProtection);
    } else if (document.attachEvent) {
      document.attachEvent('onreadystatechange', function() {
        if (document.readyState === 'complete') {
          initCodeProtection();
        }
      });
    }
    return;
  }

  // 코드 블록 보호 함수
  function protectCodeBlock(block) {
    if (!block) return;

    // 1Password가 무시하도록 속성 추가
    block.setAttribute('data-1p-ignore', '');
    block.setAttribute('data-lpignore', 'true');
    block.setAttribute('data-form-type', 'other');
    block.setAttribute('autocomplete', 'off');
    block.setAttribute('spellcheck', 'false');

    // 부모 요소에도 적용
    if (block.parentNode) {
      const parent = block.parentNode;
      if (parent.classList && parent.classList.contains('highlight')) {
        parent.setAttribute('data-1p-ignore', '');
      }
      // .highlighter-rouge도 보호
      if (parent.classList && parent.classList.contains('highlighter-rouge')) {
        parent.setAttribute('data-1p-ignore', '');
      }
    }

    // .token 클래스 제거 (Prism.js가 주입한 것) - 핵심 방어 원리
    const tokens = block.querySelectorAll ? block.querySelectorAll('.token') : [];
    tokens.forEach(function(token) {
      const text = token.textContent;
      if (token.parentNode) {
        token.parentNode.insertBefore(document.createTextNode(text), token);
        token.parentNode.removeChild(token);
      }
    });
  }

  // 모든 코드 블록 찾기 (더 포괄적인 셀렉터)
  const codeBlocks = document.querySelectorAll(
    'pre code, .highlight code, code.highlight, code[class*="language-"], .highlighter-rouge code'
  );

  // 초기 보호 적용
  codeBlocks.forEach(protectCodeBlock);

  // MutationObserver로 실시간 보호
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // .token 클래스가 추가되면 제거
            if (node.classList && node.classList.contains('token')) {
              const text = node.textContent;
              if (node.parentNode) {
                node.parentNode.insertBefore(document.createTextNode(text), node);
                node.parentNode.removeChild(node);
              }
            } else {
              // 하위에 .token이 있는지 확인
              if (node.querySelectorAll) {
                node.querySelectorAll('.token').forEach(function(token) {
                  const text = token.textContent;
                  if (token.parentNode) {
                    token.parentNode.insertBefore(document.createTextNode(text), token);
                    token.parentNode.removeChild(token);
                  }
                });
              }
            }

            // 새로 추가된 코드 블록도 보호
            if (node.matches && node.matches('code, .highlight, .highlighter-rouge')) {
              protectCodeBlock(node);
            }

            // 자식 요소 중 코드 블록 찾아서 보호
            if (node.querySelectorAll) {
              node.querySelectorAll('code, .highlight').forEach(protectCodeBlock);
            }
          } else if (node.nodeType === Node.TEXT_NODE) {
            // 텍스트 노드가 추가되면 부모 코드 블록 보호
            const parent = node.parentNode;
            if (parent && parent.tagName === 'CODE') {
              protectCodeBlock(parent);
            }
          }
        });
      }

      // 속성 변경 감지 (1Password가 속성을 건드리는 경우)
      if (mutation.type === 'attributes' && mutation.target) {
        const target = mutation.target;
        if (
          target.tagName === 'CODE' ||
          (target.classList && target.classList.contains('highlight'))
        ) {
          if (!target.hasAttribute('data-1p-ignore')) {
            protectCodeBlock(target);
          }
        }
      }
    });
  });

  // 각 코드 블록 관찰 설정
  codeBlocks.forEach(function(block) {
    observer.observe(block, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'data-1p-ignore']
    });
  });

  // 문서 전체도 관찰 (나중에 추가되는 코드 블록 대비)
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  // 페이지 로드 후에도 지속적으로 보호 (1Password가 늦게 주입할 수 있음)
  let cleanupCount = 0;
  const cleanupInterval = setInterval(function() {
    // 모든 코드 블록 다시 보호
    document
      .querySelectorAll('pre code, .highlight code, code.highlight, code[class*="language-"]')
      .forEach(protectCodeBlock);

    // .token 제거
    document.querySelectorAll('.token').forEach(function(token) {
      const text = token.textContent;
      if (token.parentNode) {
        token.parentNode.insertBefore(document.createTextNode(text), token);
        token.parentNode.removeChild(token);
      }
    });

    cleanupCount++;
    if (cleanupCount >= 20) {
      // 10초 후 중지 (200ms * 20 = 4초)
      clearInterval(cleanupInterval);
    }
  }, 200);
}
