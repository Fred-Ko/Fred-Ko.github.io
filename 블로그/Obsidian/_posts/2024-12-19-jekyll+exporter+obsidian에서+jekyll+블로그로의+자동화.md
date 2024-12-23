---
title: Jekyll Exporter Obsidian에서 Jekyll 블로그로의 자동화
datetime: 2024-12-17T09:28:56.253Z
nanoId: 6crS1GYctcBpj1m9HPZck9mLg
permalink: /6crS1GYctcBpj1m9HPZck9mLg/
tags:
  - jekyll
  - obsidian
  - markdown
  - front-matter
  - plugin
  - openai
  - automation
  - blogging
  - note-taking
  - productivity
---
## 들어가며

최근 Obsidian을 사용하면서 제 노트가 점점 체계적으로 정리되는 것을 느꼈습니다. 특히 마크다운 파일의 유연함 덕분에 글쓰기에 더 많은 시간을 쏟을 수 있었죠. 하지만 문제는 여기서부터였습니다. Jekyll로 블로그를 운영하다 보니, Obsidian에서 작성한 글을 블로그로 옮기는 과정이 생각보다 번거로웠습니다.

- 파일을 `_posts` 폴더로 옮기고,
- 파일 이름을 `YYYY-MM-DD-title.md` 형식으로 바꾸고,
- 프론트 매터(Front Matter)를 추가하고,
- 내부 링크를 수정하고,
- 이미지를 따로 복사해 경로를 맞추는 지루한 작업

이 모든 과정이 글쓰기와 블로그 운영의 흐름을 끊는다고 느꼈습니다. 단순한 작업이지만, 반복될수록 귀찮아지는 일이죠. 그래서 이런 수작업을 대신할 **Jekyll Exporter**를 만들기로 했습니다.

## **플러그인을 만들자**

"비싼 obsidian publish만큼 편하게 포스팅 할 수 없을까?" 블로그 작성하는 시간에 하나라도 더 공부해서 머리속에 넣자 라는 생각을 가지던 나에게 블로그를 작성하는 외적인 시간 예를들면 테마나 가독성좋게 블로그를 꾸미는 작업을 하는 나자신을 인지하는 순간 현타가 쎄게 왔습니다. 월 10$를 결제하기로 했을때 마음은 나는 시간을 샀다였는데....

## **만들면서 고민했던 부분**

플러그인을 만들면서 "무조건 간단한 프로세스로 빠르게 포스팅 해야 한다." 를 최우선 요구사항으로 플러그인 제작을 시작하였습니다.

1. **프론트 매터 자동 생성**  
   파일을 내보낼 때 매번 제목, 날짜, 태그를 수작업으로 입력하는 것은 비효율적이었습니다. 그래서 설정 탭에서 사용자 정의 템플릿을 제공하고, 자동으로 프론트 매터를 추가하도록 만들었습니다.
2. **중복 파일 관리**
   
![](assets/img/pasted-image-20241211013304.png){:width="390px"}

   블로그에 같은 이름의 파일이 있을 경우, 무작정 덮어쓰는 것이 아니라, 덮어쓸지 취소할지 선택할 수 있도록 모달 창을 추가했습니다. 기존 파일을 안전하게 유지하면서도 업데이트할 수 있도록 했습니다.
3. **OpenAI를 활용한 자동 태그 생성**  
	
![](assets/img/pasted-image-20241217222608.webp)

   태그를 생성하는 것도 생각보다 고민이 되는 작업입니다. 그래서 OpenAI API를 사용해 콘텐츠에서 자동으로 태그를 생성하도록 했습니다. 제가 직접 태그를 고민하는 시간을 줄이고, 자동으로 추천 받은 태그를 수정만 하면 되니 훨씬 편리했습니다.
4. **이미지와 링크 처리**
   
![](assets/img/pasted-image-20241217222707.webp){:width="460px"}

   이미지를 따로 복사하고 링크를 수정하는 작업도 번거로운 일이었습니다. 이제는 Obsidian 파일에 첨부된 이미지를 지정된 Jekyll 폴더로 자동 복사하고, 링크를 블로그에서 제대로 작동하도록 변환할 수 있게 되었습니다.
   특히 Obsidian 에서 이미지 크기를 조절하면 파일명에 크기가 포함되어 버리는데 이것을 어떻게 반영할까 고민을 했었습니다.
   Jekyll에서 kramdown을 md 엔진으로 사용하는데 {:width="820px"} 와 같이 크기 조절이 가능한 옵션이 있어서 kramdown으로 변환하도록 하여 크기조절 문제도 해결하였습니다.
5. **문서의 고유 식별자와 permalink를 통해 url friendly 하게 만들기**  
   
![](assets/img/pasted-image-20241217222410.webp)

   기존에는 /posts/{title} 이런 형식으로 변환이 되었는데 문서에 한글이 들어가니 url에 한글이 그대로 노출되고 공백도 문제가 있었습니다.
   프론트매터에 nanoId와 permalink를 nanoId로 생성하여 jekyll 옵션으로 permalink를 url friendly 하게 만들 수 있었습니다.
   nanoId가 변경되면 기존에 링크를 저장한게 망가지는 문제점은 export시 이미 파일이 존재하고 nanoId와 permalink가 존재하는 경우 보존하도록 구현했습니다.

## **어떻게 사용하나요?**

1. [obsidian-jekyll-exporter](https://github.com/Fred-Ko/obsidian-jekyll-exporter) 에서 플러그인을 다운로드합니다.
2. 터미널에서 `npm run build` 명령어를 실행합니다.
3. Obsidian 플러그인 폴더에 **obsidian-jekyll-exporter** 라는 이름의 폴더를 생성합니다.
4. 다음 세 가지 파일을 생성한 폴더에 복사합니다:
   - `styles.css`
   - `main.js`
   - `manifest.json`
5. Obsidian을 종료한 후 다시 실행합니다.
6. 설정 -> 커뮤니티 플러그인에 들어가서 활성화 해주세요.

## **결론**

아직 등록은 못했지만 beta 버전으로서 테스트 중인데 꽤 만족하고 있습니다. 저처럼 Obsidian을 사용하면서 Jekyll 블로그를 운영하는 사람이라면 이 플러그인이 분명 시간을 절약해줄 겁니다. 특히, 저처럼 현타를 느끼는 분들에게 추천합니다.