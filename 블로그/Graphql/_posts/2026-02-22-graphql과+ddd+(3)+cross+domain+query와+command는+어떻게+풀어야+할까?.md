---
title: GraphQL과 DDD (3) - Cross-domain Query와 Command는 어떻게 풀어야 할까?
datetime: 2026-02-22T09:45:27.497Z
tags:
  - graphql-federation
  - ddd
  - cqrs
  - saga-pattern
  - domain-events
  - outbox-pattern
  - bounded-context
nanoId: IDB5lqdeRfdEZAP3aXEBjPrvG
permalink: /IDB5lqdeRfdEZAP3aXEBjPrvG/
---
## Intro

이 글은 시리즈의 세 번째 글입니다. 앞선 글들에서는 GraphQL, Relay, DDD, CQRS를 함께 가져갈 때 어디서 긴장이 생기는지를 정리했습니다. 통합 그래프를 지향하더라도 경계는 통합하지 않아야 하고, 풍부한 payload를 제공하더라도 command는 말수가 적어야 하며, mutation payload의 최신성은 스키마가 아니라 코드와 조회 경로가 책임져야 한다는 이야기였습니다.

그다음으로 자연스럽게 이어지는 질문이 있습니다.

> **그렇다면 cross-domain query와 cross-domain command는 어떻게 다뤄야 하는가?**

이 질문은 생각보다 중요합니다. 같은 “cross-domain”이라도 Query와 Command는 난이도와 해법이 완전히 다르기 때문입니다.

제 생각에 둘의 차이는 이렇게 정리할 수 있습니다.

- **Cross-domain Query는 합성의 문제**입니다.
- **Cross-domain Command는 트랜잭션과 프로세스의 문제**입니다.

읽기는 비교적 풀린 문제입니다. 조인을 어디서 할지, projection을 어디에 둘지, federation 게이트웨이가 어떤 식으로 entity를 합성할지 고민하면 됩니다. 설령 데이터가 조금 낡았더라도, 대부분의 경우 그 결과는 “약간 덜 최신인 화면” 정도로 끝납니다.

하지만 쓰기는 다릅니다. 여러 Aggregate를 동시에 바꾸는 순간, 그건 더 이상 단일 명령이 아니라 **비즈니스 프로세스**가 됩니다. 이 지점부터는 eventual consistency, 이벤트 전파, saga, 보상 트랜잭션이 본격적으로 등장합니다.

그래서 이 글에서는 cross-domain을 한 덩어리로 이야기하지 않고, Query와 Command를 분리해서 보려 합니다.

---

## 1. Cross-domain Query는 비교적 풀린 문제다

읽기부터 보겠습니다.

Cross-domain Query가 비교적 다루기 쉬운 이유는, 본질적으로 **읽기이기 때문**입니다. Query는 상태를 바꾸지 않고, side effect도 만들지 않습니다. 즉, 실패하더라도 시스템의 불변식이 깨지지는 않습니다. 그리고 데이터가 약간 늦어도 대개는 “조금 낡은 정보가 보였다” 수준에서 끝납니다.

그래서 Query는 해법이 꽤 성숙해 있습니다. 보통 아래 네 가지 패턴 안에서 정리할 수 있습니다.

---

## 2. Entity Resolution — Federation의 기본기

가장 기본적인 패턴은 entity resolution입니다.

```graphql
# orders subgraph
type Order @key(fields: "id") {
  id: ID!
  customerId: ID!
  customer: User!
}

# identity subgraph
type User @key(fields: "id") {
  id: ID!
  email: String!
}
```

클라이언트가 `order.customer.email`을 요청하면, 게이트웨이는 대략 이런 흐름으로 응답을 조립합니다.

1. orders subgraph에서 Order를 가져온다
2. Order에 들어 있는 `customerId`를 얻는다
3. identity subgraph에 “이 ID의 User를 달라”고 요청한다
4. 최종 응답에서 `customer.email`을 합성한다

Federation에서는 이 흐름이 `_entities` 쿼리로 표현됩니다.

