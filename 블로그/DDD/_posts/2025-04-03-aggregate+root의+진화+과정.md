---
title: Aggregate Root의 진화 과정
datetime: 2025-04-03T17:20:42.145Z
tags:
  - domain-driven-design
  - ddd
  - aggregate-root
  - transaction
  - account
  - microservices-architecture
  - msa
  - bounded-context
  - eventual-consistency
  - distributed-transaction
nanoId: KXrThLdEZX7eKudh2qU19jY4N
permalink: /KXrThLdEZX7eKudh2qU19jY4N/
---
### Intro

안녕하세요! 오늘은 **도메인 주도 설계(DDD)** 의 핵심 개념 중 하나인 **Aggregate Root (애그리거트 루트)** 의 진화 과정을 살펴보려 합니다. 특히, 금융 시스템의 기본적인 예시인 **Account (계좌)** 와 **Transaction (거래)** 도메인을 중심으로 이야기해볼게요. 초기에는 Transaction을 Account의 하위 엔티티로 모델링했지만, 시간이 지나면서 Aggregate Root로 승격시키는 과정을 자세히 알아보겠습니다.

**DDD**는 복잡한 도메인을 효과적으로 모델링하고 관리하기 위한 설계 방식입니다. 이 중심에는 **Aggregate Root** 라는 중요한 개념이 있습니다.

**Aggregate Root란?**

* Aggregate 내부의 **경계**를 형성합니다.
* Aggregate 내부의 **일관성**을 유지합니다.
* 외부 Aggregate로부터 **독립적**으로 관리되는 엔티티입니다.

Aggregate Root를 얼마나 잘 설계하느냐가 DDD 성공의 핵심이라고 할 수 있습니다.

이번 글에서는 초기 모델링 단계에서 Transaction을 Account에 종속적인 하위 엔티티로 보았지만, 시스템이 발전하고 도메인 요구사항이 변화함에 따라 Transaction의 중요성이 커져 Aggregate Root로 승격시키는 과정을 **진화적인 설계** 관점에서 풀어보겠습니다.

---

### 초기 모델: Account Aggregate와 하위 엔티티 Transaction

초기 모델링 단계에서는 Account와 Transaction을 비교적 단순하게 연결할 수 있습니다.

* **Account (Aggregate Root)**
  * 계좌 자체를 Aggregate Root로 정의합니다.
  * 계좌의 상태 (잔액, 계좌 상태 등) 와 관련된 비즈니스 규칙을 캡슐화합니다.

* **Transaction (Entity, Account의 하위 엔티티)**
  * 거래는 계좌에 종속적인 하위 엔티티로 모델링합니다.
  * 각 거래는 특정 계좌에 속하며, 계좌의 거래 내역을 구성합니다.

```kotlin
// Domain Layer - Account Aggregate
data class Account(
    val accountId: AccountId,
    val userId: UserId,
    var balance: Money,
    val accountStatus: AccountStatus,
    val transactions: MutableList<Transaction> = mutableListOf() // Transaction List를 Account가 소유
) {
    fun deposit(amount: Money) {
        // 입금 로직
        val transaction = Transaction.createCreditTransaction(this.accountId, amount)
        this.transactions.add(transaction)
        this.balance = this.balance.add(amount)
    }

    fun withdraw(amount: Money) {
        // 출금 로직 (잔액 확인, 유효성 검사 등)
        val transaction = Transaction.createDebitTransaction(this.accountId, amount)
        this.transactions.add(transaction)
        this.balance = this.balance.subtract(amount)
    }
    // ... 기타 계좌 관련 비즈니스 로직 ...
}

// Domain Layer - Transaction Entity (하위 엔티티)
data class Transaction(
    val transactionId: TransactionId,
    val accountId: AccountId,
    val transactionType: TransactionType,
    val amount: Money,
    val transactionTime: LocalDateTime
) {
    companion object {
        fun createCreditTransaction(accountId: AccountId, amount: Money): Transaction {
            return Transaction(
                transactionId = TransactionId.generate(),
                accountId = accountId,
                transactionType = TransactionType.CREDIT,
                amount = amount,
                transactionTime = LocalDateTime.now()
            )
        }

        fun createDebitTransaction(accountId: AccountId, amount: Money): Transaction {
            return Transaction(
                transactionId = TransactionId.generate(),
                accountId = accountId,
                transactionType = TransactionType.DEBIT,
                amount = amount,
                transactionTime = LocalDateTime.now()
            )
        }
    }
}
```

