---
title: Write Forwarding - 코드 변경 없이 Read - Write 부하분산하기
datetime: 2025-09-03T11:44:40.914Z
tags:
  - database-scaling
  - write-forwarding
  - aws-aurora
  - read-replica
  - proxysql
  - mysql
  - gtid
  - read-after-write
  - database-consistency
  - aurora-write-forwarding
nanoId: cmceo3miwnU457IcI9LiPDZkY
permalink: /cmceo3miwnU457IcI9LiPDZkY/
---
## Intro

이번 포스트에서는 운영 중인 서비스에서 DB 부하를 분산하기 위해 도입한 'Write Forwarding'에 대해 공유하려 합니다. 트래픽 증가로 인해 단일 DB 인스턴스가 한계를 드러낼 때, 코드 변경 없이 효과적으로 스케일링하는 방법을 찾는 분들에게 도움이 되기를 바랍니다. AWS Aurora 환경을 중심으로 설명하겠지만, 비슷한 고민을 하시는 분들은 참고하시기 좋을 것입니다.

## Write Forwarding - 코드 변경 없이 Read / Write 부하분산하기

현재 운영중인 서비스에서는 단일 DB 인스턴스만 붙어 있는 백엔드 서버 구조입니다. 단순하고 관리하기는 쉬웠지만, 예상되는 트래픽이 늘어나면서 더 이상 스케일업만으로는 버틸 수 없다고 판단했고 “DB 부하를 어떻게 분산할 것인가”라는 질문이 생겼습니다.

문제는 백엔드 서버가 **read / write 구분 없이 단일 엔드포인트로 DB에 붙어 있다는 점**이었습니다. 주어진 시간이 짧아 결국 코드 레벨의 수정 없이 read replica를 활용할 방법이 필요해졌습니다.

## 후보군 정리

고려한 방법은 크게 두 가지였습니다.

* **ProxySQL**
* **AWS Aurora read replica + Write Forwarding**

두 접근 모두 read / write 요청을 구분할 수 있다는 장점이 있습니다. 다만, 도입을 검토하면서 제일 먼저 마주친 고민은 **복제 지연**이었습니다.
복제 지연이 있기 때문에 단순히 Read와 Write 요청을 분리하면 다음과 같은 문제가 발생할 수 있습니다.

### Read After Write 문제

* **데이터 불일치 현상**: 방금 insert한 데이터가 바로 조회되지 않는 상황
* **API 응답의 불완전함**: GraphQL의 `Resolve Field`에서 최신데이터를 가져오지 못하는 현상
* **프론트엔드의 즉각적 refetch 실패**: 쓰기 요청에 따른 업데이트 되어야할 정보가 화면에 바로 반영되지 않음

## ProxySQL을 검토하며

ProxySQL이 제공하는 기능

* **Multiplexing (다중화)**: 여러 클라이언트 연결을 적은 수의 백엔드 서버 연결로 다중화하여 리소스 효율성을 높입니다.
* **Query Routing (쿼리 라우팅)**: 쿼리를 읽기(SELECT) 및 쓰기(INSERT, UPDATE, DELETE) 작업으로 분류하여 적절한 백엔드 서버로 라우팅합니다.
* **Connection Pooling (커넥션 풀링)**: 데이터베이스 연결을 재사용하여 새로운 연결 설정 오버헤드를 줄입니다.
* **Query Caching (쿼리 캐싱)**: 자주 실행되는 쿼리 결과를 캐싱하여 응답 시간을 단축합니다.
* **Failover (장애 조치)**: 백엔드 MySQL 서버에 장애가 발생하면 자동으로 다른 서버로 연결을 전환합니다.

위와 같이 ProxySQL은 MySQL 계열에서 많이 쓰이는 솔루션이고, read/write 스플리팅도 지원합니다. 하지만 문제는 Aurora 환경이었습니다.
Aurora는 **GTID(Global Transaction ID)**를 사용하여 동일한 클러스터의 인스턴스 간에 데이터를 복제하지 않습니다. - ([AWS Aurora 공식 문서](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/AuroraUserGuide/mysql-replication-gtid.html))
ProxySQL이 GTID 기반 라우팅을 활용하지 못하니, 결국 read-after-write 문제를 완전히 커버하기 어려웠습니다.

