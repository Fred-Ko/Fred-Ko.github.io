---
title: Fast Node Manager (Nvm Alternative)
datetime: 2024-12-22T17:11:52.266Z
tags:
  - node-js
  - fast-node-manager
  - nvm
  - volta
  - node-js-version-management
  - rust-based-tools
  - shell-based-tools
  - linux-environment
  - macos-environment
  - windows-support
nanoId: ewIpCLwxS9u7f6iptneNLTbiF
permalink: /ewIpCLwxS9u7f6iptneNLTbiF/
---
## Intro

Node.js 프로젝트를 관리할 때 다양한 버전의 Node.js를 요구하는 상황에 자주 직면합니다. 대부분의 개발자들이 **nvm**을 사용하며 시작하지만, 저 역시 더 나은 대안을 찾기 위해 여러 도구를 시도한 끝에 **fnm (Fast Node Manager)** 으로 정착하게 되었습니다.

---

### Volta와 nvm의 문제점 직면

Linux와 macOS 환경 모두에서 개발을 진행하고 있습니다. 두 운영체제에서 모두 원활하게 동작하는 것이 중요했는데, nvm은 macOS에서 여러 번 재설치하고 `.zshrc` 파일을 수정했음에도 `nvm use` 명령어가 제대로 작동하지 않는 문제가 발생했습니다. 대안으로 Volta를 사용해 보았지만, Linux 환경의 cursor ide 환경에서 `node` 명령어가 제대로 작동하지 않았습니다. Volta의 코드를 살펴본 결과, 심볼릭 링크 구조로 인해 다양한 환경에 대한 고려가 부족한 것으로 추정됩니다. 반면 fnm은 두 환경 모두에서 문제없이 작동했고, 문서를 확인해본 결과 다양한 장점이 있었습니다.


---

### fnm을 선택한 이유

Volta의 문제를 해결하기 위해 대안을 찾던 중, **fnm**이라는 도구를 발견했습니다. 처음에는 속도와 간단한 설정만 보고 시도했지만, 결과적으로 주요 Node.js 관리 도구로 정착하게 되었습니다. 무엇보다 nvm 기반에서 전환시 호환성 때문에 바로 적용이 가능한 부분이 최고의 장점입니다.

---

### nvm vs Volta vs fnm
|   **특징**   |                  **nvm**                  |                **Volta**                 |              **fnm**              |
| :--------: | :---------------------------------------: | :--------------------------------------: | :-------------------------------: |
| **설정 파일**  |                 `.nvmrc`                  |         `package.json`의 `volta`          |             `.nvmrc`              |
|   **속도**   |        쉘 기반으로 동작하여  상대적으로 느릴 수 있음         |          Rust로 구현되어  빠른 성능을 제공함          |      Rust로 구현되어  빠른 성능을 제공함       |
| **도구 관리**  |                  Node.js                  | Node.js뿐만 아니라  Yarn, npm 등  다양한 도구 관리 가능 |              Node.js              |
|  **호환성**   | Unix 기반 시스템에서  주로 사용되며,  Windows 지원은 제한적임 |    Windows와 Unix  기반 시스템  모두에서 사용 가능     | Windows와 Unix  기반 시스템  모두에서 사용 가능 |
| **설치 용이성** |         설치 및 환경 설정에  추가적인 단계가 필요함         |      설치 과정이 간단하며,  추가 설정이  최소화되어 있음      |  설치 과정이 간단하며,  추가 설정이  최소화되어 있음   |
| **자동 전환**  |    `.nvmrc` 파일 기반으로  추가 설정 시  자동 전환 가능    |      디렉토리 이동 시  자동으로 Node.js  버전 전환      |  디렉토리 이동 시  자동으로 Node.js  버전 전환   |

---

### fnm의 대표적인 사용 시나리오

fnm은 빠르고 간편한 Node.js 버전 관리를 위해 설계되었습니다. nvm과의 높은 호환성을 바탕으로 기존 nvm 사용자도 쉽게 전환할 수 있습니다. 다음은 fnm의 대표적인 사용 시나리오와 명령어 예시입니다.

* **Node.js 버전 설치:**

```bash
fnm install 16
```

위 명령어는 Node.js v16을 설치합니다.  원하는 버전을 직접 입력하면 됩니다.

* **Node.js 버전 사용:**

```bash
fnm use 16
```

현재 디렉토리의 `.nvmrc` 파일을 참조하여 버전을 자동으로 설정합니다.


* **설치된 Node.js 버전 목록 확인:**

```bash
fnm list
```

또는

```bash
fnm ls
```

위 명령어는 로컬에 설치된 모든 Node.js 버전을 나열합니다.

* **Node.js 버전 제거:**

```bash
fnm uninstall 16
```

위 명령어는 Node.js v16을 제거합니다.

* **전역 Node.js 버전 설정 (기본 버전 설정):**

```bash
fnm use --default 18
```

위 명령어는 기본적으로 사용할 Node.js 버전을 v18로 설정합니다.  `fnm default 18` 과 같이 사용할 수도 있습니다.

* **현재 Node.js 버전 확인:**

```bash
fnm current
```

위 명령어는 현재 사용중인 Node.js 버전을 출력합니다.

* **원격 Node.js 버전 목록 확인:**

```bash
fnm ls-remote
```

또는

```bash
fnm list-remote
```

위 명령어는 원격 저장소에서 사용 가능한 모든 Node.js 버전을 나열합니다.


fnm은 `.nvmrc` 파일을 사용하여 프로젝트별 Node.js 버전을 관리하기 때문에, nvm 사용자라면 익숙한 방식으로 fnm을 사용할 수 있습니다. 이는 fnm의 가장 큰 장점 중 하나이며, 기존 프로젝트의 설정을 변경할 필요 없이 fnm으로 원활하게 전환할 수 있음을 의미합니다. 또한, Rust 기반으로 개발되어 기존의 shell 기반 도구보다 훨씬 빠른 속도를 제공합니다.

---

### 결론: fnm 으로의 전환

Volta는 강력하고 유용한 도구지만, 개인적으로 경험한 환경적 제약과 사용성의 한계로 인해 **fnm**으로 전환하게 되었습니다.  
fnm은 빠르고 간단하며, nvm과의 호환성 덕분에 기존 프로젝트에서도 문제없이 사용할 수 있습니다.  
Node.js 버전 관리 도구를 고민 중이라면, fnm을 한 번 시도해보세요.  
빠르고 직관적인 경험에 만족할 겁니다. 🚀