### 왜 이 패턴이 DDD와 잘 맞는가

이 패턴이 중요한 이유는, **orders 도메인이 User의 내부를 알 필요가 없기 때문**입니다.

orders는 그저 `customerId`를 알고 있으면 충분합니다.

- 이메일 형식이 어떤지
- 2FA가 켜져 있는지
- 사용자가 suspended 상태인지

같은 정보는 identity context의 책임입니다. orders가 그 내부를 복사해 들고 있거나, 직접 그 구조에 의존하기 시작하면 경계가 급격히 흐려집니다.

즉 이 패턴은 DDD의 고전적인 원칙인

> **다른 Aggregate는 객체 전체가 아니라 ID로 참조한다**

를 GraphQL/Federation 레벨로 끌어올린 형태라고 볼 수 있습니다.

읽기 시점에만 게이트웨이가 합성하고, 각 도메인은 자기 소유의 정보만 책임지는 구조입니다.

---

## 3. Entity Extension — 하나의 Entity 환상을 기술적으로 해소하기

두 번째 패턴은 entity extension입니다.

```graphql
# identity subgraph
type User @key(fields: "id") {
  id: ID!
  email: String!
}

# reviews subgraph
extend type User @key(fields: "id") {
  id: ID! @external
  reviewerProfile: ReviewerProfile
  reviewStats: ReviewStats
}
```

이 패턴은 아주 중요합니다. 왜냐하면 cross-domain query에서 자주 생기는 환상 중 하나가, “User는 하나니까 모든 정보도 한곳에 있겠지”라는 생각이기 때문입니다.

실제로는 그렇지 않습니다.

- identity context는 login, email, security를 책임지고
- reviews context는 reviewer profile, review stats를 책임집니다

둘 다 `User`에 붙는 정보처럼 보이지만, 소유권은 다릅니다.

### 왜 이 패턴이 중요한가

이 방식의 장점은, 클라이언트는 여전히 하나의 `User`를 본다는 점입니다. 하지만 내부적으로는 각 context가 **자기 facet만 붙입니다.**

즉,

- 클라이언트 경험은 통합되고
- 소유권은 분산된 채 유지됩니다

이건 앞선 글에서 말한 “통합 그래프를 지향하더라도 경계는 통합하지 않는다”를 가장 기술적으로 잘 보여주는 패턴입니다.

`User`를 하나의 거대한 중심 타입으로 몰아넣는 대신, 각 context가 자기 필드만 확장해서 붙이는 구조가 되는 거죠.

---

## 4. Read Projection / Materialized View — 자주 조인되는 화면은 따로 읽기 모델을 만든다

런타임 합성만으로 충분하지 않은 경우도 많습니다. 특히 cross-domain query가 자주 일어나고, 성능이 중요하며, 대시보드나 리포트처럼 여러 도메인의 정보를 계속 합쳐 봐야 한다면 Federation의 런타임 resolution만으로는 비싸집니다.

이럴 때는 이벤트를 구독해서 **읽기 전용 projection**을 따로 만드는 방식이 훨씬 자연스럽습니다.

```text
[orders]   -- OrderPlaced -->
[identity] -- UserUpdated -->   [analytics projection DB]
[products] -- ProductChanged -->

[analytics subgraph] --> projection DB를 읽기만 함
```

이 구조에서는 analytics나 dashboard용 subgraph가 별도로 생길 수 있습니다.

```graphql
type SalesDashboard {
  totalOrders: Int!
  topProducts: [ProductSales!]!
  topCustomers: [CustomerSales!]!
}
```

### 왜 이게 DDD/CQRS와 잘 맞는가

이건 CQRS가 말하는

> **Read Model은 Write Model과 독립적으로 최적화할 수 있다**

를 분산 환경으로 확장한 버전입니다.

중요한 건 이 projection이 **어느 Aggregate의 소유도 아니라는 점**입니다. 이건 쓰기 규칙을 가진 모델이 아니라, 조회 최적화를 위해 합쳐진 뷰입니다. 그래서 cross-domain query가 반복적으로 필요할수록, 그때마다 runtime federation을 더 복잡하게 만드는 것보다 **projection subgraph를 따로 만드는 쪽이 더 정직한 해법**인 경우가 많습니다.