초기 모델은 단순하고 이해하기 쉽습니다. Account Aggregate가 Transaction List를 직접 소유하고 관리하며, 계좌 관련 기본적인 비즈니스 로직 (입금, 출금 등)을 Account Aggregate 내에서 처리합니다.

**하위 엔티티 Transaction의 장점 (초기 단계 관점):**

* **단순성**: 모델이 단순하여 초기 개발 및 이해가 쉽습니다.
* **Aggregate 경계 명확**: Account Aggregate 경계가 명확하게 드러납니다.
* **초기 요구사항 반영**: 초기 단계의 단순한 요구사항 (계좌 잔액 관리, 거래 내역 기록)을 충족합니다.

**하지만, 시간이 지나면서 다음과 같은 한계에 직면할 수 있습니다.**

* **Account Aggregate 비대화**: 계좌당 거래 건수가 증가하면 Account Aggregate가 커지고, 메모리 사용량 및 성능 문제가 발생할 수 있습니다.
* **쿼리 성능 저하**: 특정 계좌의 거래 내역을 조회하거나, 복잡한 조건으로 거래를 검색하는 쿼리 성능이 떨어질 수 있습니다.
* **확장성 제한**: Account 서비스의 확장성이 Transaction 데이터 증가에 영향을 받을 수 있습니다.
* **Transaction 자체 기능 확장 어려움**: Transaction 자체에 대한 독립적인 기능 (예: 거래 통계, 분석, 감사 등)을 추가하기 어려워집니다.

---

### 진화의 필요성: Transaction Aggregate Root 승격 고려 시점

시스템이 성장하고 도메인 요구사항이 변화함에 따라, 초기 모델의 한계를 극복하고 Transaction의 중요성이 부각되는 시점이 옵니다. Transaction을 Aggregate Root로 승격시키는 것을 고려해야 할 시점은 다음과 같습니다.

#### 도메인 요구사항 변화

* **Transaction 자체 기능 강화**
  * 사용자들이 거래 내역을 다양한 조건으로 검색하고 싶어합니다. (예: "특정 기간 동안의 입금 거래만 조회")
  * 거래 데이터를 기반으로 통계나 분석 정보를 얻고 싶어합니다. (예: "월별 거래 금액 추이 분석")
* **복잡한 Transaction 비즈니스 규칙 증가**
  * 거래 유형별 수수료 부과, 특정 조건 하의 거래 제한, 감사 로깅 강화 등 Transaction 자체와 관련된 비즈니스 규칙이 복잡해집니다.
* **사용자 Transaction 조회 및 활용 요구 증가**
  * 사용자 인터페이스에서 거래 내역을 더 자세하고 편리하게 조회하고 활용할 수 있도록 개선해야 할 필요성이 커집니다.

#### 데이터 증가 및 성능 문제

* **Transaction 데이터 폭증으로 인한 Account Aggregate 부하 증가**
  * 계좌 수 및 거래 빈도 증가로 Transaction 데이터가 많아져 Account Aggregate가 모든 데이터를 관리하는 데 부담이 커집니다.
  * 메모리 사용량 증가, 응답 시간 지연 등의 성능 문제가 발생합니다.
* **Transaction 관련 쿼리 성능 저하**
  * 특정 계좌 거래 내역 조회, 특정 조건 거래 검색 등 쿼리 성능이 눈에 띄게 저하됩니다.
  * 페이징 처리만으로는 근본적인 개선이 어렵습니다.
* **데이터 관리 비효율성**
  * Account Aggregate에서 모든 Transaction을 관리하는 것이 비효율적이라고 판단될 수 있습니다.
  * Transaction 데이터만 독립적으로 관리하고 필요할 때 Account와 연결하는 방식이 더 효율적일 수 있습니다.

#### 정책 및 조직 변화

