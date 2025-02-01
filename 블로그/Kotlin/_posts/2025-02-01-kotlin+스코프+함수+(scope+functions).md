---
title: Kotlin - 스코프 함수 (Scope Functions)
datetime: 2025-01-30T15:33:45.799Z
tags:
  - kotlin
  - scope-functions
  - let
  - apply
  - run
  - with
  - also
  - null-safety
  - code-readability
  - maintenance
nanoId: pVaWbnmfol21w8O7F9vd9orSg
permalink: /pVaWbnmfol21w8O7F9vd9orSg/
---
## Intro

코틀린에서는 `let`, `apply`, `run`, `with`, `also` 같은 스코프 함수를 활용하여 코드를 더 간결하고 읽기 쉽게 만들 수 있습니다. 하지만 이 함수들은 목적과 반환값이 다르기 때문에 올바르게 사용하지 않으면 가독성과 유지보수성이 오히려 저하될 수 있습니다.

이 글에서는 **각 스코프 함수의 차이점**, **실제 개발에서 활용할 수 있는 패턴**, 그리고 **자주 발생하는 실수**를 살펴봅니다.

---

## 1. 스코프 함수가 필요한 이유

### 📌 일반적인 문제: 중첩된 null 체크

아래 코드는 `null` 검사를 여러 번 수행하며, 불필요한 중복 참조가 발생합니다.

```kotlin
fun processUser(user: User?) {
    if (user != null) {
        if (user.profile != null) {
            val email = user.profile!!.email
            sendEmail(email)
            logger.info("Email sent to $email")  // `!!` 연산자로 NPE 위험
        }
    }
}
```

### ✅ 스코프 함수를 활용한 개선

`let`을 사용하면 `null` 처리를 더 간결하게 할 수 있습니다.

```kotlin
fun processUser(user: User?) {
    user?.profile?.email?.let { email ->
        sendEmail(email)
        logger.info("Email sent to $email")  // `email`은 non-null이 보장됨
    }
}
```

---

## 2. 스코프 함수별 특징과 사용법

### ① `let` - 변환 및 null 처리에 적합

```kotlin
fun getUserSummary(user: User?): String {
    return user?.let { safeUser ->
        "${safeUser.name}님의 회원 등급: ${calculateGrade(safeUser)}"
    } ?: "Unknown User"
}

// ✅ 체이닝 예제
fun processOrder(order: Order?) {
    order?.let {
        inventoryService.checkStock(it)
    }?.let { isAvailable ->
        notificationService.notifyAvailability(isAvailable)
    }
}
```

### ② `apply` - 객체 초기화에 유용

```kotlin
fun createUser(username: String): User {
    return User().apply {
        this.username = username
        this.createdAt = LocalDateTime.now()
        this.status = UserStatus.ACTIVE
    }
}
```

### ③ `run` vs `with` - 계산 및 블록 실행

```kotlin
// run: 객체의 속성을 이용하여 값 반환
val discount = product.run {
    if (isPremium) price * 0.8 else price * 0.9
}

// with: 객체를 전달받아 여러 작업 실행
val summary = with(report) {
    appendHeader(title)
    appendBody(content)
    appendFooter(timestamp)
    toString()
}
```

### ④ `also` - 중간 검증 및 로깅

```kotlin
fun registerUser(user: User) {
    user.also {
        require(it.email.contains("@")) { "유효하지 않은 이메일" }
    }.let(userRepository::save)
}
```

---

## 3. 실무에서 자주 발생하는 실수

### ❌ 1. `let`의 중첩 사용

```kotlin
// ❌ 지나치게 중첩된 let 사용
user?.let { u ->
    u.profile?.let { p ->
        p.email?.let { e ->
            sendEmail(e)
        }
    }
}

// ✅ Safe Call과 takeIf를 활용한 개선
user?.profile?.email?.takeIf { it.isNotEmpty() }?.let(::sendEmail)
```

### ❌ 2. `apply`의 반환값 착각

```kotlin
// ❌ 의도와 다른 결과
val size = StringBuilder().apply {
    append("Hello")
    append("World")
}.length  // StringBuilder를 반환하므로 원하는 값이 아님

// ✅ run을 사용하여 원하는 값 반환
val length = StringBuilder().run {
    append("Hello")
    append("World")
    length  // 마지막 표현식의 결과를 반환
}
```

### ❌ 3. 변수명 혼동으로 인한 가독성 저하

```kotlin
class UserService {
    private var currentUser: User? = null

    fun update(user: User?) {
        user?.let {
            currentUser = it  // it이 currentUser와 혼동될 가능성 있음
            loadProfile()
        }
    }
}

// ✅ 명시적인 변수명을 사용하여 가독성 개선
fun update(user: User?) {
    user?.let { newUser ->
        currentUser = newUser
        loadProfile()
    }
}
```

---

## 4. 언제 어떤 스코프 함수를 선택해야 할까?

### 📝 함수 선택 기준

| **사용 목적**           | **적합한 스코프 함수** | **리턴 타입**             |
| ------------------- | -------------- | --------------------- |
| 객체 생성 후 초기화         | `apply`        | 객체 자기 자신 (`this`)     |
| 값 변환 또는 `null` 체크   | `let`          | 람다 결과 값 (`it -> R`)   |
| 계산 후 값 반환           | `run`          | 람다 결과 값 (`this -> R`) |
| 하나의 객체에 대해 여러 작업 실행 | `with`         | 람다 결과 값 (`this -> R`) |
| 체이닝 과정에서 로깅이나 검증 추가 | `also`         | 객체 자기 자신 (`it`)       |

### ⚡ 성능 및 유지보수 팁

- **스코프 함수 체이닝은 최대 3개까지만**: 가독성이 급격히 저하됨
- **람다 코드 블록이 길어지면 함수로 추출**: 스코프 함수 내부에서 너무 많은 작업을 하지 않도록 주의
- **컬렉션 처리 시 `asSequence()` 활용**: 불필요한 중간 연산을 줄여 성능 최적화

---

## 5. 실전에서 활용할 수 있는 패턴

### 패턴 1: 안전한 타입 변환

```kotlin
val asset: Any = getAsset()

// `when`을 대체하는 스코프 함수 활용
(asset as? ImageAsset)?.let { it.loadPreview() }
    ?: (asset as? VideoAsset)?.let { it.loadThumbnail() }
```

### 패턴 2: 리소스 자동 관리 (`use`와 조합)

```kotlin
File("data.log").bufferedWriter().use { writer ->
    writer.run {
        append("START\n")
        appendLines(logData)
        append("END")
    }
}
```

### 패턴 3: 코틀린 DSL 스타일 구성

```kotlin
fun createMenu() = menu {
    item("Home", icon = R.drawable.ic_home)
    separator()
    group("Settings") {
        item("Account")
        item("Notifications")
    }
}.apply {
    setTheme(DarkTheme)
}
```

---

## 결론

스코프 함수는 **코틀린 코드의 가독성과 효율성을 높이는 강력한 도구**입니다. 하지만 무분별하게 사용하면 코드가 오히려 복잡해질 수 있으므로, **각 함수의 목적과 반환값을 정확히 이해하고 활용하는 것이 중요합니다.**