---

## 5. 가장 좋은 Query 해법은 가끔 “안 하도록 설계하는 것”이다

이건 자주 잊히지만 꽤 중요합니다.

cross-domain query의 가장 좋은 해법은 기술적으로 더 잘 합성하는 것이 아니라, 애초에 **그렇게 자주 cross-domain이 필요하지 않게 경계를 다시 보는 것**일 수도 있습니다.

예를 들어:

- 어떤 화면을 그리기 위해 5개 subgraph를 계속 긁어와야 하고
- `@requires`나 entity resolution 체인이 너무 많고
- 특정 화면이 여러 context의 내부 구조에 과도하게 의존한다면

그건 기술 문제이기도 하지만, 동시에 **bounded context를 잘못 나눈 신호**일 수도 있습니다.

즉 Federation은 단지 해결책이 아니라, 역으로

> **우리가 어디서 경계를 잘못 그었는지를 드러내는 진단 도구**

이기도 합니다.

---

## 6. Cross-domain Command는 왜 진짜 난제인가

이제 읽기에서 쓰기로 넘어가면, 분위기가 완전히 달라집니다.

### 핵심 질문

> **여러 Aggregate를 동시에 바꾸는 mutation을 만들 수 있는가?**

DDD의 정통 답변은 사실 아주 단순합니다.

> **안 된다.**

Aggregate는 트랜잭션 경계이고, 한 트랜잭션은 한 Aggregate 안에서 닫혀야 합니다. 여러 Aggregate를 바꾸는 요구는 단일 명령이 아니라 **비즈니스 프로세스**입니다.

그런데 GraphQL은 이 원칙을 위반하기 아주 쉽게 만듭니다.

```graphql
mutation {
  placeOrder(input: {...}) {
    order { id }
    charge { id }
    shipment { id }
    notificationSent
  }
}
```

겉보기엔 하나의 mutation이지만, 실제로는:

- Order Aggregate
- Payment Aggregate
- Shipment Aggregate
- Notification 시스템

을 한 번에 엮고 있습니다.

모놀리스에서는 이걸 트랜잭션으로 대충 묶어 “되게” 만들 수 있는 것처럼 보일 수 있습니다. 하지만 federation/MSA 환경으로 가는 순간, 이건 물리적으로 유지될 수 없습니다. 그리고 사실 더 중요한 건, **모놀리스에서도 원래부터 조심했어야 하는 구조**였다는 점입니다.

---

## 7. Cross-domain Command는 트랜잭션 문제이기 전에 도메인 해석 문제다

여기서 한 가지를 더 짚고 넘어가야 합니다. Cross-domain Command가 어려운 이유는 단지 “여러 Aggregate를 동시에 바꾸기 어렵다”는 기술 문제만이 아닙니다. 그보다 먼저,

> **이 요구를 정말 하나의 command로 해석하는 것이 맞는가?**

라는 도메인 해석 문제가 있습니다.

사용자 경험만 보면 checkout, refund, onboarding 같은 흐름은 모두 하나의 행동처럼 보입니다. 그래서 자연스럽게 “그럼 mutation 하나로 만들면 되겠지”라는 생각이 듭니다. 하지만 DDD 관점에서는 이 지점에서 한 번 더 의심해야 합니다.

- 이건 진짜 하나의 도메인 명령인가?
- 아니면 여러 도메인 명령이 이어지는 프로세스인가?
- 혹시 policy, process, saga로 해석해야 할 요구를 command로 뭉뚱그리고 있는 건 아닌가?

예를 들어 “주문을 생성하고, 결제를 요청하고, 배송을 만들고, 실패하면 환불한다”는 요구는 사용자 입장에서는 하나의 checkout일 수 있습니다. 하지만 도메인적으로는:

- `OrderPlace`
- `PaymentRequest`
- `ShipmentSchedule`
- `RefundIssue`

