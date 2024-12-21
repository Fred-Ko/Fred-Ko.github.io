---
title: Opentelemetry - AutoInstrumentation ( Nodejs )
datetime: 2024-12-21T21:02:25.950Z
tags:
  - opentelemetry
  - node-js
  - automatic-instrumentation
  - distributed-tracing
  - monitoring
  - performance
  - observability
  - docker-compose
  - grafana
  - environment-variables
nanoId: yjCxVy1uMGz5CUzypKY9rP4Mw
permalink: /yjCxVy1uMGz5CUzypKY9rP4Mw/
---
## Intro

현대 소프트웨어 개발 환경에서 애플리케이션의 성능과 안정성을 모니터링하는 것은 필수적입니다. 특히, 분산 시스템에서는 각 구성 요소의 상태를 실시간으로 추적하고 분석하는 것이 중요합니다. OpenTelemetry는 이러한 요구를 충족시키기 위한 강력한 도구로, 다양한 언어와 플랫폼에서 일관된 계측을 제공합니다.

OpenTelemetry의 계측 방식은 크게 수동 계측과 자동 계측으로 나뉩니다. 수동 계측은 개발자가 직접 코드를 수정하여 필요한 데이터를 수집하는 방식입니다. 반면, 자동 계측은 코드 변경 없이도 애플리케이션의 성능 데이터를 수집할 수 있는 방법을 제공합니다. 이 중에서도 'zero-code' 계측은 코드 변경을 최소화하면서 프로젝트에 OpenTelemetry를 적용할 수 있는 혁신적인 접근 방식입니다.

이번 블로그 포스트에서는 OpenTelemetry의 자동 계측 기능을 활용하여 Node.js 애플리케이션에 관측성을 추가하는 방법을 알아보겠습니다.

## 패키지 설치

자동 계측을 시작하기 위해 필요한 패키지를 설치합니다. 아래 명령어를 사용하여 `@opentelemetry/auto-instrumentations-node` 패키지를 프로젝트에 추가하세요. `env-cmd`는 환경 변수를 편리하게 적용하기 위한 도구입니다.

```bash
npm install --save env-cmd @opentelemetry/api @opentelemetry/auto-instrumentations-node
```


## Docker Compose

```yaml
name: otel

services:
  lgtm:
    image: grafana/otel-lgtm:latest
    environment:
      - ENABLE_LOGS_GRAFANA=true
      - ENABLE_LOGS_LOKI=true
      - ENABLE_LOGS_PROMETHEUS=true
      - ENABLE_LOGS_TEMPO=true
      - ENABLE_LOGS_OTELCOL=true
      - ENABLE_LOGS_ALL=true
    ports:
      - '3000:3000'
      - '4317:4317'
      - '4318:4318'
```

otel-lgtm 이미지는 collector, instrumentation 데이터 저장, 시각화를 하기 위한 grafana 제품의 all in one 이미지입니다.
로컬에서 테스트 해보기에는 필요한 모든 것들이 있어서 좋습니다.
```bash
docker compose up -d
```
실행한 다음에 localhost:3000 으로 접속하시면 grafana를 접속할 수 있습니다.

## 환경변수 설정

OpenTelemetry 자동 계측은 다양한 환경 변수를 통해 세밀하게 설정할 수 있습니다. `.env` 파일을 생성하고 아래와 같이 필요한 환경 변수들을 정의하여 애플리케이션의 모니터링 동작을 사용자 정의할 수 있습니다.