* **MSA (Microservices Architecture) 전환 필요성**
  * 시스템 아키텍처를 MSA로 전환하면서 Account 서비스와 Transaction 서비스를 독립적으로 분리하고 싶어집니다.
  * Transaction을 Aggregate Root로 승격시키면, Transaction 서비스를 독립적으로 개발, 배포, 확장하는 것이 용이해집니다.
* **팀 구조 변경 및 책임 분리 요구**
  * Transaction 관련 기능을 전담하는 팀이 새로 구성되거나, 팀 간 책임 분리가 명확해져야 할 필요성이 생깁니다.
  * Transaction을 Aggregate Root로 승격시키고, Transaction 서비스를 별도 팀에서 담당하도록 하면, 개발 및 운영 효율성을 높일 수 있습니다.
* **보안 및 감사 요구사항 강화**
  * 금융 시스템에서 Transaction 데이터는 매우 민감한 정보입니다.
  * 보안 및 감사 요구사항 강화에 따라 Transaction 데이터에 대한 접근 제어, 감사 로깅, 데이터 암호화 등의 보안 기능을 강화해야 합니다.
  * Transaction을 Aggregate Root로 승격시키면, Transaction 데이터에 대한 보안 정책을 더욱 효과적으로 적용하고 관리할 수 있습니다.

---

### Aggregate Root 승격 기준

Transaction을 Aggregate Root로 승격시킬지 여부를 결정하기 위한 기준은 다음과 같습니다.

1. **독립적인 생명주기**:
    * **분석**: Transaction은 초기 생성 시 Account에 의존하지만, 생성 후에는 독립적으로 관리될 수 있습니다. 거래 완료/취소 시 Account 상태를 직접 변경하지 않고 Transaction 자체 상태를 업데이트할 수 있으며, 거래 내역은 Account와 별개로 보관/조회될 수 있습니다.
    * **결론**: Yes에 가까움

2. **비즈니스 규칙의 중심**:
    * **분석**: "잔액 변경", "거래 기록", "수수료 부과" 등 핵심 규칙을 캡슐화합니다.
    * **결과**: Yes

3. **트랜잭션 경계**:
    * **분석**: 생성, 완료, 취소 시 데이터 일관성 보장이 필요합니다.
    * **결과**: Yes

4. **접근 제어 및 격리**:
    * **분석**: 보안/감사 목적으로 접근 제어가 필요하며, Account와 격리하는 것이 유리합니다.
    * **결과**: Yes

5. **식별자**:
    * **분석**: TransactionId로 고유하게 식별됩니다.
    * **결과**: Yes

6. **참조 방식**:
    * **분석**: 다른 Aggregate에서 직접 참조하는 대신 AccountId나 TransactionId로 간접 참조합니다.
    * **결과**: Yes

7. **데이터 양 및 성능**:
    * **분석**: 데이터 양이 증가하고, 독립적인 조회 및 관리가 필요합니다.
    * **결과**: Yes

8. **팀 및 조직 구조**:
    * **분석**: Transaction 중심으로 팀 분리 가능성이 있습니다.
    * **결과**: 상황에 따라 Yes

9. **변경 빈도 및 확장성**:
    * **분석**: 기능 변경 빈도가 높고, 독립적인 확장/배포 가능성이 있습니다.
    * **결과**: 상황에 따라 Yes

**분석 결과**: 대부분의 기준에서 "Yes" 또는 "Yes에 가까움"으로 판단됩니다. 특히 **Q1, Q4, Q6, Q7**은 Transaction을 Aggregate Root로 승격시키는 강력한 근거가 됩니다.

---

### Transaction Aggregate Root 승격의 장점과 효과

Transaction을 Aggregate Root로 승격시키면 다음과 같은 장점과 효과를 얻을 수 있습니다.

* **Transaction 독립적인 관리 및 확장성 확보**:
  * TransactionRepository를 통해 Transaction Aggregate Root를 직접 관리하고 다양한 기능 확장이 용이해집니다. (예: 복잡한 조건 검색, 통계/분석, 감사 로깅)
  * Account Aggregate의 부담을 줄이고 Transaction 데이터 관리를 위임하여 전체 시스템의 확장성을 향상시킬 수 있습니다.

