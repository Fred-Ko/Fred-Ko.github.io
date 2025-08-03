---
title: Vault 이전을 위한 HashiCorp Vault MCP 서버 개발
datetime: 2025-08-03T19:53:07.569Z
tags:
  - kubernetes
  - hashicorp-vault
  - secret-management
  - mcp-server
  - crud-operations
  - bulk-operations
  - transaction-management
  - dry-run-functionality
  - yaml-dump-import
  - devops-tools
nanoId: VdstsXHwadn7TgXzGkhxdVLrk
permalink: /VdstsXHwadn7TgXzGkhxdVLrk/
---
## Intro

쿠버네티스 클러스터를 새로 이전하면서 기존 자원을 안전하게 이관해야 했다. Stateful 서비스 중 HashiCorp Vault의 시크릿 마이그레이션이 가장 까다로웠다. 과거에는 스크립트로 대응했지만, 이번에는 "Vault MCP 서버"라는 전용 도구를 개발했다. 이 접근은 운영 리스크를 구조적으로 줄이는 데 초점을 맞췄고, 결과는 만족스러웠다. 이 글에서 MCP 서버의 개발 배경, 핵심 기능, 그리고 시행착오와 배운 점을 공유한다.

## MCP 서버 선택의 배경

선택지는 명확했다:

1. 스크립트: 빠르고 간편하지만, 장기 유지보수가 어렵다.
2. MCP 서버: 초기 비용은 크지만, 유연성과 재사용성이 높다.

운영 현실을 고려하면 스크립트의 한계가 컸다. 시크릿 수정 시 실수 위험이 높고, 관리 복잡도도 증가한다. "인간 개입을 최소화"하는 도구가 필요했다. Infisical의 Secret Referencing 모델이 이상적이지만, 현재 환경에서는 MCP 서버가 과도기를 메우는 최적의 선택이었다. MCP 서버는 도메인 특화 명령어를 통해 대량 시크릿 처리와 구조 변환을 안전하게 지원한다.

## 초기 설계

초기 기능은 기본 CRUD로 시작했다:

- Create: 시크릿 생성
- Read: 시크릿 조회 및 검색
- Update: 시크릿 수정
- Delete: 시크릿 삭제

하지만 곧 한계에 부딪혔다:

- Vault 경로 전체를 파악하기 어렵다 → 재귀 탐색 필요
- 개별 호출이 비효율적이다 → 벌크 오퍼레이션 도입
- 부분 실패가 발생한다 → 트랜잭션 부재로 일관성 보장 어려움

이에 재귀 탐색과 벌크 기능을 추가했고, 벌크 작업의 실패 처리를 위해 Vault의 트랜잭션 미지원 문제를 클라이언트 측에서 해결하기로 했다.

## 가상 트랜잭션과 드라이런 구현

Vault가 트랜잭션을 제공하지 않으므로, "가상 트랜잭션"을 도입했다:

- 오퍼레이션을 논리 그룹으로 묶는다
- 실패 시 자동 롤백 경로를 계산한다
- 명확한 성공/실패 판단 기준을 제공한다

여기에 드라이런 기능을 붙여 실행 전 검증을 강화했다:

- 시뮬레이션으로 충돌, 권한, 유효성을 사전 점검
- 리스크와 영향 범위를 실행 전 수치화

결과적으로 벌크 + 가상 트랜잭션 + 드라이런의 결합은 운영 실패를 체계적으로 줄였다. 특히 수동 작업에서 반복되던 오류를 예방하는 데 유효했다.

## 파일 기반 덤프 & 임포트 기능 추가

MCP 서버는 AI가 자동으로 처리하다 보니 중간 과정을 확인하기 어려운 단점이 있었다. 이를 해결하기 위해 YAML 형식으로 시크릿을 덤프하고 이관하는 기능을 추가했다:

- Export: basePath 기준 YAML 추출
- Import: YAML 로드 후 Vault 적용(overwrite 옵션 지원)