처럼 여러 command와 event가 이어지는 프로세스일 가능성이 큽니다.

즉 cross-domain command의 본질은 종종 “어떻게 동시에 바꿀까?”보다 먼저,

> **우리가 원래 하나가 아닌 것을 하나처럼 해석하고 있는 건 아닌가?**

에 있습니다.

### 그래서 어느 도메인에 코드를 둬야 할지도 난감해진다

이 해석 문제가 코드 배치 문제로 바로 이어집니다. 실제로 가장 먼저 마주치는 난점은 이런 질문일 때가 많습니다.

> **그래서 이 로직을 대체 어느 도메인에 둬야 하지?**

예를 들어:

- Order 도메인에 두자니 Payment와 Shipment를 너무 많이 알아야 하고
- Payment 도메인에 두자니 시작점은 Order이고
- Shipment 도메인에 두자니 더 어색하고
- GraphQL resolver에 두자니 인터페이스 계층이 비즈니스 프로세스를 먹어버립니다

이 애매함은 단순한 배치 문제가 아닙니다. 보통은 **그 로직이 어느 한 도메인의 고유한 규칙이 아니기 때문**입니다.

DDD 관점에서 이 질문은 오히려 좋은 신호입니다. “어디에 둬야 할지 모르겠다”는 것은 대개 아래 셋 중 하나이기 때문입니다.

1. 원래 특정 Aggregate 규칙이 아닌데, 억지로 도메인 안에 넣으려 한다
2. 여러 도메인을 잇는 정책이나 프로세스인데 아직 별도 개념으로 승격하지 않았다
3. 애초에 bounded context 경계가 잘못 그어졌을 가능성이 있다

### 그러면 어디에 두는가

이럴 때는 먼저 로직의 성격을 다시 물어야 합니다.

#### 1) 특정 도메인의 불변식을 지키는 규칙인가

그렇다면 그 도메인 안에 둬야 합니다.

- 주문 상태 전이 규칙
- 결제 승인 가능 조건
- 배송 주소 변경 가능 여부

이건 owner aggregate 내부 책임입니다.

#### 2) 한 도메인의 이벤트에 반응해 다른 도메인에 후속 동작을 시키는 정책인가

그렇다면 보통 domain event handler나 policy 계층에 둡니다.

- `OrderPlaced`가 발생하면 `PaymentRequested`를 만든다
- `PaymentCompleted`가 발생하면 `ShipmentScheduled`를 시작한다

이건 Order Aggregate 내부 규칙이라기보다, **도메인 간 반응 정책**에 더 가깝습니다.

#### 3) 여러 단계와 실패/보상 상태를 가진 장기 흐름인가

그렇다면 Saga / Process Manager로 승격하는 편이 맞습니다.

- CheckoutProcess
- RefundProcess
- OnboardingProcess

처럼 별도 프로세스 모델을 두면, “어느 도메인에 코드를 둘지 모르겠다”는 난감함이 줄어듭니다. 특정 도메인 안에 우겨 넣지 않고, **프로세스 계층이 명시적으로 owner가 되기 때문**입니다.

#### 4) 어디에도 안 어울린다면 경계를 다시 봐야 한다

어떤 로직이 계속

- Order에도 안 어울리고
- Payment에도 안 어울리고
- Saga로 빼자니 너무 핵심 같고

이렇다면, 그건 단순 구현 난제가 아니라 **경계가 잘못 그어진 신호**일 수도 있습니다. cross-domain command가 많다는 사실 자체가 좋은 분해의 증거가 아니라, 오히려 잘못 쪼갠 증거일 수도 있다는 뜻입니다.

즉 cross-domain command는 세 겹으로 봐야 합니다.

1. **도메인 해석 문제** — 이건 진짜 command인가, policy인가, process인가?
2. **경계 문제** — 이 요구가 정말 cross-domain인 게 맞나?
3. **구현 문제** — 이벤트, saga, orchestration, outbox를 어떻게 둘 것인가?

많은 팀이 3번부터 시작하지만, DDD적으로는 1번과 2번이 먼저라고 생각합니다.

