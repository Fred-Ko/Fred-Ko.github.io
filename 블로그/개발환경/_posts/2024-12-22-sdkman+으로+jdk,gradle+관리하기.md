---
title: SDKMAN 으로 JDK,Gradle 관리하기
datetime: 2024-12-22T16:02:47.978Z
tags:
  - sdkman
  - jvm
  - java
  - gradle
  - openjdk
  - terminal
  - bash
  - shell
  - programming
  - development-tools
nanoId: MnDXcl4Q8Fj3KCHUkBcrnOStY
permalink: /MnDXcl4Q8Fj3KCHUkBcrnOStY/
---
## 1. SDKMAN 소개

SDKMAN은 JVM 기반 언어 및 프레임워크를 쉽게 관리할 수 있게 해주는 오픈 소스 도구입니다. 이 글에서는 SDKMAN의 설치 및 사용 방법에 대해 알아보겠습니다.

## 2. SDKMAN 설치

SDKMAN을 설치하는 방법은 간단합니다. 터미널에서 다음의 명령어를 실행하면 됩니다.
```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

설치가 완료되면, 터미널을 재시작하여 SDKMAN을 사용할 수 있습니다.

## 3. SDKMAN 사용법

SDKMAN을 사용하는 방법은 간단합니다. 다음은 SDKMAN을 사용하는 방법에 대한 간략한 설명입니다.

---
### 3.1 sdk version 확인

SDKMAN의 버전을 확인하려면, 다음의 명령어를 실행하면 됩니다.
```bash
➜ sdk version

SDKMAN!
script: 5.18.2
native: 0.4.6

```

---
### 3.2 java list 확인 방법

SDKMAN을 통해 설치할 수 있는 Java 버전을 확인하려면, 다음의 명령어를 실행하면 됩니다.
```bash
➜ sdk list java | grep open

 Java.net      |     | 23.ea.11     | open    |            | 23.ea.11-open       
               |     | 23.ea.10     | open    |            | 23.ea.10-open       
               |     | 23.ea.8      | open    |            | 23.ea.8-open        
               |     | 23.ea.7      | open    |            | 23.ea.7-open        
               |     | 23.ea.6      | open    |            | 23.ea.6-open        
               |     | 23.ea.5      | open    |            | 23.ea.5-open        
               |     | 23.ea.4      | open    |            | 23.ea.4-open        
               |     | 23.ea.3      | open    |            | 23.ea.3-open        
               |     | 23.ea.2      | open    |            | 23.ea.2-open        
               |     | 23.ea.1      | open    |            | 23.ea.1-open        
               |     | 22.ea.36     | open    |            | 22.ea.36-open       
               |     | 22.ea.35     | open    |            | 22.ea.35-open       
               |     | 22.ea.34     | open    |            | 22.ea.34-open       
               |     | 22.ea.33     | open    |            | 22.ea.33-open       
               |     | 22.ea.32     | open    |            | 22.ea.32-open       
               |     | 22.ea.31     | open    |            | 22.ea.31-open       
               |     | 22.ea.30     | open    |            | 22.ea.30-open       
               |     | 22.ea.29     | open    |            | 22.ea.29-open       
               |     | 22.ea.28     | open    |            | 22.ea.28-open       
               |     | 22.ea.27     | open    |            | 22.ea.27-open       
               |     | 22.ea.26     | open    |            | 22.ea.26-open       
               |     | 21.ea.35     | open    |            | 21.ea.35-open       
               |     | 21.0.2       | open    |            | 21.0.2-open         

```

이 명령어는 설치할 수 있는 openjdk 버전만 출력합니다.

---
### 3.3 java 설치

SDKMAN을 통해 Java를 설치하려면, 다음의 명령어를 실행하면 됩니다.
```bash
➜ sdk install java 21.0.2-open

Downloading: java 21.0.2-open

In progress...

########################################################################## 100.0%

Repackaging Java 21.0.2-open...

Done repackaging...
Cleaning up residual files...

Installing: java 21.0.2-open
Done installing!


Setting java 21.0.2-open as default.

