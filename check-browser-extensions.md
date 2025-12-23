# 브라우저 확장 프로그램 확인 방법

## Chrome/Edge 브라우저

1. **확장 프로그램 페이지 열기**
   - 주소창에 `chrome://extensions/` 입력 (Edge는 `edge://extensions/`)
   - 또는 메뉴 → 확장 프로그램 → 확장 프로그램 관리

2. **의심스러운 확장 프로그램 찾기**
   - 코드 하이라이팅 관련 확장
   - 마크다운 뷰어 확장
   - 개발자 도구 확장
   - GitHub 관련 확장

3. **확장 프로그램 일시 비활성화**
   - 각 확장 프로그램의 토글을 끄고 페이지 새로고침
   - `.token` 클래스가 사라지는지 확인

## Firefox 브라우저

1. **확장 프로그램 페이지 열기**
   - 주소창에 `about:addons` 입력
   - 또는 메뉴 → 부가 기능

2. **확장 프로그램 확인 및 비활성화**

## Safari 브라우저

1. **Safari → 환경설정 → 확장 프로그램**

## 확인할 확장 프로그램 예시

- **GitHub 관련**: GitHub 코드 뷰어, GitHub 확장 프로그램
- **코드 하이라이팅**: Prism.js, Highlight.js 관련 확장
- **마크다운**: Markdown 뷰어, Markdown 편집기
- **개발자 도구**: React DevTools, Vue DevTools 등

## 빠른 확인 방법

브라우저 콘솔에서 실행:

```javascript
// 모든 확장 프로그램이 주입한 스크립트 확인
console.log('확장 프로그램 스크립트:',
  Array.from(document.querySelectorAll('script[src]'))
    .map(s => s.src)
    .filter(src => src.includes('extension') || src.includes('chrome-extension'))
);
```
