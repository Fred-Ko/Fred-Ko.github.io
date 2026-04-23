---
title: GraphQL과 DDD (1) - GraphQL을 REST처럼 쓰고 있지는 않나요?
datetime: 2026-02-22T09:44:55.698Z
tags:
  - graphql
  - relay
  - domain-driven-design
  - cursor-pagination
  - graph-traversal
  - graphql-schema
nanoId: BmN8lVtxWOZeJWa8JtA7R9GWx
permalink: /BmN8lVtxWOZeJWa8JtA7R9GWx/
---
## Intro

이 글은 시리즈의 첫 번째 글입니다. GraphQL과 DDD를 본격적으로 붙여 보기 전에, 먼저 제가 GraphQL을 바라보는 관점이 어떻게 바뀌었는지부터 정리해 보려 합니다.

GraphQL을 도입한 팀을 보다 보면 흥미로운 장면을 자주 마주치게 됩니다. 스키마를 정의하고, Query와 Mutation을 만들고, 클라이언트에서 필요한 필드를 골라 요청하는 데까지는 의외로 금방 도달합니다. 그런데 어느 순간부터 문득 이런 생각이 들 때가 있습니다.

**“이거, 엔드포인트만 하나로 합쳐진 REST처럼 쓰고 있는 것 아닌가?”**

```graphql
# 이 쿼리가 REST의 GET /users/:id 와 얼마나 다른가?
query {
  getUser(id: "123") {
    id
    name
    email
  }
}
```

물론 이런 형태가 잘못이라고 단정하고 싶은 마음은 없습니다. 팀마다 GraphQL을 도입하는 이유가 다르고, 어떤 경우에는 이 정도만으로도 충분히 큰 가치를 얻을 수 있으니까요.

- 기존 REST API 위에 얇은 BFF를 빠르게 올려야 할 수도 있고
- 모바일/웹 화면 단위의 필드 선택 최적화가 우선일 수도 있고
- 조직이 GraphQL 운영 경험을 아직 쌓는 중일 수도 있습니다

그래서 이 글은 “이게 맞다, 저건 틀리다”를 말하려는 글이라기보다, **제가 GraphQL을 보면서 점점 더 강하게 느끼게 된 문제의식**을 정리해 보려는 글에 가깝습니다.

저에게 GraphQL은 단순히 필드를 골라 받는 문법이라기보다, **도메인 사이의 관계를 바깥으로 드러내는 방식**처럼 느껴졌습니다. 그리고 그 관계를 어떻게 다루느냐를 생각하다 보니, 특히 그래프 탐색과 Relay 쪽의 관점이 꽤 흥미롭게 다가왔습니다.

이번 글에서는 그 흐름을 따라 세 가지를 이야기해 보려 합니다.

1. 왜 어떤 GraphQL은 REST의 연장선처럼 느껴지는가
2. 그래프 탐색이라는 관점이 왜 자꾸 중요하게 보였는가
3. Relay Cursor Connection이 왜 생각보다 설득력 있게 다가왔는가

---

## 1. “REST with GraphQL Syntax” 안티패턴

### 증상 진단

아래와 같은 모습이 보이면, 저는 종종 “아직 REST식 사고방식이 많이 남아 있구나”라는 느낌을 받습니다.

| 증상 | 설명 | REST 대응물 |
| --- | --- | --- |
| **Resource-style Query 네이밍** | `getUser`, `getOrders`, `fetchProduct` 같은 동사형 쿼리 | `GET /users/:id` |
| **플랫한 스키마 구조** | 타입 간 관계가 약하고, Root Query에서 대부분의 조회가 시작됨 | 각 엔드포인트가 독립적 |
| **ID 기반의 수동 조인** | `userId`를 받아 다시 `orders`, `reviews`를 따로 조회 | 클라이언트 사이드 조인 |
| **Offset 기반 페이지네이션** | `page`, `limit` 중심의 리스트 API | `?page=2&limit=20` |
| **과도한 Root Query** | 모든 데이터를 최상위 Query에서만 접근 | 엔드포인트 수만 많아진 REST |

