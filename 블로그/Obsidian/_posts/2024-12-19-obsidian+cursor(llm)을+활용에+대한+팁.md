---
title: Obsidian - Cursor(LLM)을 활용에 대한 팁
datetime: 2024-12-19T13:58:37.030Z
nanoId: w1fGIy5OgbcqoYV4nvqRsHJZS
tags:
  - large-language-model
  - obsidian
  - cursor
  - artificial-intelligence
  - productivity
  - blog-writing
  - context-management
  - open-with-plugin
  - chat-function
  - composer-function
permalink: /w1fGIy5OgbcqoYV4nvqRsHJZS/
---
### Obsidian - Cursor(LLM)을 활용에 대한 팁

---

최근 LLM(Large Language Model)을 활용한 작업이 점점 더 다양해지고 있습니다. 저 또한 블로그를 작성하면서 모든 과정을 수작업으로 처리하는 비효율성에 한계를 느껴, LLM을 적극적으로 활용하는 방법을 모색하고 있습니다. 블로그 작성의 본질인 정보 전달과 학습 정리에만 초점을 맞추고, 보다 효율적으로 작업을 진행하기 위해 Cursor를 사용하고 있습니다.
이 글에서는 Cursor와 Obsidian을 함께 활용하며 블로그를 작성하는 팁을 공유하려 합니다.

---

### Obsidian에서 Cursor를 활용하는 기본 설정

Cursor가 처음 등장했을 때부터 Obsidian과 함께 사용하며 생산성을 높이고 있었습니다. 처음에는 이를 개인적으로만 사용했지만, 최근 Obsidian에 Cursor를 활용하는 관련된 유튜브 강좌들이 많아지며 비슷한 활용법이 많이 알려졌습니다. 이제는 제가 추가로 발견한 효율적인 방법을 공유하고자 합니다.
참고 - [# 옵시디언의 노트를 Cursor AI에 활용하기(RAG 쉽게하는 방법)](https://www.youtube.com/watch?v=60zNMCINesg&t=540s)

#### Open With 플러그인 설치


![](assets/img/pasted-image-20241214234112.webp)


- **플러그인 주소:** [Open With 플러그인](https://github.com/phibr0/obsidian-open-with)  
   이 플러그인은 Obsidian에서 파일을 우클릭하여 원하는 프로그램으로 열 수 있게 해주는 플러그인입니다. 처음에는 직접 개발을 고려했지만, 검색해보니 이미 원하는 플러그인이 있어서 만족하면서 활용하고 있습니다.

##### Open With 설정 및 사용법


![](assets/img/pasted-image-20241214214605.webp)


1. Open With 플러그인에 Cursor를 등록합니다.
2. Obsidian에서 파일이나 폴더를 우클릭하고 **"Open With Cursor"**를 선택합니다.
3. Cursor에서 열려 있는 파일로 바로 작업을 시작합니다.

---

### Cursor를 활용한 글 작성 팁

Cursor는 **Chat**과 **Composer** 기능을 통해 글을 빠르게 구조화하고 수정할 수 있는 강력한 도구입니다. 기본적인 사용법은 Cursor의 공식 문서나 유튜브 강좌에서 충분히 다뤄지고 있으므로, 이 글에서는 한 단계 더 나아간 Context 설정 팁을 중점적으로 소개하겠습니다.

---

### Context 제한의 필요성

LLM은 컨텍스트 크기가 증가할수록 성능이 점차 저하되는 경향이 있습니다. ([관련 논문](https://arxiv.org/html/2406.10149v1)) 따라서 다음과 같은 방식으로 컨텍스트를 제한하면 최적의 성능을 얻을 수 있습니다.

#### 컨텍스트 관리 팁

- **현재 파일 기준:** 기본적으로 열려 있는 파일만을 컨텍스트로 사용합니다.
- **특정 폴더 기준:** Open in New Window로 컨텍스트를 폴더 단위로 제한합니다.
- **전체 Codebase 기준:** Ctrl + Enter를 이용해 프로젝트 루트에서 전체 Codebase를 컨텍스트로 삼을 수 있습니다.

---

### Context 최적화: Open in New Window 활용법

Cursor의 Chat 기능은 기본적으로 현재 파일을 컨텍스트로 자동 지정합니다. 그러나 작업 환경에 따라 파일이나 폴더 단위로 컨텍스트를 제한할 수 있습니다. 이 과정에서 **Open in New Window** 확장이 큰 도움을 줍니다.

#### Open in New Window 설치 및 사용

1. Cursor의 확장 메뉴에서 **Open in New Window**를 검색하여 설치합니다.
2. 파일이나 폴더를 우클릭하고 **"Open in New Window"**를 실행합니다.
3. 특정 Depth의 폴더로 Codebase를 제한하여 작업 시 컨텍스트를 명확히 설정합니다.
4.

---

### 결론

Cursor와 Obsidian을 함께 사용하면 블로그 작성 과정에서 시간을 절약하고 효율성을 극대화할 수 있습니다. 특히, 컨텍스트를 적절히 관리하고 Open in New Window 기능을 활용하여 작업의 초점을 맞춘다면, 더욱 높은 품질의 결과를 얻을 수 있습니다.

Cursor의 활용법을 여러분의 작업 방식에 맞게 조정해 보고, 더 나은 작업 흐름을 만들어 보세요!