```bash (.env)
# OTEL_BSP_SCHEDULE_DELAY: Batch Span Processor가 데이터를 내보내기 전에 대기하는 시간(밀리초)을 설정합니다.
# 기본값: 5000 (5초)
# 예: 1000 (1초)
OTEL_BSP_SCHEDULE_DELAY=5000

# OTEL_BSP_MAX_QUEUE_SIZE: Batch Span Processor의 최대 대기열 크기를 설정합니다.
# 기본값: 2048
# 예: 1000
OTEL_BSP_MAX_QUEUE_SIZE=2048

# OTEL_BSP_MAX_EXPORT_BATCH_SIZE: 한 번에 내보낼 수 있는 최대 스팬(batch)의 크기를 설정합니다.
# 기본값: 512
# 예: 256
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512

# OTEL_BSP_EXPORT_TIMEOUT: 스팬 내보내기 작업의 타임아웃을 밀리초 단위로 설정합니다.
# 기본값: 30000 (30초)
# 예: 10000 (10초)
OTEL_BSP_EXPORT_TIMEOUT=30000

# OTEL_TRACES_EXPORTER: 추적 데이터를 내보낼 익스포터를 설정합니다.
# 가능한 값: "otlp", "zipkin", "jaeger", "console", "none"
# 기본값: "otlp"
OTEL_TRACES_EXPORTER="otlp"

# OTEL_EXPORTER_OTLP_ENDPOINT: OTLP 익스포터의 엔드포인트 URL을 설정합니다.
# 예: "http://localhost:4317" 또는 "https://otel-collector.example.com"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# OTEL_SERVICE_NAME: 서비스 이름을 지정하여 추적 데이터를 구분합니다.
# 예: "my-service", "backend-api", "frontend-app"
OTEL_SERVICE_NAME="your-service-name"

# OTEL_LOG_LEVEL: OpenTelemetry 로깅 수준을 설정합니다.
# 가능한 값: "debug", "info", "warn", "error"
# 기본값: "info"
OTEL_LOG_LEVEL="info"

# OTEL_NODE_RESOURCE_DETECTORS: 활성화할 리소스 감지기를 설정합니다.
# 가능한 값: "all", "env", "host", "os", "process", "service", "container", "k8s", "none"
# 기본값: "all"
OTEL_NODE_RESOURCE_DETECTORS="all"

# OTEL_NODE_ENABLED_INSTRUMENTATIONS: 활성화할 계측 라이브러리를 쉼표로 구분하여 지정합니다.
# 예: "http", "express", "mysql", "pg", "redis", "fs", "grpc"
# 기본값: 모든 지원되는 계측 활성화
OTEL_NODE_ENABLED_INSTRUMENTATIONS="http,express"

# OTEL_NODE_DISABLED_INSTRUMENTATIONS: 비활성화할 계측 라이브러리를 쉼표로 구분하여 지정합니다.
# 예: "http", "express", "mysql", "pg", "redis", "fs", "grpc"
# 기본값: 없음
OTEL_NODE_DISABLED_INSTRUMENTATIONS="fs,grpc"

# OTEL_TRACES_SAMPLER: 샘플링 전략을 설정합니다.
# 가능한 값: "always_on", "always_off", "traceidratio"
# 기본값: "always_on"
OTEL_TRACES_SAMPLER="always_on"

# OTEL_TRACES_SAMPLER_ARG: 샘플링 전략에 대한 추가 매개변수를 설정합니다.
# 예: 샘플링 비율 (0.0 ~ 1.0, 예: "0.1"은 10% 샘플링)
# 기본값: 없음
OTEL_TRACES_SAMPLER_ARG="0.1"

# OTEL_PROPAGATORS: 사용될 컨텍스트 전파자를 쉼표로 구분하여 설정합니다.
# 가능한 값: "tracecontext", "baggage", "jaeger", "b3", "b3multi"
# 기본값: "tracecontext,baggage"
OTEL_PROPAGATORS="tracecontext,baggage"

# NODE_OPTIONS: Node.js 실행 시 자동 계측을 로드하기 위한 설정입니다.
# 항상 "@opentelemetry/auto-instrumentations-node/register"를 지정합니다.
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
```

**주요 환경 변수 상세 설명:**

