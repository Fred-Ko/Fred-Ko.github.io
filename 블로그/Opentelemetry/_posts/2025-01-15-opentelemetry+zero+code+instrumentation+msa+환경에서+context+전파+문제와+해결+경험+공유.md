---
title: Opentelemetry - Zero-Code Instrumentation MSA 환경에서 Context 전파 문제와 해결 경험 공유
datetime: 2025-01-15T10:08:53.430Z
tags:
  - graphql
  - zero-code-instrumentation
  - context-propagation
  - opentelemetry
  - instrumentation
  - tracing
  - distributed-tracing
  - http-instrumentation
  - graphql-federation
  - kafkajs
nanoId: LlkFX4sjBORTiJzZlamVN2CSB
permalink: /LlkFX4sjBORTiJzZlamVN2CSB/
---
## Intro

이번 글에서는 GraphQL Federation 환경에서 Zero-Code Instrumentation 방식으로 전환한 뒤 발생한 **Context 전파 문제**와 이를 해결한 경험을 구체적으로 공유하려 합니다. 이 글을 통해 유사한 문제를 겪는 분들에게 실질적인 도움이 되었으면 합니다.

---

### 문제 상황

GraphQL Federation 환경에서 다음과 같은 문제가 발생했습니다:

#### 1. Context 전파가 제대로 이루어지지 않음

- A -> B -> C 순으로 흐르는 트래픽이 **각각 독립적인 `root span`**으로 수집되고 있었습니다.
- 결과적으로 같은 요청임에도 불구하고 **같은 ********`traceId`********로 묶이지 않는 문제**가 발생했습니다.

#### 2. 문제 발생 환경

적용된 환경 변수는 다음과 같았습니다:

```
OTEL_SERVICE_NAME=my-service
OTEL_NODE_ENABLED_INSTRUMENTATIONS=graphql,kafkajs
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
OTEL_LOGS_EXPORTER=otlp
OTEL_EXPORTER_OTLP_LOGS_PROTOCOL=grpc
NODE_OPTIONS=--require @opentelemetry/auto-instrumentations-node/register
```

#### 3. 기존 방식과의 차이점

- 기존의 Code-based 방식에서는 Header Context를 명시적으로 전달하는 코드가 있었습니다.
- Zero-Code 방식으로 변경하면서 Context 전파에 문제가 발생한 것으로 보입니다.

#### 4. Context 전파 문제의 가능성

문제 원인은 크게 두 가지 가능성으로 나눌 수 있었습니다:

1. **서버와 서버 간 Context 전파 문제**
2. **서버 내부 Context 전파 문제**

---

### 문제 원인 분석

#### 1. 서버 간 Context 전파 문제 가능성 검토

- 로컬 환경에서 테스트한 결과, Grafana에 데이터가 정상적으로 수집되었습니다.
- 이를 통해 **Propagator**가 정상적으로 작동한다고 판단했습니다.
  - 참고로, 나중에 알게 된 사실로는 로컬 테스트 시 적용된 `OTEL_NODE_ENABLED_INSTRUMENTATIONS` 옵션이 실제 환경과 달랐습니다.

#### 2. 서버 내부 Context 전파 문제로 가정

- 서버 내부의 트래픽 전파 흐름은 다음과 같았습니다:
  - **HTTP -> GraphQL -> KafkaJS**
- `OTEL_NODE_ENABLED_INSTRUMENTATIONS` 설정을 `graphql,kafkajs`로만 했을 때, **GraphQL Instrumentation이 HTTP Context를 자동으로 가져올 것**으로 기대했으나:
  - `root span`으로 수집되는 문제를 통해 HTTP Instrumentation에서 Context를 가져오지 못한다고 판단했습니다.

#### 3. 문제 해결 접근법

- `OTEL_NODE_ENABLED_INSTRUMENTATIONS` 설정을 기존 `graphql,kafkajs`에서 **`http,graphql,kafkajs`********로 확장**한 뒤 테스트를 진행했습니다.

---

### 문제 해결 및 결과

- `OTEL_NODE_ENABLED_INSTRUMENTATIONS` 변경 후:
  - **Span이 같은 ********`traceId`********로 묶여 Grafana에 표시되는 것**을 확인했습니다.
- 결과적으로, HTTP Instrumentation이 추가되면서 Context 전파 문제가 해결되었습니다.

### 결론

#### 1. Context 전파와 복원의 중요성

- Trace를 설정할 때, Context가 올바르게 전파되고 복원되는지 확인하는 것이 핵심입니다.
- 특히 Zero-Code Instrumentation 방식에서는 Instrumentation 계층 간의 Context 전달을 명확히 이해해야 합니다.

#### 2. 환경 변수 검증의 필요성

- Zero-Code Instrumentation에서는 **환경 변수 설정이 적절한지 반복적으로 검증**해야 합니다.

#### 3. 문제 해결의 과정

- 계층별로 Context가 어디서부터 어떻게 전달되는지 확인하는 과정이 중요합니다.
- 이번 경험을 통해, HTTP Instrumentation이 필수적인 상황임을 알게 되었습니다.

---

## 마무리

Trace를 구현할 때 Context의 전파와 복원은 매우 중요한 요소입니다. 특히 계측하고자 하는 각 레이어가 어디에서 Context를 전달받아야 하는지 신중하게 검토해야 합니다. 이 글이 유사한 문제를 겪고 계신 분들에게 도움이 되기를 바랍니다.