---
title: SIGNOZ - 보안 제약 환경에서의 OpenTelemetry 기반 자체 모니터링 시스템 구축하기
datetime: 2025-03-25T10:59:41.193Z
tags:
  - opentelemetry
  - signoz
  - datadog
  - kubernetes
  - docker-compose
  - cloud-service-provider
  - logging
  - metrics
  - tracing
  - monitoring
nanoId: pnCF97Gk5Py7lXukcucbpAAPm
permalink: /pnCF97Gk5Py7lXukcucbpAAPm/
---
## Intro

보안 제약이 환경에서 OpenTelemetry를 기반으로 자체 로깅 및 계측 시스템을 구축한 경험을 공유하고자 합니다. 클라우드 서비스 제공자(CSP) 환경에서 보안 규정을 준수하면서 효과적인 시스템 모니터링 체계를 만드는 것은 쉽지 않은 과제입니다. 이번 글에서는 제가 겪었던 문제 상황부터 솔루션 선택, 구축 과정, 그리고 운영까지 도입과정을 상세하게 다루어보겠습니다.

## 기존 환경 분석

이미 프로젝트에서 Zero Code Instrumentation 방식을 적용하고 있었습니다. Datadog agent를 사용하여 OTLP로 Trace를 수집하고 Datadog을 이용해 모니터링을 하고 있었습니다.

Opentelemetry를 도입했던 이유는 언제든 Datadog을 다른 솔루션으로 교체하고자 했던 것이었고, 이번 CSP 환경에서 작업하면서 위와같은 준비가 빛을 발할 수 있게 되었습니다.

## 요구사항 분석

새로운 환경에서 구축해야 할 모니터링 시스템의 주요 요구사항은 다음과 같습니다:

- Trace 시스템 구축 (분산 트랜잭션 추적)
- 인프라 모니터링 (CPU, 메모리, 네트워크 등)
- 데이터베이스 Metrics 수집 (쿼리 성능, 연결 상태 등)
- 로깅 시스템 구축 (애플리케이션 로그, 시스템 로그)
- Trace와 Logging 통합 (로그와 트레이스 연관 분석)
- Zero Code Instrumentation 방식 유지 ( 즉 코드 변경 없이 바로 도입 )

### Trace와 Logging 통합의 중요성

분산 시스템에서는 하나의 요청이 여러 마이크로서비스를 거치면서 처리되는 경우가 많습니다. 이때, 특정 요청에 대한 전체적인 흐름을 파악하고 문제 발생 지점을 정확하게 식별하기 위해서는 Trace 정보와 해당 요청 처리 과정에서 발생한 로그 정보를 통합적으로 분석하는 것이 매우 중요합니다.

통합된 관점에서 로그와 트레이스를 볼 수 있다면, 문제 발생 시 근본 원인 분석이 훨씬 수월해지고 디버깅 시간을 크게 단축할 수 있습니다.

## 솔루션 검토 및 비교 분석

### 후보 솔루션 개요

자체 로깅 및 계측 시스템 구축을 위해 다음과 같은 오픈소스 솔루션들을 검토했습니다.

- **Sentry:** 에러 및 예외 추적에 특화된 솔루션으로, 성능 모니터링 기능도 제공합니다.
- **SigNoz:** OpenTelemetry 네이티브 지원을 강조하며, Trace, Metrics, Logs를 통합적으로 제공하는 솔루션입니다.
- **LGTM 스택 (Loki, Grafana, Tempo, Mimir):** 각각 로깅, 시각화, 트레이싱, Metrics를 담당하는 컴포넌트들을 조합하여 사용하는 방식입니다.

세 솔루션 모두 Kubernetes 환경이나 Docker Compose로 설치 가이드를 제공하고 있어 비교적 빠른 시간 안에 도입이 가능한 솔루션이라고 판단했습니다.

### 평가 기준

각 솔루션들을 다음과 같은 평가 기준에 따라 비교 분석했습니다.

- **OpenTelemetry 호환성:** 기존 OpenTelemetry 계측과의 통합 용이성
- **Self-hosting 가능성:** 보안 제약 환경 내 자체 구축 및 운영 가능성
- **확장성 (성능 및 데이터저장):** 데이터 증가에 따른 확장성 및 운영 관리의 편의성

### 솔루션 비교 분석