| 환경 변수                          | 설명                                                                                   |
|-----------------------------------|----------------------------------------------------------------------------------------|
| **OTEL_BSP_SCHEDULE_DELAY**       | 스팬 데이터를 일괄 처리하여 내보내기 전에 대기하는 시간 (밀리초). 네트워크 부하를 줄이는 데 유용합니다. |
| **OTEL_BSP_MAX_QUEUE_SIZE**       | Batch Span Processor가 메모리에 보관할 수 있는 최대 스팬 수.                           |
| **OTEL_BSP_MAX_EXPORT_BATCH_SIZE**| 한 번의 요청으로 내보낼 최대 스팬 수.                                                  |
| **OTEL_BSP_EXPORT_TIMEOUT**       | 스팬 내보내기 작업의 최대 허용 시간 (밀리초).                                          |
| **OTEL_TRACES_EXPORTER**          | 수집된 트레이스 데이터를 전송할 익스포터의 유형을 지정합니다. 일반적으로 `otlp`를 사용합니다. |
| **OTEL_EXPORTER_OTLP_ENDPOINT**   | OTLP 익스포터가 데이터를 전송할 엔드포인트 URL입니다. OpenTelemetry Collector의 주소를 입력합니다. |
| **OTEL_SERVICE_NAME**             | 모니터링 시스템에서 애플리케이션을 식별하는 데 사용될 서비스 이름입니다.                |
| **OTEL_LOG_LEVEL**                | OpenTelemetry 라이브러리의 로그 출력 수준을 설정합니다. 디버깅 시 유용합니다.          |
| **OTEL_NODE_RESOURCE_DETECTORS**  | 애플리케이션이 실행되는 환경에 대한 정보를 자동으로 감지하는 기능을 설정합니다.        |
| **OTEL_NODE_ENABLED_INSTRUMENTATIONS** | 활성화할 특정 라이브러리 계측을 설정합니다. 예를 들어, 특정 데이터베이스 드라이버의 모니터링을 제외할 수 있습니다. |
| **OTEL_NODE_DISABLED_INSTRUMENTATIONS**| 비활성화할 특정 라이브러리 계측을 설정합니다.                                        |
| **OTEL_TRACES_SAMPLER**           | 트레이스 샘플링 전략을 설정합니다. 모든 트레이스를 수집하는 대신 특정 비율로 샘플링하여 시스템 부하를 줄일 수 있습니다. |
| **OTEL_TRACES_SAMPLER_ARG**       | 샘플링 전략에 대한 추가 매개변수를 설정합니다.                                         |
| **OTEL_PROPAGATORS**              | 분산 트레이싱 환경에서 요청의 컨텍스트를 전파하는 방식을 정의합니다.                   |
| **NODE_OPTIONS**                  | Node.js가 시작될 때 OpenTelemetry 자동 계측을 로드하는 데 필수적인 설정입니다.         |

## 중요한 주의사항: NODE_OPTIONS

다른 환경변수 옵션들과 다르게 `NODE_OPTIONS` 환경 변수는 OpenTelemetry 자동 계측의 핵심입니다. **반드시 Node.js 프로세스가 시작될 때 전달되어야 합니다.**  NestJS나 dotenv와 같이 애플리케이션 실행 이후에 환경 변수를 로드 하는 방식으로는 자동 계측이 적용되지 않습니다.

따라서, 다음과 같은 방법으로 `NODE_OPTIONS`를 설정해야 합니다.

* **운영 체제 또는 컨테이너 환경 변수 설정:** Docker, Kubernetes 등의 환경에서 환경 변수를 설정하여 Node.js 프로세스 시작 시 적용되도록 합니다.
* **`env-cmd` 활용:**  `.env` 파일에 정의된 환경 변수를 Node.js 실행 시점에 로드해주는 `env-cmd`와 같은 도구를 사용합니다.

아래는 `env-cmd`를 사용하여 애플리케이션을 실행하는 예시입니다. `package.json`의 `scripts` 부분을 다음과 같이 수정합니다.

```json
{
  "scripts": {
    "start": "env-cmd -f .env node main.js"
  }
}
```

이제 `npm run start` 명령어를 실행하면 `.env` 파일의 환경 변수가 로드된 상태로 애플리케이션이 실행되고, OpenTelemetry 자동 계측이 활성화됩니다.

## 테스트

![](assets/img/pasted-image-20241222055935.png)

1. 어플리케이션을 실행합니다.
	1. `NODE_OPTIONS`가 재대로 적용이 되었다면 로그에 `OpenTelemetry automatic instrumentation started successfully` 가 출력됩니다.
2. 계측을 하고 싶은 API를 호출합니다.
3. localhost:3000으로 grafana에 접속합니다.
4. Exploer로 들어간다.
5. Run 버튼을 누르면 계측된 데이터가 보입니다.
6. 우리는 Root Span을 찾아야 되므로 Span Name 부분에 적절한 name을 선택합니다. 그리고 다시 Run query를 실행합니다.
7. 추적하려는 span이 보인다면 ID를 클릭합니다.
8. 오른쪽 영역에 스팬 그래프가 나옵니다. 스팬 그래프를 보면서 분석을 합니다.

## 마치며

OpenTelemetry의 자동 계측 기능은 Node.js 애플리케이션의 모니터링을 시작하는 가장 쉽고 빠른 방법 중 하나입니다. 단 몇 줄의 설치 명령어와 환경 변수 설정만으로 애플리케이션의 성능 데이터를 수집하고 분석할 수 있게 됩니다. 특히 `NODE_OPTIONS` 설정의 중요성을 이해하고 적절한 방법을 통해 적용한다면, 별도의 코드 수정 없이 강력한 관측성 기능을 활용할 수 있습니다. 지금 바로 OpenTelemetry 자동 계측을 시작하여 애플리케이션의 숨겨진 성능 병목 지점을 찾아내고 사용자 경험을 향상시켜 보세요.