* **성능 최적화 및 확장성 향상**:
  * 대량의 Transaction 데이터를 효율적으로 처리하기 위한 성능 최적화 기법 (TransactionRepository 레벨에서 인덱싱, 페이징, 캐싱 등) 적용이 용이해집니다.
  * Transaction 데이터 증가에 따른 성능 병목 현상을 해결하고 시스템 응답 시간을 단축할 수 있습니다.
  * MSA 환경에서 Transaction 서비스를 독립적으로 확장 및 배포하는 것이 용이해져 시스템 전체의 안정성과 확장성을 높일 수 있습니다.

* **도메인 모델 명확성 및 응집도 증가**:
  * Transaction의 독립적인 역할과 책임을 명확히 정의하고 도메인 모델의 응집도를 높일 수 있습니다.
  * Transaction Aggregate Root는 Transaction 자체의 비즈니스 규칙, 데이터 관리, 조회 기능을 캡슐화하고 Account Aggregate는 계좌 자체의 핵심 비즈니스 규칙에 집중할 수 있도록 모델을 개선할 수 있습니다.
  * 도메인 모델의 의미론적 일관성을 높여 개발자들이 도메인 모델을 더 쉽게 이해하고 유지보수할 수 있도록 돕습니다.

---

### 승격 시 고려사항 및 트레이드오프

Transaction Aggregate Root 승격은 많은 장점을 제공하지만, 몇 가지 고려사항과 트레이드오프가 존재합니다.

* **Aggregate 간 일관성 관리 복잡도 증가**:
  * Account와 Transaction이 서로 다른 Aggregate Root가 되면서 Account-Transaction 간 ACID 트랜잭션 관리가 더 복잡해질 수 있습니다. (예: 계좌 이체 시 Saga 패턴, 분산 트랜잭션 등 고려 필요)

  * Aggregate 간 데이터 정합성을 유지하기 위한 전략 (Eventual Consistency, Compensation Transaction 등) 을 신중하게 설계해야 합니다.

* **도메인 모델 복잡성 증가 및 설계 난이도 상승**:
  * Aggregate Root 수가 증가하면서 도메인 모델이 다소 복잡해질 수 있으며, 개발자들은 더 많은 Aggregate Root와 그 관계를 이해하고 관리해야 합니다.

  * Aggregate 간 관계 설계 및 Aggregate 경계 정의에 대한 고민이 깊어질 수 있습니다. 컨텍스트 경계 (Bounded Context) 를 명확히 설정하고 Aggregate 간 상호작용 방식을 신중하게 설계해야 합니다.

* **개발 및 운영 복잡도 증가 가능성**:
  * Transaction Aggregate Root를 위한 Repository, Service 등 추가 컴포넌트 구현으로 개발 복잡도가 증가할 수 있습니다.
  
  * MSA 환경으로 전환 시 서비스 배포, 모니터링, 트랜잭션 관리 등 운영 복잡도가 증가할 수 있습니다.

---

### 결론: 진화하는 DDD 모델 - 유연성과 적응력

Transaction Aggregate Root 승격은 초기 설계가 완벽할 수 없다는 점, 그리고 도메인과 시스템은 끊임없이 진화한다는 점을 보여주는 좋은 예시입니다. DDD는 처음부터 완벽한 모델을 만드는 것을 목표로 하지 않습니다. 오히려 **진화적인 설계** 를 통해 변화하는 요구사항에 유연하게 대응하고 도메인 모델을 지속적으로 개선해나가는 것을 강조합니다.

Transaction을 하위 엔티티에서 Aggregate Root로 승격시키는 것은 단순한 기술적인 변경이 아니라, 도메인에 대한 이해가 깊어지고 시스템이 성장함에 따라 **모델도 함께 진화**하는 DDD의 핵심 가치를 보여주는 좋은 예제입니다. Aggregate Root 설계는 정적인 결정이 아니라 지속적인 검토와 개선의 대상이라는 점을 기억하고 유연하고 적응력 있는 시스템을 만들어나가시길 바랍니다.