---

## 8. 해법 A — 단일 Aggregate Command + 도메인 이벤트 전파

가장 기본적인 해법은 역시 이것입니다.

```graphql
mutation {
  orderPlace(input: {...}) {
    order { id status }
  }
}
```

겉으로 보면 단순합니다. Mutation은 오직 Order Aggregate만 바꿉니다.

내부 흐름은 이렇게 갈 수 있습니다.

```text
1. Order Aggregate 생성 / 상태 변경
2. OrderPlaced 이벤트 발행
3. Payment context가 이를 받아 PaymentRequested 생성
4. Shipment context가 PaymentCompleted를 받아 Shipment 생성
```

### 왜 이게 중요한가

여기서 mutation은 **오직 Order Aggregate만 확정**합니다. 나머지는 eventual consistency의 영역으로 넘어갑니다.

이건 사용자 입장에서는 조금 불편할 수 있습니다. “결제도 됐는지 바로 알고 싶은데?”라는 요구가 생길 수 있으니까요. 하지만 그 불편함을 감춘다고 해서, 여러 Aggregate 변경이 하나의 명령으로 바뀌는 것은 아닙니다.

그래서 이 패턴을 쓸 때는 보통 다음 중 하나가 같이 필요해집니다.

- payload에 `paymentStatus: PENDING` 같은 상태를 같이 준다
- Subscription으로 후속 상태를 push한다
- polling으로 후속 상태를 확인하게 한다

즉, cross-domain command에서는 “모든 걸 한 번에 끝내겠다”는 환상을 버리고, 대신 **프로세스 상태를 정직하게 노출하는 쪽**이 더 건강합니다.


### 그리고 이 이벤트 전파를 정말 믿으려면 Outbox가 필요하다

여기서 한 가지를 더 붙여야 합니다. 단일 Aggregate command + 도메인 이벤트 전파가 좋은 방향이라고 해도, **이벤트 발행이 신뢰할 수 있어야** 그 구조도 실제로 믿을 수 있습니다.

예를 들어 가장 무서운 상황은 이런 것입니다.

- Order는 저장됐는데 이벤트는 발행되지 않았다
- 이벤트는 나갔는데 Order 저장은 실패했다

이런 식으로 상태 변경과 이벤트 발행이 어긋나면, cross-domain command를 이벤트 기반으로 나눠 처리하는 구조는 순식간에 불안정해집니다.

그래서 이 패턴을 실제로 가져가려면 결국 Outbox가 거의 필수에 가깝습니다. 흐름은 보통 이렇게 갑니다.

```text
Order 저장 트랜잭션:
  1. orders 테이블에 INSERT
  2. outbox 테이블에 OrderPlaced INSERT
  3. 같은 트랜잭션으로 커밋

별도 relay:
  4. outbox를 읽어 Kafka/RabbitMQ 등에 발행
  5. 발행 성공 후 마킹 또는 삭제
```

이 구조가 중요한 이유는,

> **도메인 이벤트를 Aggregate 상태 변경과 원자적으로 묶기 위해서**

입니다.

즉 Outbox는 해법 A와 별개의 다른 해법이라기보다, **해법 A를 실제로 믿을 수 있게 만드는 신뢰성 기반**에 가깝습니다. 단일 Aggregate command + 이벤트 전파를 말하려면, 그 이벤트를 어떻게 안전하게 내보낼지도 같이 말해야 구조가 완성됩니다.

---

## 9. 해법 B — Saga / Process Manager를 일급 모델로 만든다

여러 Aggregate에 걸친 긴 프로세스를 더 진지하게 다루려면 Saga / Process Manager가 등장합니다.

```graphql
type CheckoutProcess @key(fields: "id") {
  id: ID!
  state: CheckoutState!
  order: Order!
  payment: Payment
  shipment: Shipment
  failureReason: String
}

mutation {
  checkoutStart(input: {...}) {
    process { id state }
  }
}

subscription {
  checkoutProgress(id: ID!) {
    state
    payment { id }
    shipment { id }
  }
}
```

