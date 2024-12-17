---
title: OpenTelemetry - OpenTelemetry란?.md
datetime: 2024-12-17T09:29:01.947Z
nanoId: 1n1RxDQUaGnJt7dvoGJOOBaHi
permalink: /1n1RxDQUaGnJt7dvoGJOOBaHi/
tags:
  - opentelemetry
  - observability
  - microservices-architecture
  - distributed-tracing
  - metrics
  - logs
  - cloud-native
  - instrumentation
  - context-propagation
  - tracing
---
# OpenTelemetry란?

## 개요

현대 소프트웨어 시스템은 **모놀리스** 구조에서 **마이크로서비스 아키텍처(MSA)**로 전환됨에 따라 복잡성이 급증했습니다.  
기존의 **로그**와 **메트릭**만으로는 각 서비스 간의 연관성과 오류의 원인을 파악하기 어려워졌으며, 이를 해결하기 위해 등장한 개념이 **Observability**입니다.

**OpenTelemetry**는 Observability를 달성하기 위해 **트레이스(Trace), 메트릭(Metric), 로그(Log)** 데이터를 표준화된 방식으로 수집하고 관리하는 오픈소스 프레임워크입니다.

---

## 왜 Observability가 중요한가?

### 모놀리스 vs 마이크로서비스

| **구분**           | **모놀리스**                                   | **마이크로서비스**                                   |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| **구조**           | 하나의 애플리케이션 내부에서 모든 기능 수행    | 여러 개의 독립적인 서비스가 협업하여 시스템 구성     |
| **문제 추적**      | 로그 및 메트릭만으로도 원인 파악이 비교적 쉬움 | 서비스 간 연결이 많아 단일 로그·메트릭만으로 부족    |
| **오류 원인 파악** | 단일 시스템에서 오류 발생 지점 명확            | 서비스 간 호출이 많아 전체 흐름을 파악해야 오류 식별 |
| **관측 가능성**    | 기본 로그/메트릭으로 충분                      | **분산 트레이싱, 로그, 메트릭** 모두 필요            |

### 핵심 포인트

- **MSA 환경**에서는 요청이 여러 서비스와 분산된 인프라를 거치므로 **전체 흐름(Trace)**과 세부 성능 지표가 필수입니다.
  - 분산되어 추적된 로그나 메트릭들을 요청의 단위에서 연결하고 오류를 찾아내는 것이 중요합니다.
- Observability는 **시스템이 복잡하더라도** 문제를 빠르게 찾아내고 성능을 최적화하는 데 필수적인 요소입니다.

---

## OpenTelemetry란 무엇인가?

**OpenTelemetry**는 **CNCF(Cloud Native Computing Foundation)**의 오픈소스 프로젝트로, Observability를 위해 데이터를 **생성, 수집, 처리, 전달**하는 표준을 제공합니다.

### 주요 특징

1. **표준화된 프레임워크**: 다양한 언어와 환경에서 일관된 방식 제공
2. **벤더 중립성**: 특정 벤더에 종속되지 않으며 다양한 백엔드와 호환
3. **확장성**: 필요에 따라 Receiver, Exporter 등 커스터마이징 가능
4. **중요한 데이터 집중**: 데이터 저장·분석은 다른 툴에서 담당하고 OpenTelemetry는 **계측**에 집중

---

## OpenTelemetry 주요 개념

![](assets/img/pasted-image-20241212024442.webp){:width="760px"}

|         **개념**          |                            **설명**                            |
| :---------------------: | :----------------------------------------------------------: |
|    **Traces (트레이스)**    |               분산 트레이싱으로 요청 흐름을 추적하여 문제 구간 시각화                |
|    **Metrics (메트릭)**    |           CPU 사용률, 응답 시간, 에러율과 같은 시간 기반의 성능 지표를 측정           |
|      **Logs (로그)**      |                   특정 이벤트나 상태 변화를 기록하는 메시지                    |
| **Context Propagation** |            서비스 간 요청 흐름을 연결하여 전체 트레이스 단위를 완성하는 기술             |
|      **Resource**       | 텔레메트리 데이터를 생성한 엔티티의 속성 정의 (`service.name`, `k8s.pod.name` 등) |

---

## OpenTelemetry의 아키텍처

1. **API & SDK**: 계측(Instrumentation) 데이터를 생성 및 관리
2. **Instrumentation Libraries**: HTTP, DB 클라이언트 등을 자동 계측
3. **Collector**: 다양한 소스의 데이터를 수집, 처리 후 원하는 백엔드로 전송
4. **Exporters**: 데이터를 Jaeger, Prometheus, OTLP 등 다양한 형태로 내보내기

### OpenTelemetry Collector 흐름

![](assets/img/pasted-image-20241217232643-1.webp)
---

## Observability 구현 절차

1. **계측(Instrumentation)**

   - **Code-based**: 개발자가 직접 코드에 계측 로직 추가 (세밀한 제어 가능)
   - **Zero-code**: 자동 계측을 통해 코드 수정 없이 데이터 수집 시작

2. **Collector 도입**

   - 다양한 소스에서 데이터를 수집, 필터링, 가공 후 **백엔드 시스템**으로 전송

3. **Export & Backend**

   - Traces, Metrics, Logs를 **Jaeger**, **Prometheus** 등의 백엔드로 전달해 시각화 및 분석


> 	**"계측하고 모아서 Backend로 보내고 시각화하고 분석하는게 목적"**

---

## 분산 트레이싱의 중요성

분산 시스템에서는 하나의 요청이 여러 서비스를 거치므로 각 단계의 흐름(Span)을 추적해야 병목과 오류를 빠르게 발견할 수 있습니다.

- **Span**: 작업 단위 (시작/종료 시간, 메타데이터 포함)
- **Trace**: 여러 Span을 하나의 요청 흐름으로 묶은 단위
- **Logs와 Span 연동**: 로그를 Span에 연결해 문제 발생 시 상세 상황 파악

---

## 정리

OpenTelemetry는 **모던 소프트웨어 아키텍처**에서 **Observability**를 위한 표준화된 도구입니다.

- **트레이스, 메트릭, 로그**를 통해 시스템 성능을 모니터링하고 문제를 정확히 파악할 수 있습니다.
- MSA와 클라우드 환경에서 벤더 종속 없이 효율적으로 **관측 가능성**을 확보할 수 있습니다.

---