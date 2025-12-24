/**
 * Code Protection Module (Snapshot & Replace Strategy)
 *
 * 전략:
 * 1. Capture: DOM에 code 요소가 등장하는 즉시 원본 HTML을 캡처하여 저장 (Golden Copy).
 * 2. Detect: .token 등 확장 프로그램에 의한 오염이 감지되면,
 * 3. Replace: 오염된 요소를 치료하지 않고, 원본을 기반으로 생성한 새 요소로 통째로 교체.
 */

export function initCodeProtection() {
  if (typeof document === 'undefined') return;

  // 1. Golden Copy 저장소 (Element -> { innerHTML, className, attributes })
  // WeakMap을 사용하여 메모리 누수 방지
  const goldenMap = new WeakMap();

  // 우리가 생성해서 교체한 '깨끗한 요소'임을 표시 (무한 루프 방지)
  const trustedElements = new WeakSet();

  /**
   * 요소를 깨끗한 원본으로 교체하는 함수
   */
  function restoreElement(element) {
    // 이미 교체 작업 중이거나 신뢰할 수 있는 요소라면 패스
    if (trustedElements.has(element)) return;

    const originalData = goldenMap.get(element);
    if (!originalData) return; // 원본이 없으면 복구 불가

    // 새 요소 생성 (오염된 요소는 버림)
    const newElement = document.createElement(element.tagName);

    // 원본 데이터 복원 (HTML, 클래스)
    newElement.innerHTML = originalData.innerHTML;
    newElement.className = originalData.className;

    // 원본 속성 복원 (저장된 속성 + 방어용 속성)
    if (originalData.attributes) {
      Array.from(originalData.attributes).forEach((attr) => {
        // 방어용 속성은 아래에서 일괄 적용하므로 제외해도 되지만, 일단 원본 존중
        newElement.setAttribute(attr.name, attr.value);
      });
    }

    // 방어용 속성 강제 적용 (덮어쓰기)
    const protectionAttrs = {
      'data-1p-ignore': '',
      'data-lpignore': 'true',
      'data-form-type': 'other',
      autocomplete: 'off',
      spellcheck: 'false',
      translate: 'no',
      'data-gramm': 'false' // Grammarly
    };

    Object.entries(protectionAttrs).forEach(([key, val]) => {
      newElement.setAttribute(key, val);
    });

    // 신뢰 목록에 추가
    trustedElements.add(newElement);
    goldenMap.set(newElement, originalData); // 새 요소도 원본 데이터로 맵에 등록

    // 교체 실행
    if (element.parentNode) {
      console.log('🛡️ 오염 감지됨! 원본으로 교체합니다.', element);
      element.replaceWith(newElement);
    }
  }

  /**
   * 오염 여부 판단
   */
  function isContaminated(element) {
    // 1. .token 클래스 체크 (Prism, 1Password 등)
    if (
      element.querySelector('.token') ||
      element.classList.contains('token')
    ) {
      return true;
    }
    // 2. 내용 변조 체크 (Golden Copy와 비교)
    const originalData = goldenMap.get(element);
    if (originalData && element.innerHTML !== originalData.innerHTML) {
      // 단순 텍스트 변경이 아니라 HTML 구조가 변경된 경우만 오염으로 간주
      // (브라우저가 HTML을 정규화하는 과정에서의 사소한 차이는 무시해야 할 수도 있음)
      // 여기서는 엄격하게 체크하되, trustedElements는 제외
      if (!trustedElements.has(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 원본 데이터 캡처 (Snapshot)
   */
  function captureGoldenCopy(codeEl) {
    if (goldenMap.has(codeEl)) return;

    // 속성 복사 (NamedNodeMap -> Array -> Object 변환 필요 없음, 그냥 Array로 저장해도 됨)
    // 하지만 cloneNode(false)로 껍데기만 복사해서 속성을 가져오는 게 더 안전할 수 있음
    // 여기서는 간단하게 속성 목록을 저장

    goldenMap.set(codeEl, {
      innerHTML: codeEl.innerHTML,
      className: codeEl.className,
      attributes: codeEl.attributes ? Array.from(codeEl.attributes) : []
    });

    // 초기 방어 속성 주입
    codeEl.setAttribute('data-1p-ignore', '');
    codeEl.setAttribute('spellcheck', 'false');
  }

  /**
   * 전역 감시자 (Capture & Protect)
   * documentElement부터 감시하여 가장 빠르게 포착
   */
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // 1. 새로운 노드 추가 감지 (Capture Phase)
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // code 요소거나 그 하위 code 찾기
          const targets = [];
          if (node.matches && node.matches('code')) targets.push(node);
          if (node.querySelectorAll) {
            targets.push(...node.querySelectorAll('code'));
          }

          targets.forEach((codeEl) => {
            // 오염되지 않은 상태라고 가정하고 캡처 (0.2초의 기회)
            // 단, 이미 오염된 상태로 들어올 수도 있으므로 체크 필요
            if (codeEl.querySelector('.token')) {
              // 이미 오염됨 -> 복구 시도하려 해도 원본이 없음...
              // 하지만 보통 이 단계는 렌더링 초기라 깨끗할 확률 높음
              // 혹시 모르니 정화 시도 후 저장? -> 일단 있는 그대로 저장
            }

            captureGoldenCopy(codeEl);
          });
        });
      }

      // 2. 오염 감지 (Protection Phase)
      // 변경된 대상이 code거나 code 내부인 경우
      let target = mutation.target;

      // 텍스트 노드 변경인 경우 부모 요소 확인
      if (target.nodeType === Node.TEXT_NODE) {
        target = target.parentNode;
      }

      if (!target || target.nodeType !== Node.ELEMENT_NODE) return;

      // 변경된 요소가 code 자신이거나 code의 자손인 경우
      const codeBlock = target.closest('code');
      if (codeBlock) {
        // 우리가 교체한 건 무시
        if (trustedElements.has(codeBlock)) return;

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
    attributeFilter: ['class', 'style'] // 성능 최적화
  });

  // 초기 로드 시 이미 존재하는 코드 블록 캡처
  document.querySelectorAll('code').forEach(captureGoldenCopy);
}