```

이 명령어는 Java 21.0.2-open 버전을 설치합니다. 설치가 완료되면, SDKMAN을 통해 설치한 Java 버전을 사용할 수 있습니다.

---
### 3.4 현재 설정된 Java 버전 확인
현재 설정된 java 버전을 확인하려면 다음 명령어를 실행하면 됩니다.
```shell
➜ sdk current java

Using java version 21.0.2-open
```

---
### 3.5 특정 버전의 Java 사용
특정 버전의 Java를 사용하려면, 다음의 명령어를 실행하면 됩니다.
```shell
➜ sdk use java 17.0.10-jbr

Using java version 17.0.10-jbr in this shell.

```

---
### 3.6 gradle 설치

```shell
➜ sdk list gradle

================================================================================
Available Gradle Versions
================================================================================
     8.7-rc-2            6.9.2               5.2                 2.14           
     8.7-rc-1            6.9.1               5.1.1               2.13           
     8.6                 6.9                 5.1                 2.12           
     8.5                 6.8.3               5.0                 2.11           
     8.4                 6.8.2               4.10.3              2.10           
     8.3                 6.8.1               4.10.2              2.9            
     8.2.1               6.8                 4.10.1              2.8            
     8.2                 6.7.1               4.10                2.7            
     8.1.1               6.7                 4.9                 2.6            
     8.1                 6.6.1               4.8.1               2.5            
     8.0.2               6.6                 4.8                 2.4            
     8.0.1               6.5.1               4.7                 2.3            
     8.0                 6.5                 4.6                 2.2.1          
     7.6.4               6.4.1               4.5.1               2.2            
     7.6.3               6.4                 4.5                 2.1            
     7.6.2               6.3                 4.4.1               2.0            
     7.6.1               6.2.2               4.4                 1.12           
     7.6                 6.2.1               4.3.1               1.11           
     7.5.1               6.2                 4.3                 1.10           
     7.5                 6.1.1               4.2.1               1.9            
     7.4.2               6.1                 4.2                 1.8            
     7.4.1               6.0.1               4.1                 1.7            
     7.4                 6.0                 4.0.2               1.6            
     7.3.3               5.6.4               4.0.1               1.5            
     7.3.2               5.6.3               4.0                 1.4            
     7.3.1               5.6.2               3.5.1               1.3            
     7.3                 5.6.1               3.5                 1.2            
     7.2                 5.6                 3.4.1               1.1            
     7.1.1               5.5.1               3.4                 1.0            
     7.1                 5.5                 3.3                 0.9.2          
     7.0.2               5.4.1               3.2.1               0.9.1          
     7.0.1               5.4                 3.2                 0.9            
     7.0                 5.3.1               3.1                 0.8            
     6.9.4               5.3                 3.0                 0.7           
```

SDKMAN을 통해 Gradle을 설치하려면, 다음의 명령어를 실행하면 됩니다.
```bash
➜ sdk install gradle 8.6

Downloading: gradle 8.6

In progress...

################################################################################################################ 100.0%

Installing: gradle 8.6
Done installing!


```

이 명령어는 Gradle 8.6 버전을 설치합니다. 설치가 완료되면, SDKMAN을 통해 설치한 Gradle 버전을 사용할 수 있습니다.

---
### 3.7 gradle 사용

Gradle을 사용하려면, 다음의 명령어를 실행하면 됩니다.
```bash
➜ gradle --version

Welcome to Gradle 8.6!

Here are the highlights of this release:
 - Configurable encryption key for configuration cache
 - Build init improvements
 - Build authoring improvements

For more details see https://docs.gradle.org/8.6/release-notes.html


------------------------------------------------------------
Gradle 8.6
------------------------------------------------------------

Build time:   2024-02-02 16:47:16 UTC
Revision:     d55c486870a0dc6f6278f53d21381396d0741c6e

Kotlin:       1.9.20
Groovy:       3.0.17
Ant:          Apache Ant(TM) version 1.10.13 compiled on January 4 2023
JVM:          17.0.10 (JetBrains s.r.o. 17.0.10+1-b1087.17)
OS:           Mac OS X 14.3.1 aarch64


```

Gradle의 버전을 확인합니다. 

---
# 4. 정리
SDKMAN으로 JAVA , Gradle 등을 쉽게 설치하고 관리할 수 있는 방법을 알아보았습니다.