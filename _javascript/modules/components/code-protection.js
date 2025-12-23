/**
 * 1Password 확장이 코드 블록에 주입하는 Prism.js 스타일을 제거하는 모듈
 * MutationObserver를 사용하여 실시간으로 DOM 변경을 감지하고 되돌립니다.
 */
export function initCodeProtection() {
  if (typeof document === 'undefined') {
    return;
  }

  // 모든 <pre><code> 블록을 대상으로 관찰
  const codeBlocks = document.querySelectorAll('pre code');

  if (codeBlocks.length === 0) {
    return;
  }

  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        // 추가된 노드 중 Prism 클래스(span.token 등)가 있으면 제거
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // .token 클래스 가진 span 제거하거나 스타일 초기화
            if (node.classList && node.classList.contains('token')) {
              // 방법 1: 단순히 텍스트로 되돌리기 (권장)
              const text = node.textContent;
              node.parentNode.insertBefore(document.createTextNode(text), node);
              node.parentNode.removeChild(node);
            } else {
              // 재귀적으로 하위 token 제거
              node.querySelectorAll('.token').forEach(function(token) {
                const text = token.textContent;
                token.parentNode.insertBefore(document.createTextNode(text), token);
                token.parentNode.removeChild(token);
              });
            }
          }
        });
      }
    });
  });

  // 각 코드 블록 관찰 설정
  codeBlocks.forEach(function(block) {
    observer.observe(block, {
      childList: true, // 자식 노드 추가/제거 감지
      subtree: true, // 하위 트리 전체 감지
      characterData: true // 텍스트 변경 감지 (안전하게)
    });
  });

  // 페이지 로드 후에도 한 번 강제 정리 (늦게 주입될 경우 대비)
  setTimeout(function() {
    document.querySelectorAll('pre code .token').forEach(function(token) {
      const text = token.textContent;
      token.parentNode.insertBefore(document.createTextNode(text), token);
      token.parentNode.removeChild(token);
    });
  }, 1000); // 1초 후 실행 (조정 가능)
}