| 항목                     | **Sentry**                                  | **SigNoz**                                   | **Grafana LGTM Stack**                      |
| ---------------------- | ------------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| **OTLP Trace 지원**      | ✅ 지원                                        | ✅ 지원                                         | ✅ 지원                                        |
| **OTLP Metric 지원**     | ❌ 미지원                                       | ✅ 지원                                         | ✅ 지원                                        |
| **OTLP Log 지원**        | ❌ 미지원                                       | ✅ 지원                                         | ✅ 지원                                        |
| **Self-hosting 가능 여부** | ✅ 가능 (초기 구성은 쉬우나 커스텀은 필요)                   | ✅ 가능 (Kubernetes에 최적화)                       | ✅ 가능 (구성 요소 다수, 고도화된 설정 가능)                 |
| **대규모 트래픽 대응 난이도**     | **높음** – Kafka, ClickHouse 등 다수 구성 요소 확장 필요 | **중간** – K8s 기반 수평 확장 용이, Collector로 유연하게 조정 | **높음** – 구성 요소별 확장 및 통합 운영에 전문성 요구          |
| **확장 시 고려 요소**         | Snuba, Kafka, ClickHouse, Relay의 개별 스케일링    | OpenTelemetry Collector 구성, ClickHouse      | Loki/Tempo/Mimir 개별 확장, Grafana 대시보드 최적화 필요 |

## SigNoz 선택 배경과 이유

### OpenTelemetry 네이티브 지원 강점

SigNoz는 OpenTelemetry를 네이티브하게 지원하며, Trace, Metrics, Logs를 하나의 플랫폼에서 통합적으로 제공한다는 점이 가장 큰 매력이었습니다. 기존에 OpenTelemetry를 이용하여 계측을 진행하고 있었기 때문에, SigNoz와의 통합이 매우 용이할 것으로 판단했습니다.

OpenTelemetry 네이티브 지원때문에 프로젝트 코드에서 그 어떤 수정도 없이 환경변수 수정만으로 바로 도입이 가능한 점이 가장 마음에 들었습니다.

### Clickhouse 기반 단일 저장소의 이점

SigNoz의 가장 큰 차별점은 로그, Metrics, 트레이스 데이터를 모두 단일 Clickhouse 저장소에 통합하여 저장한다는 점입니다. 이는 LGTM 스택과 명확히 대비되는 부분입니다:

- **LGTM 스택:** Loki(로그), Mimir/Prometheus(Metrics), Tempo(트레이스)와 같이 각 데이터 유형별로 별도의 저장소를 사용하여 관리 복잡성이 증가합니다. 각 저장소마다 별도의 스케일링, 백업, 모니터링이 필요합니다.

- **SigNoz + Clickhouse:** 모든 텔레메트리 데이터(로그, Metrics, 트레이스)가 단일 Clickhouse 인스턴스 또는 클러스터에 저장됩니다. 이로 인해:

  - 데이터 간 상관관계 분석이 더 용이합니다.
  - 백업 및 복구 프로세스가 단순화됩니다.
  - 단일 저장소 기술만 학습하면 되므로 운영 부담이 감소합니다.
  - 스토리지 확장 시 모든 텔레메트리 데이터에 대해 한 번의 작업만 필요합니다.

이러한 Clickhouse의 확장성과 통합 저장소 접근 방식은 미래 지향적인 모니터링 시스템 구축에 있어 중요한 요소였습니다. 현재는 단일 노드로 시작하더라도, 데이터 증가에 따라 클러스터로 확장할 수 있는 경로가 명확하게 제공되기 때문입니다.

SigNoz의 단점으로는 상대적으로 레퍼런스가 많지 않다는 점이 있었지만, 아키텍처의 단순함과 기능적 완결성이 이를 상쇄한다고 판단했습니다.

## 설치 환경 선택

### Compute Instance 선택 이유

Kubernetes와 Compute Instance(VM) 중에서 고민한 결과, 다음과 같은 이유로 Compute Instance를 선택했습니다:

1. 사용하는 CSP의 Kubernetes 환경에 대한 신뢰감 부족, 특히 스토리지 드라이버나 CSI 플러그인에 대한 신뢰도가 낮았습니다.
2. 모니터링 시스템은 한번 설치하고 자주 관리하지 않는 특성이 있습니다.
3. 볼륨 사용량에 대한 모니터링이 VM 환경에서 더 단순합니다.
4. Kubernetes 환경에서의 설치 및 운용에 대한 러닝 커브를 고려했습니다.
5. VM 환경에서는 백업 및 복원이 더 쉽습니다.

### 스케일링 고려사항

스케일링 상황에 대한 고려 시나리오를 검토했습니다. 현재 서비스에서 모니터링 및 계측 시스템에 무중단이 반드시 필요하지는 않았으며, 새벽시간에 잠시 관리 시간을 가지는 정도는 허용 가능했습니다. 그리고 스케일링 과정은 매우 단순합니다.

**볼륨 스케일링:**

- CSP에 따라 다르지만 현재 사용중인 VM은 오프라인 리사이징이 가능합니다. 인스턴스를 잠시 중지하고 볼륨 크기를 수정한 후 다시 재시작 하면 됩니다.

**📝 참고**

- 사용 중인 Kubernetes와 VM 서비스 모두 볼륨 확장이 가능합니다.
- VM 환경에서는 볼륨 확장 시 오프라인 리사이징만 가능하여 중단이 발생할 수 있습니다.

**리소스 부족 상황:**

- VM의 스펙을 조정하는 방식으로 대응 가능합니다.

## 운영


![](assets/img/pasted-image-20250325175433.png)


