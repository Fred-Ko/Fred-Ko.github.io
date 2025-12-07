---
title: Ephemeral Port Exhaustion - 대량의 트래픽 처리 시 발생하는 임시 포트 고갈 문제와 해결 전략
datetime: 2025-12-07T11:18:21.676Z
tags:
  - ephemeral-port-exhaustion
  - tcp-time-wait
  - linux-kernel-tuning
  - connection-pooling
  - http-keep-alive
  - nestjs
  - microservices
nanoId: GqA43z1WKMUATGjNpbltaQg6s
permalink: /GqA43z1WKMUATGjNpbltaQg6s/
---
### Intro

MSA(Microservices Architecture) 환경이나 외부 API 연동이 잦은 시스템을 개발하다 보면, CPU나 메모리 리소스는 여유가 있음에도 불구하고 갑자기 외부 요청이 실패하거나 타임아웃이 발생하는 현상을 마주할 때가 있습니다. 로그를 자세히 살펴보면 `EADDRNOTAVAIL` 같은 에러를 발견하게 되는데, 이는 애플리케이션의 문제가 아닌 네트워크 스택, 구체적으로는 TCP/IP 연결의 한계로 인해 발생하는 경우가 많습니다.

이번 포스트에서는 고성능 서버 환경에서 빈번하게 마주할 수 있는 **Ephemeral Port Exhaustion(임시 포트 고갈)** 현상의 원인을 TCP 프로토콜 관점에서 분석하고, 이를 해결하기 위한 OS 튜닝 및 애플리케이션 레벨(NestJS)에서의 대응 전략을 공유하려 합니다. 특히 대량의 아웃바운드 트래픽을 처리해야 하는 백엔드 엔지니어 분들에게 도움이 되기를 바랍니다.

---

### 임시 포트 고갈이란 무엇인가?

우리가 서버를 운영할 때, 인바운드 트래픽(들어오는 요청)에 대해서는 보통 80이나 443 같은 고정 포트(Well-known Port)를 사용합니다. 하지만 서버가 클라이언트 역할을 하여 외부 서비스나 DB로 요청을 보낼 때(아웃바운드 트래픽)는 OS가 관리하는 **임시 포트(Ephemeral Port)** 범위 내에서 사용 가능한 포트를 하나 할당받아 통신을 시작합니다.

리눅스 커널은 기본적으로 약 28,000개 정도의 임시 포트 범위를 가지고 있습니다. "2만 개면 충분하지 않나?"라고 생각할 수 있지만, TCP 연결의 특성상 연결이 종료된 후에도 즉시 포트가 반환되지 않는다는 점이 문제입니다.

#### TIME_WAIT 상태의 누적


![](assets/img/pasted-image-20251207172144.png)


TCP 연결을 정상적으로 종료(4-way Handshake)할 때, 먼저 연결 종료를 요청한 쪽(Active Closer)은 마지막 ACK 패킷이 상대방에게 잘 도착했는지 보장하고, 네트워크에 남아있는 패킷으로 인한 데이터 혼선을 막기 위해 일정 시간 동안 소켓을 `TIME_WAIT` 상태로 유지합니다.

문제는 이 `TIME_WAIT` 상태가 기본적으로 **60초(Linux 기준)** 동안 유지된다는 점입니다. 만약 초당 500개의 요청을 외부로 보내고 연결을 끊는다면, 1분 뒤에는 `500 * 60 = 30,000`개의 포트가 `TIME_WAIT` 상태로 잠기게 됩니다. 이렇게 되면 OS는 새로운 연결을 맺을 때 사용할 수 있는 포트가 없어 연결 생성을 거부하게 됩니다.

---

### 해결 전략 1: OS 커널 파라미터 튜닝
가장 먼저 시도해 볼 수 있는 방법은 OS 설정을 변경하여 임시 포트의 가용 범위를 늘리거나, 재사용 정책을 완화하는 것입니다.
#### 1. 임시 포트 범위 확장
기본 설정된 포트 범위를 최대로 늘려 가용성을 확보할 수 있습니다.
```bash
# 현재 범위 확인
sysctl net.ipv4.ip_local_port_range
# 범위 확장 (1024 ~ 65535)
sysctl -w net.ipv4.ip_local_port_range="1024 65535"
```
하지만 이 방법은 포트의 개수를 늘려줄 뿐, 근본적으로 `TIME_WAIT`가 쌓이는 속도가 빠르다면 언젠가는 고갈됩니다.
#### 2. tcp_tw_reuse 활성화
`tcp_tw_reuse` 옵션을 켜면, 프로토콜 상 안전하다고 판단되는 경우(타임스탬프 기반) `TIME_WAIT` 상태인 소켓을 새로운 연결에 재사용할 수 있게 해줍니다.
```bash
sysctl -w net.ipv4.tcp_tw_reuse=1
```
이 설정은 비교적 안전하며 효과적이지만, 클라이언트와 서버 모두 TCP 타임스탬프(`net.ipv4.tcp_timestamps`) 옵션이 켜져 있어야 동작합니다.
#### 3. TIME_WAIT 지속 시간 단축
`TIME_WAIT` 상태의 지속 시간을 줄여 포트가 더 빨리 재사용되도록 할 수 있습니다. 기본값은 60초이므로, 필요에 따라 30초 정도로 줄이는 것이 일반적입니다. (주의: 너무 짧게 설정하면 네트워크 패킷 재전송 문제가 발생할 수 있음)
```bash
# 현재 값 확인
sysctl net.ipv4.tcp_fin_timeout
# 지속 시간 단축 (예: 30초)
sysctl -w net.ipv4.tcp_fin_timeout=30
```

---

### 해결 전략 2: Connection Pooling (HTTP Keep-Alive)

OS 튜닝이 '증상 완화'라면, **Connection Pooling**은 '원인 치료'에 가깝습니다. 매 요청마다 3-way Handshake와 4-way Handshake를 반복하는 것이 문제의 핵심이기 때문입니다.

HTTP Keep-Alive를 사용하여 한 번 맺은 TCP 연결을 끊지 않고 재사용한다면, 핸드쉐이크 비용을 줄일 뿐만 아니라 포트 고갈 문제도 완벽하게 해결할 수 있습니다.


![](assets/img/infographic-20251207-201959-os-connection-pooling.png)


### 결론

임시 포트 고갈 문제는 트래픽이 적을 때는 드러나지 않다가, 서비스가 성장하거나 이벤트 상황에서 갑작스럽게 시스템을 마비시키는 시한폭탄과 같습니다.

`netstat -ton` 명령어로 `TIME_WAIT` 상태의 소켓 개수를 주기적으로 모니터링해 보시길 권장합니다. 만약 그 수치가 비정상적으로 높다면, OS 레벨의 튜닝(`tcp_tw_reuse`)과 함께 애플리케이션 레벨의 **Connection Pooling** 전략이 제대로 적용되어 있는지 반드시 점검해봐야 합니다.

이 글이 대용량 트래픽 처리를 고민하는 분들에게 실질적인 도움이 되기를 바랍니다.