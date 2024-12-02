---
title: "JPA @Transactional 사용 시 주의할 점"
date: 2024-12-02 12:00:00 +0900
categories: [Backend, JPA]
tags: [java, spring, jpa, transactional]
---

### 1. Lazy Loading 문제

**코드**

```kotlin
// UserService
@Transactional
fun getUserWithLazyLoadingIssue(userId: Long): User {
    return userRepository.findById(userId).orElseThrow() 
}

// UserUsecase
fun executeLazyLoadingIssue(userId: Long) {
    val user = userService.getUserWithLazyLoadingIssue(userId)
    println(user.name) // LazyInitializationException 발생
} 
```

**문제 설명**

`Lazy Loading` 사용 시, 세션 종료 후 연관 엔티티 접근 시 `LazyInitializationException` 발생.

**해결 방법**

-  `@EntityGraph` 또는 `fetch` 조인을 사용하여 필요한 연관 엔티티를 미리 로드.


**해결 코드 (EntityGraph 예시)**

```kotlin
// UserService
@Transactional
fun getUserWithLazyLoadingSolution(userId: Long): User {
    return userRepository.findById(userId, EntityGraph("user-with-details")).orElseThrow() 
}

@EntityGraph(attributePaths = ["details"])
interface UserRepository : JpaRepository<User, Long> {
    // ...
}
```

**해결 코드 (Fetch 조인 예시)**

```kotlin
// UserService
@Transactional
fun getUserWithLazyLoadingSolution(userId: Long): User {
    return userRepository.findByIdWithDetails(userId).orElseThrow()
}

interface UserRepository : JpaRepository<User, Long> {
    @Query("SELECT u FROM User u JOIN FETCH u.details WHERE u.id = :id")
    fun findByIdWithDetails(id: Long): Optional<User>
}
```


### 2. 동시성 문제

**코드**

```kotlin
// UserService
@Transactional
fun updateUserConcurrently(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName 
}

// UserUsecase
fun executeConcurrencyIssue(userId: Long) {
    // 두 코루틴에서 동시에 updateUserConcurrently 호출
}
```

**문제 설명**

여러 스레드가 동시에 같은 엔티티 수정 시 데이터 일관성 문제 발생.

**해결 방법**

- **Optimistic Locking**: `@Version` 필드를 사용하여 버전 체크.
- **Pessimistic Locking**: `entityManager.lock()`으로 레코드 잠금.
- **Transaction Isolation Levels**: `Isolation.SERIALIZABLE` 등을 사용하여 격리 수준 조정.


**해결 코드 (Optimistic Locking 예시)**

```kotlin
// User 엔티티
@Entity
data class User(
    @Id @GeneratedValue
    val id: Long? = null,
    var name: String,
    @Version
    var version: Int = 0
)

// UserService (변경 없음)
```


**해결 코드 (Pessimistic Locking 예시)**

```kotlin
// UserService
@Transactional
fun updateUserConcurrently(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    entityManager.lock(user, LockModeType.PESSIMISTIC_WRITE) // 잠금 설정
    user.name = newName 
}
```


**해결 코드 (Transaction Isolation Levels 예시)**

```kotlin
// UserService
@Transactional(isolation = Isolation.SERIALIZABLE)
fun updateUserConcurrently(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName 
}
```




### 3. 읽기 전용 트랜잭션 문제

**코드**

```kotlin
// UserService
@Transactional(readOnly = true)
fun updateUserInReadOnlyTransaction(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName // HibernateException 발생
}

// UserUsecase
fun executeReadOnlyTransactionUpdate(userId: Long, newName: String) {
    userService.updateUserInReadOnlyTransaction(userId, newName) 
} 
```

**문제 설명**

읽기 전용 트랜잭션에서 데이터 수정 시 `HibernateException` 발생.

**해결 방법**

- 읽기 전용 트랜잭션 제거(`readOnly = false`).
- 수정 작업 위한 별도 메서드 사용.
- DTO 사용하여 데이터 분리 후 수정.


**해결 코드 (읽기 전용 트랜잭션 제거)**

```kotlin
// UserService
@Transactional // readOnly 제거
fun updateUserInReadOnlyTransaction(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName 
}
```


**해결 코드 (별도 메서드 사용)**

```kotlin
// UserService
@Transactional(readOnly = true)
fun findUserById(userId: Long): User {
    return userRepository.findById(userId).orElseThrow()
}

@Transactional
fun updateUserName(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName
}

// UserUsecase
fun executeReadOnlyTransactionUpdate(userId: Long, newName: String) {
    userService.updateUserName(userId, newName) 
} 
```


