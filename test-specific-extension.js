// 특정 확장 프로그램이 코드 블록을 변환하는지 확인
// 브라우저 콘솔에서 실행

console.log('=== 확장 프로그램 영향 확인 ===\n');

// 1. 확장 프로그램이 주입한 스크립트/스타일 확인
const extensionScripts = Array.from(document.querySelectorAll('script[src]'))
  .filter(s => {
    const src = s.src;
    return src.includes('chrome-extension://') ||
           src.includes('moz-extension://') ||
           src.includes('safari-extension://') ||
           src.includes('extension');
  });

const extensionStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
  .filter(s => {
    const href = s.href || '';
    const text = s.textContent || '';
    return href.includes('chrome-extension://') ||
           href.includes('moz-extension://') ||
           text.includes('token') ||
           text.includes('prism');
  });

console.log('확장 프로그램 스크립트:', extensionScripts.length, '개');
extensionScripts.forEach(s => console.log('  -', s.src));

console.log('\n확장 프로그램 스타일:', extensionStyles.length, '개');
extensionStyles.forEach(s => console.log('  -', s.href || 'inline style'));

// 2. 전역 객체 확인
console.log('\n=== 전역 객체 확인 ===');
const suspiciousKeys = Object.keys(window).filter(key => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('adguard') ||
         lowerKey.includes('adblock') ||
         lowerKey.includes('prism') ||
         lowerKey.includes('highlight');
});

if (suspiciousKeys.length > 0) {
  console.warn('⚠️ 의심스러운 전역 객체:');
  suspiciousKeys.forEach(key => {
    console.log(`  - window.${key}:`, typeof window[key]);
  });
} else {
  console.log('✅ 의심스러운 전역 객체 없음');
}

// 3. 코드 블록 상태 확인
console.log('\n=== 코드 블록 상태 ===');
const codeBlocks = document.querySelectorAll('.highlight code');
console.log(`코드 블록 수: ${codeBlocks.length}`);

if (codeBlocks.length > 0) {
  const firstBlock = codeBlocks[0];
  const hasToken = firstBlock.querySelector('.token');
  const hasRouge = firstBlock.querySelector('.rouge-table');

  console.log('첫 번째 코드 블록:');
  console.log('  - .token 있음:', !!hasToken);
  console.log('  - .rouge-table 있음:', !!hasRouge);

  if (hasToken && !hasRouge) {
    console.warn('\n⚠️ Rouge 구조가 없고 .token만 있습니다!');
    console.log('이것은 확실히 변환된 것입니다.');
  }
}

// 4. AdGuard 특별 확인
if (window.adguard || window.Adguard) {
  console.warn('\n⚠️ AdGuard가 감지되었습니다!');
  console.log('AdGuard 객체:', window.adguard || window.Adguard);
}

console.log('\n=== 확인 완료 ===');
console.log('\n💡 팁: 시크릿 모드에서 페이지를 열어보세요.');
console.log('   시크릿 모드에서 .token이 사라지면 확장 프로그램이 원인입니다.');
