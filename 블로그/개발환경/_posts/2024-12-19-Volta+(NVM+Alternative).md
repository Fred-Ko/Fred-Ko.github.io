---
title: Volta (NVM Alternative)
datetime: 2024-12-19T01:38:37.743Z
tags:
  - node-js
  - volta
  - nvm
  - node-version-management
  - cross-platform-support
  - automatic-version-switching
  - fast-speed
  - tool-management
  - package-json
  - development-environment
nanoId: YGBY1KdZ7ykvFQ7qxrQXPy7Zm
permalink: /YGBY1KdZ7ykvFQ7qxrQXPy7Zm/
---
## Intro

Node.js 환경에서 개발할 때, 프로젝트별로 Node 버전을 관리하기 위해 주로 nvm을 사용했었습니다.
하지만 회사 맥북에서 nvm으로 LTS 버전을 설치하고 `.nvmrc` 파일에 명시해도, `nvm install` 실행 시 제대로 설치되지 않는 버그가 발생했습니다. 이로 인해 사용성이 크게 떨어지는 경험을 하게 되었죠.

이 문제의 대안을 찾던 중 **Volta**를 발견했습니다. 속도가 빠르다는 장점도 있지만, 무엇보다 눈에 띄는 기능은 **자동 전환 기능**이었습니다.
그럼 이제 Volta에 대해 자세히 알아보겠습니다.

## Volta와 NVM 비교

|   **특징**   |                **NVM**                 |            **Volta**            |
| :--------: | :------------------------------------: | :-----------------------------: |
| **설정 파일**  |       `.nvmrc` 파일로 Node.js 버전 지정       | `package.json`의 `volta` 섹션에 설정  |
| **버전 전환**  |          `nvm use` 명령어로 수동 전환          |         디렉토리 이동 시 자동 전환         |
|   **속도**   |         Node.js 버전 로드 시 시간이 걸림         |           즉각적인 버전 전환            |
| **도구 관리**  |    Node.js만 관리 가능, 추가 도구는 별도 설정 필요     |   Yarn, npm 등 다양한 도구 버전 관리 가능   |
| **설치 용이성** |         셸 프로파일 설정 필요, 초기 설정 복잡         |        간단한 설치 및 자동 설정 제공        |
| **지원 플랫폼** | Unix 기반 환경에서 주로 사용, Windows는 비공식 포크 사용 | Windows와 Unix 기반 환경 모두에서 원활히 동작 |
| **사용 편의성** |        프로젝트 디렉토리 변경 시 명령어 실행 필요        |       디렉토리 변경 시 자동 설정 적용        |

## Volta의 주요 장점

1. **자동 버전 전환:** 프로젝트 디렉토리를 이동할 때 Node.js 및 도구의 버전을 자동으로 전환해주어 개발자가 별도의 명령어를 입력하지 않아도 됩니다.

2. **Cross-Platform 지원:** Windows 사용자도 별도의 설정 없이 Volta를 설치하고 사용할 수 있습니다.

3. **빠른 속도:** Volta는 고속으로 Node.js와 도구를 로드하며, 생산성을 높입니다.

4. **추가 도구 관리:** Yarn, npm, 기타 CLI 도구 버전까지 프로젝트별로 통합 관리할 수 있습니다.

## Volta의 대표적인 사용 시나리오

### 1. 프로젝트별 Node.js 버전 관리

프로젝트마다 Node.js 버전이 다른 경우, Volta를 사용하면 매우 간단합니다. `package.json`에 원하는 Node.js 버전을 명시하면 끝입니다.

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "volta": {
    "node": "18.17.0",
    "yarn": "1.22.22"
  }
}
```

프로젝트 디렉토리로 이동하면 Volta가 자동으로 해당 버전을 활성화합니다.

### 2. 글로벌 Node.js 버전 관리

Volta를 사용하면 글로벌 Node.js 버전을 쉽게 설정할 수 있습니다.

```bash
volta install node@18
```

이 명령어를 실행하면 Node.js 18 버전이 글로벌 기본값으로 설정됩니다.

### 3. 팀 개발 환경 통일

팀 프로젝트에서 동일한 환경을 유지해야 할 때, Volta의 `package.json` 설정은 큰 도움이 됩니다. 모든 팀원이 동일한 Node.js와 도구 버전을 사용하도록 보장할 수 있습니다.

```json
{
  "name": "team-project",
  "version": "2.0.0",
  "volta": {
    "node": "16.20.0",
    "npm": "8.15.0"
  }
}
```

### 4. 빠른 도구 설치

Volta를 통해 Yarn과 같은 도구를 빠르게 설치할 수 있습니다.

```bash
volta install yarn
```

설치한 도구는 프로젝트에 따라 자동으로 버전이 관리됩니다.

## 결론

항상 공식처럼 nvm만 사용하다가 대안을 찾고나니 왜 진작에 안찾아봤나 후회가 됩니다. 정말 편하네요.
다른 것들도 이처럼 의심하지 않고 받아들인 무언가가 있나 한번 찾아봐야겠습니다.