Export 기능으로 시크릿을 YAML 파일로 추출하여 직접 검토한 후, 확인이 끝나면 Import로 적용하는 방식이다. 이를 통해 시크릿을 버전 관리하고 팀 검토를 거치는 워크플로우도 가능해졌다.

## 빠른 시작 가이드

### 설치

NPX를 통해 즉시 실행할 수 있습니다:

```bash
npx -y @fredko/vault-mcp-server
```

또는 글로벌 설치:

```bash
npm install -g @fredko/vault-mcp-server
```

### Cursor AI IDE에서 사용하기

MCP 설정 파일(`~/.config/Cursor/User/globalStorage/cursor.mcp/config.json`)에 다음을 추가:

```json
{
  "mcpServers": {
    "vault": {
      "command": "npx",
      "args": ["-y", "@fredko/vault-mcp-server"],
      "env": {
        "VAULT_TOKEN": "hvs.your-root-token",
        "VAULT_ADDR": "http://127.0.0.1:8200",
        "VAULT_ALLOW_READ": "true",
        "VAULT_ALLOW_WRITE": "true"
      }
    }
  }
}
```

### 사용 예시

AI에게 다음과 같이 요청하면 됩니다:

```text
# 시크릿 탐색
"secret/metadata/ 경로를 트리 구조로 보여주세요"

# 벌크 마이그레이션
"다음 시크릿들을 한 번에 새 경로로 복사해주세요:
- secret/data/old/app1 → secret/data/new/app1  
- secret/data/old/app2 → secret/data/new/app2"

# YAML 백업
"secret/data/production/ 경로를 ./backup.yaml로 내보내주세요"

# 안전한 트랜잭션
"사용자 데이터를 업데이트하되, 실패하면 자동으로 롤백해주세요:
1. secret/data/users/john을 새 데이터로 업데이트
2. secret/data/config에 마지막 업데이트 시간 기록"
```

## 느꼈던점

이번 프로젝트에서 얻은 인사이트:

1. **트랜잭션 기능의 어려움**: 실제 구현 난이도가 높고, 다양한 시나리오에서 엄밀해야 한다는걸 느꼈다.
2. **MVP의 힘**: 동작하는 최소한의 무언가를 빠르게 만들어두면, 이후 훨씬 다양한 옵션이 열린다.

## 아직 개선해야 할 점

- **가상 트랜잭션의 한계**: 네트워크 오류 등 비동기 리스크는 여전히 존재하므로, 롤백 정책을 더욱 강화해야 한다.
- **권한 관리**: 현재는 루트 토큰에 의존하고 있어, 세밀한 권한 제어 기능이 필요하다.

## 결론: LLM 시대에 개발자가 현명하게 일하는 방법

예전에는 필요한 걸 직접 개발하면 안정성과 시간 비용이 너무 커서, 우선 오픈소스 대안을 찾곤 했다. 하지만 지금은 간단한 요구사항이라면 LLM과 함께 직접 환경에 맞춰 개발하는 비용이 크지 않다.

이번 프로젝트는 약 3시간 만에 완성했고, 목표는 "현재 해결해야 하는 일을 최대한 빠르게 해결"하는 것이었다. 결과적으로 당장의 목표를 달성했을 뿐 아니라, 추후 요구사항까지 유연하게 커버할 수 있는 기반을 마련했다. 미래의 유지보수 비용과 리스크를 고려하면, 임시 스크립트 작성 시간을 넘어서는 충분한 투자 가치가 있었다.

이게 앞으로 LLM 시대에 개발자가 빠르게 적응 해나가야 하는 포인트가 아닐까 싶다.

---

**프로젝트 링크:**

- 소스 코드: <https://github.com/Fred-Ko/-Fredko/tree/master/vault-mcp>
- NPM 패키지: <https://www.npmjs.com/package/@fredko/vault-mcp-server>