### 데이터베이스 Metrics 수집

데이터베이스 Metrics 수집을 위해 Kubernetes 환경에 Prometheus MySQL, PostgreSQL Exporter를 배포하고, OpenTelemetry Collector에서 이 데이터를 수집하도록 설정했습니다. 이를 통해 SigNoz에서 데이터베이스에 대한 Metrics를 조회할 수 있게 되었습니다.

그러나 데이터베이스 OS Metrics에 대한 부분은 아직 통합하지 못했습니다. API를 제공하는 것으로 보여 향후 통합이 가능할 것으로 예상됩니다.

### 주요 오류 및 해결 방법

1. **Too many operations to track, using overflow operation name**
   signoz otel collector config에서 signozspanmetrics/delta 항목에서 max_services_to_track , max_operations_to_track_per_service 값을 증가 시켰습니다.

2. **context deadline exceeded**
   signoz otel collector config에서 `signozclickhousemetrics`의 timeout 값을 증가시켰습니다.

### 운영 시 주의사항

- **디스크 볼륨의 주기적인 모니터링:**
  - SigNoz가 구동되는 VM 자체의 OS Metrics도 수집되도록 하고 디스크 사용량에 대한 알림을 설정해야 합니다. 기본 리텐션이 지정되어 있어서 사용량이 늘지 않는다면 어느정도 유지되는 볼륨 사이즈를 찾아갈 수 있습니다.

- **OpenTelemetry Collector 로그 모니터링:**
  - Collector 자체의 로그도 수집되도록 설정하고 주기적으로 모니터링하여 문제를 조기에 발견할 수 있도록 해야 합니다. 과부하시 데이터 누락이 발생할 수 있어서 로그를 주기적으로 잘 추적해야합니다.

## 최신 업데이트 및 발전 방향


![](assets/img/pasted-image-20250325174222.png)


SigNoz는 지속적으로 발전하고 있으며, 0.76 버전에서 아키텍처가 업데이트 되었습니다. 이 업데이트로 아키텍처가 더욱 단순화되어 관리 포인트가 더 적어졌습니다. [GitHub - SigNoz/signoz: Release v0.76.0](https://github.com/SigNoz/signoz/releases/tag/v0.76.0)

## 다른 솔루션 대비 좋았던 부분

  SigNoz를 도입하면서 기존에 사용했던 Datadog과 비교했을 때 몇 가지 두드러진 장점을 확인할 수 있었습니다. Datadog은 다양한 기능을 제공하지만, 모든 기능을 온전히 활용하기 어려웠고, UI의 직관성이 다소 부족하다는 점이 아쉬웠습니다. 반면, SigNoz는 직관적인 UI로 햇갈리지 않고 잘 사용할 수 있었습니다.

### APM 기본 대시보드의 우수성

  SigNoz는 애플리케이션 성능 모니터링(APM)을 위한 기본 대시보드를 별도의 구성 작업 없이도 즉시 활용할 수 있을 정도로 잘 설계되어 있습니다. 서비스별, 오퍼레이션별 통계를 테이블 형식으로 제공하며, 기간별 데이터 조회가 빠르고 효율적입니다.


![](assets/img/pasted-image-20250325185056.png)



![](assets/img/pasted-image-20250325185236.png)


### Messaging Queue 통합 모니터링

  Kafka와 같은 메시징 큐에 대한 Instrumentation을 활성화했을 때, SigNoz는 Span 데이터를 자동으로 분석하여 전용 모니터링 대시보드를 제공합니다. 별도의 설정 없이도 메시징 큐의 동작 상태를 시각화할 수 있다는 점이 매우 편했습니다.


![](assets/img/pasted-image-20250325185701.png)


### 뛰어난 시각적 가시성

  SigNoz의 UI는 높은 대비를 가진 색상과 명료한 레이아웃을 통해 뛰어난 가시성을 제공합니다. 직관적인 디자인 덕분에 파악이 훨씬 쉬웠습니다.


![](assets/img/pasted-image-20250325190129.png)


## 마무리

지금까지 보안 제약 환경에서 OpenTelemetry를 활용하여 SigNoz 기반의 자체 모니터링 시스템을 구축한 과정을 상세히 살펴보았습니다. SigNoz를 실제 운영 환경에 적용한 결과, Datadog 대비 비용 효율성이 뛰어나다는 점을 확인할 수 있었습니다. 특히, 초기 우려와 달리 디스크 볼륨 사용량이 예상보다 안정적으로 유지되어 운영 부담이 크지 않음을 검증했습니다.

이에 따라 기존 Datadog 기반 모니터링 시스템을 SigNoz로 전면 대체하기로 결정하였으며, 성공적으로 전환된다면 비용 절감 효과가 상당할 것으로 예상됩니다. 이번 경험을 통해 얻은 인사이트와 구축 과정에서의 교훈은 유사한 환경에서 자체 모니터링 시스템 도입을 검토하는 분들에게 실질적인 참고 자료가 되기를 바랍니다.