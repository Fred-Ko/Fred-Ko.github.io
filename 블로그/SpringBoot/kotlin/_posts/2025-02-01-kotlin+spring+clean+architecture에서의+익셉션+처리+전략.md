---
title: Kotlin Spring Clean Architecture에서의 익셉션 처리 전략
datetime: 2025-02-01T20:42:33.324Z
tags:
  - clean-architecture
  - kotlin
  - spring
  - exception-handling
  - domain-logic
  - application-services
  - interface-adapters
  - infrastructure
  - single-responsibility-principle
  - error-propagation
nanoId: GmvTJLsoKBbUd1OHPFasYES2l
permalink: /GmvTJLsoKBbUd1OHPFasYES2l/
---
## Intro

클린 아키텍처(Clean Architecture)는 애플리케이션의 각 계층 간 의존성을 명확히 분리하여 **비즈니스 로직의 독립성**과 **유연한 확장성**을 보장합니다. 이런 아키텍처를 Kotlin과 Spring 환경에서 구현할 때, **익셉션(Exception)** 처리는 단순히 오류 메시지를 반환하는 것을 넘어, 각 계층의 책임과 경계를 명확히 하며 **에러 전파와 복구 전략**을 체계적으로 수립하는 것이 중요합니다. 이번 포스트에서는 Kotlin Spring 기반의 클린 아키텍처에서 익셉션을 어떻게 처리하고 설계할 수 있는지에 대해 알아보겠습니다.

---

## 1. 클린 아키텍처와 익셉션 처리의 중요성

클린 아키텍처는 **비즈니스 규칙**(Domain), **애플리케이션 서비스(Application)**, **인터페이스(Adapter)**, **인프라(Infrastructure)** 등의 계층으로 나누어 설계합니다. 이 때, 각 계층에서 발생하는 오류를 어떻게 처리하고 전파할 것인가는 전체 시스템의 안정성과 유지보수성에 큰 영향을 미칩니다.

- **도메인 계층**: 비즈니스 로직과 규칙을 담고 있는 계층으로, 비즈니스 규칙 위반에 대한 익셉션을 정의하고 발생시킬 수 있습니다.
- **애플리케이션 계층**: 유스케이스를 담당하는 계층으로, 도메인 익셉션을 받아 적절한 트랜잭션 롤백이나 오류 처리를 수행합니다.
- **어댑터/인프라 계층**: 외부 시스템(API, 데이터베이스 등)과의 연동을 담당하며, 외부 시스템에서 발생하는 예외를 내부 익셉션으로 매핑하거나 별도의 예외 처리 전략을 구사합니다.

각 계층에서의 익셉션 처리는 **책임의 분리(SRP: Single Responsibility Principle)**와 **명시적 에러 전파**라는 클린 아키텍처의 원칙을 충실히 따르는 방향으로 설계해야 합니다.

---

## 2. 익셉션 처리 전략 구성 요소

클린 아키텍처 내에서의 익셉션 처리 전략은 아래와 같은 구성 요소로 나눌 수 있습니다.

### 2.1 도메인 예외 (Domain Exception)

도메인 계층에서는 비즈니스 로직에 따른 예외를 정의합니다. 예를 들어, 계좌 잔액 부족, 중복 등록 등 비즈니스 규칙 위반에 대해 **커스텀 예외**를 생성할 수 있습니다.

```kotlin
// 도메인 계층 예시: Account.kt
class InsufficientBalanceException(message: String) : RuntimeException(message)

class Account(
    val id: Long,
    var balance: BigDecimal
) {
    fun withdraw(amount: BigDecimal) {
        if (balance < amount) {
            throw InsufficientBalanceException("잔액이 부족합니다.")
        }
        balance -= amount
    }
}
```

도메인 예외는 외부에 직접 노출되기보다는, 애플리케이션 계층에서 캡슐화하여 **비즈니스 로직의 규칙**을 명확하게 표현하는 역할을 합니다.

### 2.2 애플리케이션 예외 (Application Exception)

애플리케이션 계층에서는 도메인 계층에서 발생한 예외를 받아 **트랜잭션 처리**나 **유즈케이스 실패**를 처리합니다. 이 계층에서는 도메인 예외를 잡아 로깅하거나, 상황에 맞게 별도의 예외로 변환할 수 있습니다.

```kotlin
// 애플리케이션 서비스 계층 예시: AccountService.kt
@Service
class AccountService(
    private val accountRepository: AccountRepository
) {
    fun withdraw(accountId: Long, amount: BigDecimal) {
        val account = accountRepository.findById(accountId)
            ?: throw NotFoundException("계좌를 찾을 수 없습니다.")

        try {
            account.withdraw(amount)
            accountRepository.save(account)
        } catch (e: InsufficientBalanceException) {
            // 도메인 예외를 잡아서 추가적인 로깅이나 처리 후 다시 던질 수 있음.
            throw BusinessException("출금 처리 중 오류 발생: ${e.message}")
        }
    }
}
```

여기서 `NotFoundException`이나 `BusinessException`은 애플리케이션 전반에서 사용할 수 있는 공통 커스텀 예외로 정의하여 **일관된 예외 처리를** 구현할 수 있습니다.

### 2.3 어댑터 및 프레젠테이션 계층 예외 처리

Spring Boot에서는 `@ControllerAdvice`와 `@ExceptionHandler`를 사용해 전역 예외 처리를 구현할 수 있습니다. 이를 통해 클라이언트에게 일관된 **에러 응답 포맷**을 제공할 수 있습니다.