이 방식이 중요한 이유는, checkout이라는 행위를 더 이상 “Order + Payment + Shipment를 한 번에 바꾸는 명령”으로 보지 않기 때문입니다.

대신 이렇게 봅니다.

> **Checkout은 자체 state machine을 가진 비즈니스 프로세스다**

즉 `CheckoutProcess`가 일종의 새로운 Aggregate가 됩니다.

### 왜 이게 DDD적으로 더 정직한가

이 구조에서는 실패도 상태가 됩니다.

- `PENDING_PAYMENT`
- `PENDING_SHIPMENT`
- `COMPLETED`
- `FAILED`

그리고 보상도 프로세스의 일부가 됩니다.

- 결제 실패 시 주문 취소
- 배송 생성 실패 시 환불
- 환불 성공 시 프로세스 종료

즉, 이전에는 mutation 하나에 억지로 우겨 넣던 불확실성과 실패 경로를, 이제는 **도메인 모델 자체가 품게 되는 것**입니다.

이건 UX 측면에서도 강력합니다. 클라이언트는 이제 “모든 게 끝났는가?”가 아니라, “프로세스가 지금 어디까지 왔는가?”를 읽고 구독할 수 있습니다.

이게 바로 비동기 프로세스를 억지로 동기적 mutation처럼 꾸미는 대신, **비동기 프로세스를 일급 도메인 모델로 끌어올리는 해법**입니다.

---

## 10. Orchestration은 해법이라기보다 제한적으로 허용되는 타협에 가깝다

여기까지 오면 자연스럽게 이런 유혹이 생깁니다.

> “그래도 UX상 한 mutation에서 order, payment, shipment를 다 돌려주고 싶다.”

실무에서는 이 요구 때문에 orchestration 전용 resolver나 subgraph를 두고, 내부에서 여러 도메인 서비스를 순차 호출하는 방식이 자주 등장합니다. 작은 팀이나 단순한 프로세스에서는 분명 빠르게 효과를 볼 수도 있습니다.

하지만 이 방식은 DDD 관점에서 기본 해법이라기보다 **제한적으로 허용되는 타협안**에 가깝습니다. 이유는 단순합니다.

- 여러 도메인 변경 흐름이 resolver / application service 코드 안에 숨어들고
- 실패 보상 로직이 프로세스 모델이 아니라 제어 흐름 속으로 들어가며
- 시간이 지나면 orchestration 계층이 점점 비대해져 분산 모놀리스처럼 자라기 쉽기 때문입니다

즉 orchestration은 “이렇게도 할 수 있다”는 선택지이긴 하지만, 글의 중심 해법으로 두기엔 위험합니다. 정말 쓴다면,

- 프로세스가 단순하고
- 실패 보상이 명확하며
- 이것이 정석이 아니라 **의식적인 타협**이라는 점을 팀이 알고 있을 때만

제한적으로 다루는 편이 낫다고 생각합니다.

---

## 11. 현재 프로젝트에 적용한다면 지금부터 어떤 규율을 세워야 하는가

앞선 글들에서 이미 다룬 원칙과 이어서 보면, 지금 프로젝트에서는 다음 규율이 특히 중요하다고 생각합니다.

### 1) Mutation의 황금률: 한 mutation = 한 Aggregate Root의 한 command

이건 컨벤션이 아니라 거의 리뷰 규칙에 가까워야 합니다.

- `placeOrder`는 Order만 바꾼다
- Payment는 `OrderPlaced` 이후에 따라간다
- Shipment도 이벤트 전파 이후에 따라간다

예외가 있다면 “cross-aggregate mutation”이라는 사실을 팀이 명시적으로 인지하고 승인해야 합니다.

### 2) 모놀리스 단계에서도 도메인 이벤트를 먼저 도입한다

지금이 모놀리스라고 해서 모듈 간 협력을 직접 함수 호출로 열어버리면, 나중에 federation/MSA 전환 시 비용이 크게 튑니다.

