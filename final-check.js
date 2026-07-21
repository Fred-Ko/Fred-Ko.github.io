// 최종 확인: 실제 HTML 소스와 DOM 비교
// 브라우저 콘솔에서 실행

(async function() {
  console.log('=== 최종 확인: HTML 소스 vs DOM ===\n');

  // 1. 실제 HTML 소스 가져오기 (캐시 없이)
  const response = await fetch(window.location.href, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  const htmlText = await response.text();

  // 2. HTML 소스에서 코드 블록 찾기
  const sourceCodeMatch = htmlText.match(/<div class="highlight"><code[^>]*>([\s\S]{0,1000})/);
  let hasTokenInSource = false;

  if (sourceCodeMatch) {
    const sourceCode = sourceCodeMatch[1];
    hasTokenInSource = sourceCode.includes('token');
    const hasRougeInSource = sourceCode.includes('rouge-table');

    console.log('📄 HTML 소스 분석:');
    console.log('  - .token 있음:', hasTokenInSource);
    console.log('  - .rouge-table 있음:', hasRougeInSource);
    console.log('  - 처음 300자:', sourceCode.substring(0, 300));
  }

  // 3. DOM에서 확인
  const domCode = document.querySelector('.highlight code');
  if (domCode) {
    const hasTokenInDOM = !!domCode.querySelector('.token');
    const hasRougeInDOM = !!domCode.querySelector('.rouge-table');

    console.log('\n🌐 DOM 분석:');
    console.log('  - .token 있음:', hasTokenInDOM);
    console.log('  - .rouge-table 있음:', hasRougeInDOM);
    console.log('  - 처음 300자:', domCode.innerHTML.substring(0, 300));

    if (!hasTokenInSource && hasTokenInDOM) {
      console.warn('\n🚨 결론: HTML 소스에는 .token이 없지만 DOM에는 있습니다!');
      console.warn('이것은 확실히 클라이언트 사이드 변환입니다.');
      console.warn('\n가능한 원인:');
      console.warn('1. 브라우저 확장 프로그램 (시크릿 모드에서 확인 필요)');
      console.warn('2. 브라우저 자체 기능');
      console.warn('3. 매우 빠르게 실행되는 스크립트');
    } else if (hasTokenInSource && hasTokenInDOM) {
      console.warn('\n⚠️ HTML 소스에도 .token이 있습니다!');
      console.warn('이것은 서버 사이드에서 이미 변환된 것입니다.');
      console.warn('Jekyll 빌드 과정을 확인해야 합니다.');
    }
  }

  // 4. 시크릿 모드 안내
  console.log('\n💡 다음 단계:');
  console.log('1. 시크릿 모드에서 페이지 열기');
  console.log('2. 개발자 도구 콘솔에서 실행:');
  console.log('   document.querySelectorAll(".token").length');
  console.log('3. 결과가 0이면 확장 프로그램이 원인입니다.');
})();