```kotlin
// 전역 익셉션 핸들러 예시: GlobalExceptionHandler.kt
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFound(ex: NotFoundException, request: WebRequest): ResponseEntity<ErrorResponse> {
        val errorResponse = ErrorResponse(
            message = ex.message ?: "리소스를 찾을 수 없습니다.",
            errorCode = "NOT_FOUND"
        )
        return ResponseEntity(errorResponse, HttpStatus.NOT_FOUND)
    }

    @ExceptionHandler(BusinessException::class)
    fun handleBusiness(ex: BusinessException, request: WebRequest): ResponseEntity<ErrorResponse> {
        val errorResponse = ErrorResponse(
            message = ex.message ?: "비즈니스 처리 중 오류가 발생했습니다.",
            errorCode = "BUSINESS_ERROR"
        )
        return ResponseEntity(errorResponse, HttpStatus.BAD_REQUEST)
    }

    // 모든 미처리 익셉션 처리
    @ExceptionHandler(Exception::class)
    fun handleException(ex: Exception, request: WebRequest): ResponseEntity<ErrorResponse> {
        val errorResponse = ErrorResponse(
            message = "예상치 못한 오류가 발생했습니다.",
            errorCode = "INTERNAL_SERVER_ERROR"
        )
        return ResponseEntity(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR)
    }
}

data class ErrorResponse(
    val message: String,
    val errorCode: String
)
```

이처럼 전역 익셉션 핸들러를 활용하면, 각 컨트롤러에서는 예외에 대한 처리를 별도로 구현할 필요 없이 **비즈니스 로직에 집중**할 수 있습니다.

---

## 3. Kotlin의 특성을 살린 익셉션 처리

Kotlin은 **널 안정성(Null Safety)**, **데이터 클래스(Data Classes)**, **표현식(Expression)** 등 다양한 기능을 제공하여 익셉션 처리에서도 보다 간결한 코드 작성을 도와줍니다.

### 3.1 함수형 스타일의 예외 처리

Kotlin에서는 `runCatching`, `fold`, `getOrElse`와 같은 함수형 API를 활용하여 예외를 우아하게 처리할 수 있습니다. 예를 들어, 아래와 같이 특정 로직에서 발생하는 예외를 처리하고 기본 값을 반환할 수 있습니다.

```kotlin
fun performOperation(): String {
    return runCatching {
        // 예외 발생 가능성이 있는 로직
        riskyOperation()
    }.getOrElse { exception ->
        // 예외 발생 시 처리 로직
        "기본값 반환"
    }
}

fun riskyOperation(): String {
    // 예외 발생
    throw IllegalStateException("실패!")
}
```

이 방식은 **명시적인 try-catch 블록** 대신, 함수형 스타일로 간결하게 예외 상황을 처리할 수 있는 장점이 있습니다.

### 3.2 Sealed Class를 활용한 결과 표현

또 다른 방법으로, Kotlin의 `sealed class`를 사용해 성공/실패 결과를 표현하는 방식도 고려할 수 있습니다. 이 방법은 익셉션 대신 명시적인 결과 타입을 반환하여, 호출자가 반드시 성공/실패를 처리하도록 유도합니다.

```kotlin
sealed class OperationResult {
    data class Success(val data: String) : OperationResult()
    data class Failure(val error: String) : OperationResult()
}

fun performOperation(): OperationResult {
    return try {
        val result = riskyOperation()
        OperationResult.Success(result)
    } catch (e: Exception) {
        OperationResult.Failure(e.message ?: "오류 발생")
    }
}

fun riskyOperation(): String {
    throw IllegalStateException("실패!")
}
```

이러한 패턴은 특히 **비즈니스 로직의 명시적 결과 처리**에 유용하며, 익셉션의 전파를 막고 **타입 안전성**을 높이는 장점이 있습니다.

---

## 4. 계층 간 예외 전파와 변환 전략

클린 아키텍처에서는 **계층 간 경계**를 넘나들 때 예외를 그대로 전달하기보다는, 각 계층의 책임에 맞게 **예외를 변환**하는 것이 좋습니다.

- **도메인 계층**: 도메인 규칙 위반에 따른 커스텀 예외를 발생시킵니다.
- **애플리케이션 계층**: 도메인 익셉션을 받아 비즈니스 예외나, 필요에 따라 재정의된 예외로 변환합니다.
- **어댑터 계층**: 외부 API 또는 컨트롤러에서 예외를 받아 적절한 HTTP 상태 코드와 에러 메시지로 매핑합니다.

이러한 전파와 변환 과정을 통해, **내부 구현 상세 정보**를 외부에 노출하지 않으면서도, **명확한 에러 메시지**와 **응답 코드**를 클라이언트에게 전달할 수 있습니다.

---

## 5. 마무리

Kotlin과 Spring을 활용한 클린 아키텍처 환경에서의 익셉션 처리 전략은 **각 계층의 역할과 책임**을 명확히 하면서, **일관된 에러 전파 메커니즘**을 수립하는 것이 핵심입니다. 도메인 예외와 애플리케이션 예외를 구분하고, 전역 익셉션 핸들러를 통해 클라이언트에게 표준화된 에러 응답을 제공함으로써, 시스템 전체의 안정성과 유지보수성을 크게 향상시킬 수 있습니다.

또한, Kotlin의 함수형 프로그래밍 스타일과 sealed class를 적절히 활용하면, 더욱 **명확하고 간결한** 예외 처리 로직을 구현할 수 있습니다.

이 포스트가 여러분의 Kotlin Spring Clean Architecture 프로젝트에서 효과적인 익셉션 처리 전략을 수립하는 데 도움이 되길 바랍니다.