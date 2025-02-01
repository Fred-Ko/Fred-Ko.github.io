---
title: Kotlin - when
datetime: 2025-02-01T21:29:51.530Z
tags:
  - kotlin
  - when-expression
  - spring-kotlin
  - spring-framework
  - java-switch-case
  - if-else-statement
  - code-readability
  - maintenance
  - programming-concepts
nanoId: DPOrbXV8bZcz2WMtrIoN3Yd8o
permalink: /DPOrbXV8bZcz2WMtrIoN3Yd8o/
---
## Intro

코틀린의 `when`은 단순한 `switch-case` 문을 대체하는 것을 넘어, 더 강력하고 유연한 조건문을 제공합니다. 특히 **스프링 기반의 코틀린 애플리케이션**에서 `when`을 적절히 활용하면 **가독성과 유지보수성이 향상**되며, 중복을 줄이고 명확한 비즈니스 로직을 구현할 수 있습니다.

이 글에서는 `when`의 특징과 활용법을 살펴보고, **일반적인 `if-else` 방식과 비교하여 `when`이 왜 더 나은지** 설명하며, 실무에서 유용한 **스프링 코틀린 예제**를 소개합니다.

---

## 1. `when`을 사용해야 하는 이유

자바에서는 `switch-case` 문을 사용할 수 있지만, 여러 가지 제한이 있습니다.

- **반환 값 없음**: `switch` 자체가 값을 반환하지 못하고, `break`를 빠뜨리면 fall-through가 발생할 수 있음
- **복잡한 표현 불가**: 단순한 정수나 `enum` 값만 비교 가능
- **가독성 저하**: 여러 가지 조건을 처리하려면 중첩된 `if-else`로 이어지기 쉬움

코틀린의 `when`은 이 모든 문제를 해결할 수 있습니다.

- **표현식 사용 가능**: `when`은 값을 반환할 수 있음
- **다양한 조건 비교 가능**: `Int`, `String`, `Enum`, `클래스`, `범위`, `is` 검사까지 활용 가능
- **가독성 향상**: 여러 조건을 한눈에 보기 좋게 정리 가능

---

## 2. 기본적인 `when` 사용법

### 🛑 `if-else` 방식

```kotlin
fun getUserRoleDescription(role: UserRole): String {
    return if (role == UserRole.ADMIN) {
        "관리자 권한을 가집니다."
    } else if (role == UserRole.MANAGER) {
        "매니저 권한을 가집니다."
    } else if (role == UserRole.USER) {
        "일반 사용자입니다."
    } else {
        "알 수 없는 역할입니다."
    }
}
```

### ✅ `when`을 활용한 개선

```kotlin
fun getUserRoleDescription(role: UserRole) = when (role) {
    UserRole.ADMIN -> "관리자 권한을 가집니다."
    UserRole.MANAGER -> "매니저 권한을 가집니다."
    UserRole.USER -> "일반 사용자입니다."
}
```

#### 🔍 `when`을 활용한 이점

✅ **가독성 향상**: 중첩된 `if-else` 없이 한눈에 보기 쉬움  
✅ **간결한 코드**: `return` 없이 `when` 자체가 값을 반환할 수 있음

---

## 3. `when`을 활용한 예제

### ① REST API 요청 타입에 따른 처리

#### 🛑 `if-else` 방식

```kotlin
@RestController
@RequestMapping("/users")
class UserController(private val userService: UserService) {

    @PostMapping("/{action}")
    fun handleUserAction(@PathVariable action: String, @RequestBody request: UserRequest): ResponseEntity<String> {
        return if (action.lowercase() == "register") {
            ResponseEntity.ok(userService.registerUser(request))
        } else if (action.lowercase() == "update") {
            ResponseEntity.ok(userService.updateUser(request))
        } else if (action.lowercase() == "delete") {
            ResponseEntity.ok(userService.deleteUser(request.id))
        } else {
            ResponseEntity.badRequest().body("Invalid action: $action")
        }
    }
}
```

