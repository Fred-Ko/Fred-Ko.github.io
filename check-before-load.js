// 페이지 로드 전에 실행되는 스크립트 확인
// 이 스크립트를 <head>에 넣어서 실행

(function() {
  console.log('=== 페이지 로드 전 확인 ===');
  console.log('현재 시간:', new Date().toISOString());

  // DOM이 로드되기 전에 실행되는지 확인
  if (document.readyState === 'loading') {
    console.log('✅ DOM이 아직 로드 중입니다.');
  }

  // 코드 블록 확인
  const checkCodeBlocks = () => {
    const codeBlocks = document.querySelectorAll('.highlight code');
    console.log(`코드 블록 수: ${codeBlocks.length}`);

    if (codeBlocks.length > 0) {
      const firstBlock = codeBlocks[0];
      const hasToken = firstBlock.querySelector('.token');
      const hasRouge = firstBlock.querySelector('.rouge-table');

      console.log('첫 번째 코드 블록:');
      console.log('  - .token 있음:', !!hasToken);
      console.log('  - .rouge-table 있음:', !!hasRouge);
      console.log('  - HTML (처음 200자):', firstBlock.innerHTML.substring(0, 200));
    }
  };

  // DOMContentLoaded 전에 확인
  if (document.readyState === 'loading') {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.highlight code')) {
        console.log('\n🚨 코드 블록이 DOM에 추가됨!');
        checkCodeBlocks();
        observer.disconnect();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    console.log('MutationObserver 시작 - 코드 블록 감시 중...');
  } else {
    checkCodeBlocks();
  }

  // DOMContentLoaded 이벤트 리스너
  document.addEventListener('DOMContentLoaded', () => {
    console.log('\n📄 DOMContentLoaded 이벤트 발생');
    checkCodeBlocks();
  });

  // load 이벤트 리스너
  window.addEventListener('load', () => {
    console.log('\n🌐 load 이벤트 발생');
    checkCodeBlocks();
  });
})();