```ruby
class PlaceOrder
  def call(input)
    order = Order.create!(...)
    EventBus.publish(OrderPlaced.new(order_id: order.id))
    order.id
  end
end
```

이벤트 버스가 지금은 in-process일 수 있습니다. 중요한 건 **통신 형태를 먼저 분리하는 것**입니다. 그래야 나중에 transport만 바꾸면 되지, 호출 구조 전체를 다시 뜯어고치지 않아도 됩니다.

### 3) 장기 프로세스는 일급 모델로 끌어올린다

Checkout, Onboarding, Refund처럼 여러 도메인을 건드리는 프로세스는 처음부터 “여러 command의 묶음”이 아니라, 자체 상태를 가진 프로세스로 모델링하는 것이 훨씬 낫습니다.

즉,

- `CheckoutProcess`
- `RefundProcess`
- `OnboardingProcess`

같은 모델을 GraphQL 타입으로도 존재하게 만들고, 쿼리/구독 가능하게 하는 것이 좋습니다.

이렇게 되면 클라이언트는 “왜 아직 안 끝났지?”를 UI에서 억지로 해석하지 않아도 됩니다. 도메인 자체가 지금 상태를 말해주기 때문입니다.

### 4) 풍부한 payload를 유지하되, 확정된 것과 보류 중인 것을 구분한다

기존에 이미 mutation payload를 풍부하게 제공하는 구조를 갖고 있다면, 거기에 상태 필드를 더 명시적으로 두는 것이 좋습니다.

```graphql
type OrderPlacePayload {
  order: Order!
  paymentStatus: ProcessingStatus!
  estimatedShipmentAt: DateTime
  mutationId: String
}

enum ProcessingStatus {
  PENDING
  COMPLETED
  FAILED
}
```

이렇게 하면 클라이언트는

- 무엇이 확정되었고
- 무엇이 아직 진행 중이며
- 무엇이 실패했는지

를 더 정직하게 이해할 수 있습니다.

즉, cross-domain eventual consistency를 숨기지 않고 **도메인 상태로 드러내는 것**이 중요합니다.

---

## 정리

제가 cross-domain을 정리하면서 가장 크게 느낀 건, Query와 Command를 같은 문제처럼 다루면 안 된다는 점입니다.

### Query
Query는 결국 **합성의 문제**입니다.

- entity resolution
- entity extension
- read projection
- 경계 재조정

같은 성숙한 해법이 이미 꽤 잘 정리되어 있습니다.

### Command
반면 Command는 **트랜잭션과 프로세스의 문제**입니다.

분산 환경에는 “여러 Aggregate를 동시에 안전하게 바꾸는 단일 트랜잭션”이 없습니다. 이 사실을 인정하는 순간, 답은 결국 세 갈래로 수렴합니다.

1. **명령을 쪼갠다** — 한 Aggregate씩 바꾸고 이벤트로 전파한다
2. **프로세스를 일급 모델로 만든다** — Saga / Process Manager
3. **Orchestration으로 타협한다** — 단, 그게 타협이라는 걸 알고 써야 한다

DDD의 정통 해법은 1번과 2번입니다. 3번은 현실적인 탈출구지만, 무의식적으로 기본값이 되는 순간 조직은 빠르게 분산 모놀리스로 기울 가능성이 큽니다.

그래서 제 식으로 요약하면 이렇습니다.

> **Cross-domain Query는 합성의 문제다.**  
> **Cross-domain Command는 트랜잭션이 아니라 프로세스의 문제다.**  
> **여러 Aggregate를 동시에 바꾸고 싶어질수록, 더 강하게 프로세스를 모델링해야 한다.**

지금 프로젝트가 이미 GraphQL과 DDD, CQRS의 긴장을 의식하고 있다면, 다음 단계에서 가장 중요한 추가 원칙은 아마 이것일 겁니다.

> **여러 Aggregate에 걸친 요구를 하나의 mutation으로 우겨 넣지 말고, 프로세스를 도메인 모델로 끌어올릴 것.**

이 원칙 하나가 cross-domain 시대를 준비하는 데 꽤 큰 차이를 만든다고 생각합니다.