#### ✅ `when`을 활용한 개선

```kotlin
@RestController
@RequestMapping("/users")
class UserController(private val userService: UserService) {

    @PostMapping("/{action}")
    fun handleUserAction(@PathVariable action: String, @RequestBody request: UserRequest): ResponseEntity<String> {
        return when (action.lowercase()) {
            "register" -> ResponseEntity.ok(userService.registerUser(request))
            "update" -> ResponseEntity.ok(userService.updateUser(request))
            "delete" -> ResponseEntity.ok(userService.deleteUser(request.id))
            else -> ResponseEntity.badRequest().body("Invalid action: $action")
        }
    }
}
```

#### 🔍 `when`을 활용한 이점

✅ **중복 제거**: `ResponseEntity.ok()`를 여러 번 반복하지 않음  
✅ **가독성 향상**: `if-else` 중첩 없이 한눈에 보기 쉬운 구조  
✅ **유지보수 용이**: 새로운 액션 추가 시 `when`에 추가만 하면 됨

---

### ② 스프링의 `@Service` 계층에서 `when` 활용

사용자의 역할(Role)에 따라 다른 비즈니스 로직을 수행해야 하는 경우 `when`이 강력한 도구가 될 수 있습니다.

#### 🛑 `if-else` 방식

```kotlin
@Service
class AuthorizationService {

    fun checkPermissions(user: User, action: UserAction): Boolean {
        if (user.role == UserRole.ADMIN) {
            return true
        } else if (user.role == UserRole.MANAGER) {
            return action == UserAction.VIEW || action == UserAction.EDIT
        } else if (user.role == UserRole.USER) {
            return action == UserAction.VIEW
        }
        return false
    }
}
```

#### ✅ `when`을 활용한 개선

```kotlin
@Service
class AuthorizationService {

    fun checkPermissions(user: User, action: UserAction): Boolean {
        return when (user.role) {
            UserRole.ADMIN -> true
            UserRole.MANAGER -> action in listOf(UserAction.VIEW, UserAction.EDIT)
            UserRole.USER -> action == UserAction.VIEW
        }
    }
}
```

#### 🔍 `when`을 활용한 이점

✅ **명확한 역할 정의**: 각 역할과 액션의 관계를 직관적으로 표현  
✅ **유지보수 용이**: 새로운 역할이 추가될 경우 `when`에 한 줄 추가

---

### ③ `when`을 활용한 예외 처리

#### 🛑 `if-else` 방식

```kotlin
fun validateUser(user: User) {
    if (user.username.isBlank()) {
        throw IllegalArgumentException("사용자 이름은 비어 있을 수 없습니다.")
    }
    if (user.email.isBlank()) {
        throw IllegalArgumentException("이메일은 비어 있을 수 없습니다.")
    }
    if (!user.email.contains("@")) {
        throw IllegalArgumentException("올바른 이메일 형식이 아닙니다.")
    }
}
```

#### ✅ `when`을 활용한 개선

```kotlin
fun validateUser(user: User) {
    when {
        user.username.isBlank() -> throw IllegalArgumentException("사용자 이름은 비어 있을 수 없습니다.")
        user.email.isBlank() -> throw IllegalArgumentException("이메일은 비어 있을 수 없습니다.")
        !user.email.contains("@") -> throw IllegalArgumentException("올바른 이메일 형식이 아닙니다.")
    }
}
```

#### 🔍 `when`을 활용한 이점

✅ **더 간결한 코드**: 중첩 없이 여러 검증 로직을 명확하게 표현  
✅ **가독성 향상**: 예외 발생 조건을 한눈에 확인 가능

---

## 결론

코틀린의 `when`을 활용하면 **가독성, 유지보수성, 코드 품질**이 크게 향상됩니다.  
특히 **스프링 애플리케이션**에서 `when`을 사용하면 불필요한 `if-else` 중첩을 줄이고, **비즈니스 로직을 명확하게 표현**할 수 있습니다.