이런 구조가 반드시 나쁘다고 보지는 않습니다. 다만 이런 형태가 오래 유지되면, GraphQL의 장점이 결국 **“응답 shape를 조금 더 유연하게 고를 수 있는 API”** 정도로만 남는다는 느낌을 받곤 했습니다. 한 번의 쿼리 안에서 관계를 따라 자연스럽게 이동하는 맛은 생각보다 잘 살아나지 않기 때문입니다.

### 이것이 왜 생기는가

제가 보기엔 가장 큰 이유는 **사고 모델이 충분히 바뀌지 않기 때문**입니다.

REST에서는 리소스를 URI로 식별하고, HTTP 메서드로 행위를 표현하는 방식이 몸에 배어 있습니다. 그 익숙한 감각을 그대로 가져오면 GraphQL의 타입 시스템도 자연스럽게 “응답 DTO를 정의하는 틀”처럼 쓰이게 됩니다.

```graphql
# ❌ REST 사고방식: 독립적인 조회 함수의 나열
type Query {
  getUser(id: ID!): User
  getUserOrders(userId: ID!, page: Int, limit: Int): [Order!]!
  getOrderItems(orderId: ID!): [OrderItem!]!
}

# Graph 사고방식: 노드와 엣지를 따라 탐색 가능한 구조
type Query {
  node(id: ID!): Node
  viewer: User
}

type User implements Node {
  id: ID!
  name: String!
  orders(first: Int, after: String): OrderConnection!
}

type Order implements Node {
  id: ID!
  items: [OrderItem!]!
  customer: User!
}
```

후자의 구조를 볼 때마다 저는 “아, GraphQL은 단순히 조회 함수를 보기 좋게 모아놓는 도구가 아니라, **탐색 가능한 구조를 표면에 드러내는 데 더 어울리는 도구일지도 모르겠다**”는 생각을 하게 됐습니다.

그렇다고 모든 팀이 처음부터 완전한 그래프 모델을 가져야 한다고 생각하진 않습니다. 다만 시간이 지나도 계속 `getX`, `getY`, `getZ`만 늘어나는 구조라면, 언젠가는 “우리는 GraphQL로 무엇을 얻고 있지?”라는 질문을 하게 될 가능성이 높다고 느꼈습니다.

---

## 2. 그래프 탐색이란 무엇인가?

### 도메인은 본질적으로 그래프다

“도메인은 본질적으로 그래프다”라고 아주 강하게 말하는 건 조금 조심스럽지만, 적어도 제 눈에는 **많은 도메인이 그래프처럼 보일 때가 많았습니다.**

```text
[User] ──orders──▶ [Order] ──items──▶ [OrderItem]
  │                   │                    │
  │                   │                    ▼
  │                   └──payment──▶ [Payment]
  │                                        │
  └──────reviews──▶ [Review] ◀──about──────┘
```

사용자, 주문, 결제, 리뷰처럼 현실의 개념들을 놓고 보면, 결국 중요한 것은 개별 노드만이 아니라 **그 사이의 관계**인 경우가 많았습니다. REST에서는 이 관계를 여러 엔드포인트와 여러 번의 호출로 조립해야 했다면, GraphQL은 그 관계망 자체를 API로 드러낼 수 있다는 점이 저에겐 꽤 인상적이었습니다.

### GraphQL에서 유용한 그래프 모델링 요소

여기서 말하는 `Node`, `Connection`, `Edge`, `cursor` 같은 개념은 GraphQL 스펙의 필수 요소라기보다, **특히 Relay 쪽에서 잘 정리해 놓은 설계 관례**에 가깝습니다. 그래서 모든 서비스가 꼭 이렇게 해야 한다고 생각하진 않지만, 관계 탐색과 캐시 정규화, 페이지네이션 안정성이 중요해질수록 점점 설득력 있게 느껴졌습니다.

#### 1) Global Object Identification (`Node` 인터페이스)

```graphql
interface Node {
  id: ID!
}

type Query {
  node(id: ID!): Node
  nodes(ids: [ID!]!): [Node]!
}
```

