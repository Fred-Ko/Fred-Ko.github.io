// 브라우저 콘솔에서 실행: 코드 블록을 변환하는 스크립트 찾기

console.log('=== 코드 블록 변환 스크립트 찾기 ===\n');

// 1. 모든 함수 오버라이드 감지
const originalQuerySelector = document.querySelector;
const originalQuerySelectorAll = document.querySelectorAll;

let querySelectorCallCount = 0;
let querySelectorAllCallCount = 0;

document.querySelector = function(...args) {
  querySelectorCallCount++;
  const result = originalQuerySelector.apply(this, args);
  if (args[0] && args[0].includes('code') && querySelectorCallCount < 10) {
    console.log('querySelector 호출:', args[0], new Error().stack.split('\n')[2]);
  }
  return result;
};

document.querySelectorAll = function(...args) {
  querySelectorAllCallCount++;
  const result = originalQuerySelectorAll.apply(this, args);
  if (args[0] && args[0].includes('code') && querySelectorAllCallCount < 10) {
    console.log('querySelectorAll 호출:', args[0], new Error().stack.split('\n')[2]);
  }
  return result;
};

// 2. innerHTML/outerHTML 변경 감지
const codeBlocks = document.querySelectorAll('.highlight code');
console.log(`발견된 코드 블록: ${codeBlocks.length}개`);

codeBlocks.forEach((block, i) => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        console.warn(`🚨 코드 블록 #${i} 변경됨!`, mutation);
        console.trace();
      }
    });
  });

  observer.observe(block, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  console.log(`코드 블록 #${i} 감시 시작`);
});

console.log('\n✅ 감시 활성화됨. 페이지를 새로고침하면 변경 사항이 기록됩니다.');
console.log('10초 후 자동 종료됩니다.');

setTimeout(() => {
  document.querySelector = originalQuerySelector;
  document.querySelectorAll = originalQuerySelectorAll;
  console.log('\n⏹️ 감시 종료');
}, 10000);