만약 GTID를 지원했다면 ProxySQL은 Read After Write 문제를 해결하기 위해서 다음과 같이 동작합니다. - ([ProxySQL GTID Causal Reads](https://proxysql.com/blog/proxysql-gtid-causal-reads/))

* **마스터로 쓰기**: 애플리케이션이 쓰기(INSERT, UPDATE, DELETE) 쿼리를 ProxySQL로 보내면, ProxySQL은 이 쿼리를 마스터 서버로 라우팅합니다.
* **GTID 캡처**: 마스터 서버에서 트랜잭션이 커밋되면 해당 트랜잭션의 GTID가 생성되고 ProxySQL에 의해 캡처됩니다.
* **GTID 대기 및 슬레이브로 읽기**: 이후 애플리케이션이 동일한 GTID와 관련된 데이터를 읽는 쿼리를 보낼 경우, ProxySQL은 해당 GTID가 슬레이브 서버에 복제될 때까지 기다린 후 읽기 쿼리를 슬레이브 서버로 라우팅합니다.

문제는 GTID를 지원하지 않는 Aurora에서는 도입이 불가능하기 때문에 다른 방법을 찾아야 했습니다. 실제로 테스트 환경에서 ProxySQL을 셋업해 보았지만, Aurora의 복제 메커니즘과 맞물리지 않아 포기하게 되었습니다.

## Aurora Write Forwarding

Aurora는 자체적으로 **Write Forwarding** 기능을 제공합니다. - ([AWS 공식 문서](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-write-forwarding.html)). 이 기능은 Aurora 클러스터에서 사용할 수 있으며, 읽기 전용 복제본 (read replica)에 쓰기 요청이 들어오면 내부적으로 이를 Primary 인스턴스로 안전하게 전달해 줍니다.
즉, read replica에 write 요청이 들어오면 내부적으로 이를 primary로 전달해 줍니다.

이 구조 덕분에 애플리케이션은 코드 변경 없이 그대로 read replica를 바라보면서도, write는 알아서 primary로 흘러갑니다. 이는 개발 복잡성을 크게 줄이고, 애플리케이션의 가용성을 높이는 데 기여합니다.

여기에 Aurora의 **read consistency 옵션**을 함께 검토했습니다:

* **Eventual**: 기본값. 복제 지연이 발생할 수 있습니다. 쓰기 작업 후 읽기 작업 시 최신 데이터를 보장하지 않을 수 있습니다. 대량 데이터 처리나 실시간성이 중요하지 않은 경우에 적합합니다.
* **Session**: 같은 세션 내에서만 read-after-write 보장. 동일한 클라이언트 세션 내에서는 이전 쓰기 작업의 결과를 즉시 읽을 수 있지만, 다른 세션에서는 보장되지 않습니다.
* **Global**: 클러스터 전체에서 강한 일관성을 보장합니다. 모든 읽기 요청이 최신 쓰기 결과를 반영하도록 보장합니다. 이는 높은 일관성이 필요한 애플리케이션에 필수적입니다.

최종적으로 선택한 것은 **Global**이었습니다. 이유는 명확했습니다. 프론트엔드에서 **쓰기 직후 refetch를 바로 하는 케이스**가 많았으며, Eventual/Session 옵션으로는 이 문제를 해결할 수 없었습니다. Global을 적용하자 read-after-write 문제가 안정적으로 사라졌습니다. Global consistency는 Aurora 클러스터의 모든 인스턴스에서 데이터 일관성을 강력하게 보장하여, 분산된 애플리케이션 환경에서도 데이터 정합성 이슈를 효과적으로 해결할 수 있었습니다.

실제 구현 과정에서 클러스터 설정을 변경하고 모니터링을 통해 지연 시간을 확인했는데, Global 옵션이 예상보다 부하를 적게 주면서도 안정성을 제공해 만족스러웠습니다.

## 마무리

결국 **Aurora Write Forwarding + Global consistency** 조합으로, 코드 변경 없이도 read/write 부하 분산을 구현할 수 있었습니다.

물론 장기적으로는 애플리케이션 레벨에서 read/write 분리를 명시적으로 하려고 계획 중입니다. 하지만 당장의 병목을 풀기 위해 이번 접근을 선택했고, 실제로 효과를 보았습니다. 트래픽 피크 타임에도 DB 응답 시간이 안정화되었고, read replica를 활용해 비용 효율도 높아졌습니다.

이 글은 그 과정에서 얻은 경험을 기록해두고, 같은 고민을 하고 있는 분들에게 참고가 되기를 바라는 마음으로 남깁니다. 추가 질문이나 비슷한 경험 공유는 댓글로 부탁드립니다.