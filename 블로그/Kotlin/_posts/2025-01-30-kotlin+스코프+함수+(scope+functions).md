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
  - object-oriented-programming
  - lambda-expressions
  - null-safety
nanoId: pVaWbnmfol21w8O7F9vd9orSg
permalink: /pVaWbnmfol21w8O7F9vd9orSg/
---
코틀린에서는 객체의 컨텍스트 내에서 코드 블록을 실행할 수 있는 여러 스코프 함수(scope functions)를 제공합니다. 이러한 함수들은 객체를 다루는 방식과 반환값에 따라 차이가 있습니다. 주요 스코프 함수로는 `let`, `apply`, `run`, `with`, `also` 등이 있습니다. 각각의 특징과 활용 방법을 설명하겠습니다.

### 1. `let`
- **용도**: 주로 null이 아닌 객체에 대해 작업을 수행할 때 사용됩니다.
- **반환값**: 람다 결과를 반환합니다.
- **사용 예**: null 체크 후 작업을 수행하거나, 변환 작업을 할 때 유용합니다.

```kotlin
val str: String? = "Hello"
val length = str?.let {
    println(it) // "Hello"
    it.length // 반환값
}
println(length) // 5
```

### 2. `apply`
- **용도**: 객체 초기화나 설정 작업을 할 때 사용됩니다.
- **반환값**: 객체 자신을 반환합니다.
- **사용 예**: 객체 생성 후 여러 속성을 설정할 때 유용합니다.

```kotlin
val person = Person().apply {
    name = "John"
    age = 30
}
println(person) // Person(name=John, age=30)
```

### 3. `run`
- **용도**: 객체에서 여러 작업을 수행하고 결과를 반환할 때 사용됩니다.
- **반환값**: 람다 결과를 반환합니다.
- **사용 예**: 객체의 속성을 계산하거나, 여러 작업을 한 번에 수행할 때 유용합니다.

```kotlin
val person = Person("John", 30)
val ageAfterTenYears = person.run {
    println(name) // "John"
    age + 10 // 반환값
}
println(ageAfterTenYears) // 40
```

### 4. `with`
- **용도**: 객체에서 여러 작업을 수행하고 결과를 반환할 때 사용됩니다.
- **반환값**: 람다 결과를 반환합니다.
- **사용 예**: `run`과 유사하지만, 객체를 파라미터로 받는 점이 다릅니다.

```kotlin
val person = Person("John", 30)
val ageAfterTenYears = with(person) {
    println(name) // "John"
    age + 10 // 반환값
}
println(ageAfterTenYears) // 40
```

### 5. `also`
- **용도**: 객체에 추가 작업을 수행할 때 사용됩니다.
- **반환값**: 객체 자신을 반환합니다.
- **사용 예**: 객체를 수정하지 않고, 로깅이나 디버깅 등의 추가 작업을 할 때 유용합니다.

```kotlin
val person = Person("John", 30).also {
    println("Person created: $it") // Person created: Person(name=John, age=30)
}
println(person) // Person(name=John, age=30)
```

### 요약
- `let`: null 체크 후 작업 수행, 람다 결과 반환.
- `apply`: 객체 초기화, 객체 자신 반환.
- `run`: 객체에서 여러 작업 수행, 람다 결과 반환.
- `with`: 객체에서 여러 작업 수행, 람다 결과 반환 (객체를 파라미터로 받음).
- `also`: 추가 작업 수행, 객체 자신 반환.