**해결 코드 (DTO 사용)**

```kotlin
// UserDto
data class UserDto(val id: Long, val name: String)

// UserService
@Transactional(readOnly = true)
fun findUserDtoById(userId: Long): UserDto {
    val user = userRepository.findById(userId).orElseThrow()
    return UserDto(user.id!!, user.name)
}

@Transactional
fun updateUserName(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName
}
// ...
```


### 4. 프록시 객체와 직접 접근 문제

**코드**

```kotlin
// UserService
@Transactional
fun updateUserDirectly(userId: Long, newName: String) {
    updateUserName(userId, newName) 
}

@Transactional
fun updateUserName(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName
} 
```

**문제 설명**

같은 클래스 내 `@Transactional` 메서드 호출 시 프록시가 아닌 실제 객체 호출되어 트랜잭션 적용 안 될 수 있음.

**해결 방법**

- 별도 서비스 클래스 사용.
- AOP 사용하여 트랜잭션 관리.
- 메서드 분리하여 외부에서 호출.


**해결 코드 (별도 서비스 클래스 사용)**

```kotlin
// AnotherService
@Service
class AnotherService(private val userService: UserService) {
    @Transactional
    fun updateUserFromAnotherService(userId: Long, newName: String) {
        userService.updateUserName(userId, newName)
    }
}
```


**해결 코드 (AOP 사용 예시)**

```kotlin
// Aspect
@Aspect
@Component
class TransactionAspect {

    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    fun aroundTransactional(proceedingJoinPoint: ProceedingJoinPoint): Any {
        // 트랜잭션 시작 로직
        return try {
            proceedingJoinPoint.proceed()
        } finally {
            // 트랜잭션 종료 로직
        }
    }
}
```


**해결 코드 (메서드 분리 후 외부 호출)**

```kotlin
// UserService
@Transactional
fun updateUserName(userId: Long, newName: String) {
    val user = userRepository.findById(userId).orElseThrow()
    user.name = newName
}

// UserUsecase
fun updateUserNameFromUsecase(userId: Long, newName: String) {
    userService.updateUserName(userId, newName)
}
```


### 5. 전파 문제

**코드**

```kotlin
// UserService
@Transactional(propagation = Propagation.REQUIRED)
fun createUserWithPropagation(name: String): User {
    val user = User(name = name, age = 25)
    return userRepository.save(user)
}
```

**문제 설명**

트랜잭션 전파 방식 잘못 설정 시 중첩 트랜잭션 발생, 부모 트랜잭션 롤백 시 자식 트랜잭션도 롤백될 수 있음.

**해결 방법**

- 적절한 전파 옵션(`Propagation.REQUIRES_NEW` 등) 설정.
- 트랜잭션 경계 명확히 하기.
- AOP 사용하여 트랜잭션 관리.


**해결 코드 (Propagation 변경)**

```kotlin
// UserService
@Transactional(propagation = Propagation.REQUIRES_NEW)
fun createUserWithPropagation(name: String): User {
    val user = User(name = name, age = 25)
    return userRepository.save(user)
}
```


### 6 & 7. 예외 처리 문제 (체크/언체크 예외 및 롤백)

**코드**

```kotlin
// UserService
@Transactional 
fun createUserWithCheckedException(userId: Long): User { 
    throw CustomCheckedException("체크 예외 발생") 
}

@Transactional
fun createUserWithUncheckedException(userId: Long): User {
    throw CustomUncheckedException("언체크 예외 발생") 
}

// UserUsecase (예외 처리 로직)
```

**문제 설명**

- 체크 예외는 기본적으로 트랜잭션 롤백 안 됨.
- 언체크 예외는 기본적으로 트랜잭션 롤백 됨.
- 적절히 처리 안 하면 애플리케이션 흐름 중단 또는 예기치 않은 동작 발생 가능.

**해결 방법**

- 체크 예외 롤백 위해 `@Transactional(rollbackFor = [CustomCheckedException::class])` 사용.
- 모든 메서드에서 예외 처리.
- 예외 발생 시 로깅 및 사용자 피드백 제공. 


**해결 코드 (체크 예외 롤백 설정)**

```kotlin
// UserService
@Transactional(rollbackFor = [CustomCheckedException::class])
fun createUserWithCheckedException(userId: Long): User { 
    throw CustomCheckedException("체크 예외 발생") 
} 
```