이 패턴을 처음 봤을 때는 “그냥 ID 조회를 한 군데로 모은 건가?” 싶었습니다. 그런데 계속 보다 보니 이 구조가 주는 감각이 꽤 다르더군요. REST에서는 리소스 타입마다 별도 엔드포인트가 있는 것이 자연스럽지만, `node(id: ID!)`는 타입에 상관없이 **그래프 전체에서 어떤 노드든 하나의 진입점으로 접근한다**는 느낌을 줍니다.

이런 방식이 클라이언트 캐시와도 잘 맞물린다는 점까지 생각하면, 단순한 취향 차이 이상의 설계 의도가 느껴졌습니다.

#### 2) 관계를 필드로 노출하기

```graphql
query {
  viewer {
    name
    orders(first: 5) {
      edges {
        node {
          id
          totalAmount
          items {
            product {
              name
              reviews(first: 3) {
                edges {
                  node {
                    rating
                    author { name }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

이런 쿼리를 보고 있으면, 저는 GraphQL의 매력이 단순히 “필드 몇 개 덜 받는다”는 데만 있지 않다고 느끼게 됩니다. 오히려 **사용자가 알고 싶은 정보의 흐름을 한 번에 표현할 수 있다**는 점이 더 크게 다가옵니다. `viewer → orders → items → product → reviews`로 이어지는 경로 자체가 하나의 질문처럼 읽히기 때문입니다.

### 다만, 자유로운 탐색에는 비용이 따른다

그렇다고 이 자유로움이 마냥 낭만적이라고 생각하진 않습니다. 실무로 갈수록 이런 자유는 꽤 무거운 대가를 동반합니다.

- **N+1 문제**
- **Query depth / complexity 폭증**
- **필드 단위 authorization 복잡성 증가**
- **Federation 환경에서의 네트워크 홉 증가**
- **과도한 탐색(over-traversal)**

그래서 저는 Query가 Mutation보다 더 탐색적으로 열려 있을 수는 있다고 보지만, **운영 제약과 함께 설계되어야만 의미가 있다**고 느낍니다. DataLoader, complexity analysis, depth limit, persisted query 같은 이야기들이 결국 계속 따라오는 이유도 여기에 있다고 봅니다.

---

## 3. Relay Cursor Connection 스펙: 왜 Edge와 Node가 분리되는가?

### 왜 `Connection → Edge → Node` 구조를 쓰는가

Relay Connection 구조를 처음 접했을 때는 솔직히 저도 “왜 이렇게까지 복잡하지?”라는 생각을 했습니다.

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  cursor: String!
  node: User!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

겉으로 보기엔 그냥 `[User!]!` 하나면 될 것 같으니까요. 그런데 조금 더 들여다보면 이 구조가 단순히 “리스트를 한 겹 더 감싼 것” 이상이라는 점이 보입니다. 페이지네이션 상태를 표준화할 수 있고, 관계 자체의 메타데이터를 담을 수 있고, 실시간으로 변하는 목록에서도 비교적 안정적인 탐색이 가능해집니다.

그래서 지금은 이 구조를 볼 때마다, Relay가 괜히 복잡함을 좋아해서 이런 모양을 만든 건 아니구나 하는 생각을 하게 됩니다.

### Edge는 왜 필요한가

Edge 개념이 특히 흥미로웠던 이유는, **관계 자체가 정보를 가질 수 있다**는 점을 아주 분명하게 드러내기 때문입니다.

```graphql
type TeamMemberEdge {
  cursor: String!
  node: User!
  role: TeamRole!
  joinedAt: DateTime!
  permissions: [Permission!]!
}
```

여기서 `role`, `joinedAt`, `permissions`는 User 자체의 속성이라고 보기 어렵습니다. 같은 사용자라도 어떤 팀에 속해 있는지에 따라 역할과 권한이 달라질 수 있으니까요. 이럴 때 Edge는 단순한 연결선이 아니라, **그 연결의 맥락을 담는 자리**처럼 느껴졌습니다.

캐시 관점에서도 이 구분은 꽤 설득력 있습니다. 동일한 User 노드가 어디서 조회되든 같은 정체성을 가져야 한다면, 컨텍스트에 따라 달라지는 정보는 노드보다 관계 쪽에 두는 편이 더 자연스럽게 느껴집니다.

### Cursor 기반 페이지네이션이 Offset보다 유리한 이유

| 항목 | Offset 기반 (`page`, `limit`) | Cursor 기반 (`first`, `after`) |
| --- | --- | --- |
| **실시간 데이터 안정성** | 삽입/삭제 시 누락·중복 가능 | 특정 엣지를 기준으로 안정적 탐색 |
| **성능** | `OFFSET`이 커질수록 비효율적일 수 있음 | 인덱스 기반 탐색에 유리 |
| **양방향 탐색** | 구현이 제각각 | `first/after`, `last/before`로 표준화 가능 |
| **무한 스크롤 적합성** | 상대적으로 낮음 | 높음 |
| **임의 페이지 점프** | 쉬움 | 어렵거나 비권장 |

제가 Cursor pagination을 좋게 보게 된 이유는, 이게 단순히 “더 좋은 페이지네이션”이라서라기보다 **그래프의 관계 목록을 어떻게 안정적으로 잘라 탐색할 것인가**에 대한 꽤 일관된 답처럼 느껴졌기 때문입니다.

다만 이것 역시 언제나 정답이라고 생각하진 않습니다. 관리자 화면처럼 임의 페이지 점프가 중요하고, 목록이 단순하며, 실시간 삽입/삭제의 안정성이 덜 중요하다면 offset이 더 실용적일 때도 분명히 있습니다.

### 언제는 과할 수 있는가

실제로 다음과 같은 상황에서는 full Connection 모델이 조금 무겁게 느껴질 수도 있다고 생각합니다.

- 내부 운영 도구처럼 목록 규모가 작을 때
- 사용자가 17페이지, 38페이지처럼 임의 접근을 자주 할 때
- Relay 기반 클라이언트가 아니라 단순 조회 화면이 대부분일 때

그래서 저에겐 Connection이 “무조건 써야 하는 정답”이라기보다, **필요한 순간 강하게 설득되는 패턴**처럼 느껴집니다.

---

## 여기까지의 생각 정리

여기까지는 제가 GraphQL을 보며 반복해서 느꼈던 세 가지 감각을 정리해 본 셈입니다.

1. GraphQL이 REST의 대체 문법처럼만 쓰이면 생각보다 금방 한계가 드러난다.
2. GraphQL의 매력은 필드 선택 자체보다, 관계를 따라 탐색 가능한 구조를 드러내는 데 더 크게 있다.
3. Relay의 `Node`, `Edge`, `Connection` 같은 관례는 처음엔 복잡해 보여도, 그래프를 안정적으로 다루기 위한 꽤 설득력 있는 방식으로 느껴진다.

원래는 여기서 바로 DDD 이야기까지 한 글 안에서 이어가려 했습니다. 그런데 쓰다 보니 그 부분은 결이 조금 달랐습니다. 앞부분이 “GraphQL을 어떻게 바라보게 되었는가”에 가까웠다면, 그다음부터는 “그 관점을 DDD와 만나게 했을 때 무엇이 잘 맞고 어디서 긴장이 생기는가”를 따로 풀어야 더 자연스럽겠다는 생각이 들었습니다.

그래서 **`GraphQL과 DDD` 이후 내용은 후속글로 분리**하려 합니다. 후속글에서는, 지금 프로젝트에서 실제로 지키고 있는 Relay 계열 GraphQL 컨벤션과 DDD, CQRS 설계 방식을 바탕으로 다음 이야기를 이어가게 됩니다.

- Relay 계열 GraphQL 컨벤션과 DDD를 모두 엄격하게 따를 때 어떤 장점과 제약이 생기는가
- DDD / CQRS 철학과 GraphQL 스키마가 어디서 충돌하는가
- `mutationId`, raw id 비공개 payload, resolve field, read replica 환경에서 mutation payload 최신성을 어떻게 보장할 것인가
- 모듈러 모놀리스에서 시작해 이후 MSA / Federation까지 고려하려면 어떤 태도가 필요한가

적어도 제게는, GraphQL을 단순한 조회 문법이 아니라 **도메인의 관계를 바깥으로 드러내는 방식**으로 보기 시작하면서부터 DDD 이야기가 훨씬 흥미롭게 들어오기 시작했습니다. 그 지점은 후속글에서 조금 더 구체적으로 정리해 보겠습니다.