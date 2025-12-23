/**
 * 코드 블록 재처리 디버깅 스크립트
 * 브라우저 콘솔에서 실행하여 코드 블록을 재처리하는 스크립트를 찾습니다.
 */

(function() {
  console.log('=== 코드 블록 재처리 디버깅 시작 ===\n');

  // 1. 모든 코드 블록 찾기
  const codeBlocks = document.querySelectorAll('.highlight code, code.highlight, pre code');
  console.log(`발견된 코드 블록 수: ${codeBlocks.length}`);

  // 2. .token 클래스를 가진 요소 찾기
  const tokenElements = document.querySelectorAll('.token');
  console.log(`.token 클래스를 가진 요소 수: ${tokenElements.length}`);

  if (tokenElements.length > 0) {
    console.warn('⚠️ .token 클래스가 발견되었습니다! 이것은 Rouge가 생성하지 않는 클래스입니다.');
    console.log('첫 번째 .token 요소:', tokenElements[0]);
  }

  // 3. MutationObserver로 DOM 변경 감지
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.classList && node.classList.contains('token')) {
              console.warn('🚨 .token 클래스가 동적으로 추가되었습니다!');
              console.log('추가된 요소:', node);
              console.trace('스택 트레이스:');
            }
          }
        });
      }
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && target.classList.contains('token')) {
          console.warn('🚨 요소의 클래스가 .token으로 변경되었습니다!');
          console.log('변경된 요소:', target);
          console.trace('스택 트레이스:');
        }
      }
    });
  });

  // 모든 코드 블록 감시 시작
  codeBlocks.forEach((block) => {
    observer.observe(block, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });

  console.log('\n✅ MutationObserver가 활성화되었습니다.');
  console.log('코드 블록이 변경되면 콘솔에 경고가 표시됩니다.');
  console.log('\n5초 후 자동으로 종료됩니다. 계속 감시하려면 이 스크립트를 다시 실행하세요.');

  setTimeout(() => {
    observer.disconnect();
    console.log('\n⏹️ MutationObserver가 종료되었습니다.');
  }, 5000);

  // 4. 로드된 스크립트 확인
  console.log('\n=== 로드된 스크립트 확인 ===');
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const suspiciousScripts = scripts.filter(script => {
    const src = script.src.toLowerCase();
    return src.includes('prism') ||
           src.includes('highlight') ||
           src.includes('syntax') ||
           src.includes('shiki') ||
           src.includes('monaco');
  });

  if (suspiciousScripts.length > 0) {
    console.warn('⚠️ 의심스러운 스크립트가 발견되었습니다:');
    suspiciousScripts.forEach(script => console.log('  -', script.src));
  } else {
    console.log('✅ 의심스러운 스크립트가 발견되지 않았습니다.');
  }

  // 5. 전역 객체 확인
  console.log('\n=== 전역 객체 확인 ===');
  const globalObjects = ['Prism', 'hljs', 'shiki', 'monaco'];
  globalObjects.forEach(name => {
    if (window[name]) {
      console.warn(`⚠️ ${name}이(가) 전역 객체로 발견되었습니다:`, window[name]);
    }
  });

  console.log('\n=== 디버깅 완료 ===');
})();
