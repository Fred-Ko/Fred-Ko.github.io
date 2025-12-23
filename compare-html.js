// 브라우저 콘솔에서 실행: 실제 HTML 소스와 DOM 비교

console.log('=== HTML 소스 vs DOM 비교 ===\n');

// 실제 HTML 소스 가져오기
fetch(window.location.href)
  .then(r => r.text())
  .then(html => {
    // HTML 소스에서 코드 블록 찾기
    const sourceMatch = html.match(/<div class="highlight"><code[^>]*>([\s\S]{0,500})/);

    if (sourceMatch) {
      console.log('📄 HTML 소스의 코드 블록 (처음 500자):');
      console.log(sourceMatch[1].substring(0, 500));
    }

    // DOM에서 코드 블록 찾기
    const domCode = document.querySelector('.highlight code');
    if (domCode) {
      console.log('\n🌐 DOM의 코드 블록 (처음 500자):');
      console.log(domCode.innerHTML.substring(0, 500));

      // .token 클래스 확인
      const hasToken = domCode.querySelector('.token');
      if (hasToken) {
        console.warn('\n⚠️ DOM에 .token 클래스가 있지만 HTML 소스에는 없습니다!');
        console.log('이것은 클라이언트 사이드 변환을 의미합니다.');

        // 어떤 스크립트가 실행되었는지 확인
        console.log('\n📜 실행된 스크립트 목록:');
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        scripts.forEach((script, i) => {
          console.log(`${i + 1}. ${script.src}`);
        });
      } else {
        console.log('\n✅ DOM에도 .token 클래스가 없습니다.');
      }
    }
  })
  .catch(err => {
    console.error('에러:', err);
    console.log('\n대신 DOM만 확인합니다...');

    const domCode = document.querySelector('.highlight code');
    if (domCode) {
      console.log('DOM 코드 블록:', domCode.outerHTML.substring(0, 500));

      // .token이 있는지 확인
      if (domCode.querySelector('.token')) {
        console.warn('\n⚠️ .token 클래스 발견!');
        console.log('부모 체인:', domCode.closest('.highlight, .language-typescript'));
      }
    }
  });
