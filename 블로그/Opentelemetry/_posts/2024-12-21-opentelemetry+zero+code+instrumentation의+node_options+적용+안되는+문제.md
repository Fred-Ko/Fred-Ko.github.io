---
post_id: ca496374-6551-5aad-a8ed-9b84d6cf7fce
title: Opentelemetry - Zero-code instrumentation의 NODE_OPTIONS 적용 안되는 문제
description: "NestJS에 OpenTelemetry Zero-Code Instrumentation을 적용할 때 NODE_OPTIONS가 반영되지 않는 문제의 원인과 해결 방법을 다룹니다."
datetime: 2024-12-21T15:32:21.590Z
tags:
  - opentelemetry
  - nestjs
  - zero-code-instrumentation
  - troubleshooting
nanoId: WQRsDo1cgUM3bnp8yzIRUgTSn
permalink: /WQRsDo1cgUM3bnp8yzIRUgTSn/
---
## Intro
이번 글에서는 NestJS 프로젝트에 OpenTelemetry Zero-Code Instrumentation을 적용하는 과정에서 `NODE_OPTIONS` 설정이 제대로 반영되지 않는 문제와 그 해결 방법에 대해 공유하고자 합니다.

### 문제 상황: `npm run start` 시 `NODE_OPTIONS` 무시

OpenTelemetry Zero-Code Instrumentation을 활성화하기 위해서는 일반적으로 `NODE_OPTIONS` 환경 변수를 사용하여 `@opentelemetry/auto-instrumentations-node/register` 모듈을 로드해야 합니다. 예를 들어 `.env` 파일에 다음 설정을 두고 NestJS의 `ConfigModule`로 읽는 경우를 생각해볼 수 있습니다.

```bash
NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
```

이 경우 `package.json`의 `scripts`에 정의된 `start` 명령어로 실행하면 계측이 적용되지 않을 수 있습니다.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
  ],
  providers: [],
})
export class AppModule {}
```

```json
"scripts": {
  "start": "nest start"
}
```

터미널에서 `export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" && npm run start`로 실행하면 Node.js 시작 전에 환경 변수가 전달됩니다. `export`와 `npm run start`를 같은 셸에서 두 줄로 실행해도 동일합니다.

### 문제 원인 분석: 환경 변수 적용 시점

이러한 현상의 가능한 원인 중 하나는 환경 변수 적용 시점입니다. NestJS는 일반적으로 `@nestjs/config`와 같은 모듈을 사용하여 `.env` 파일을 로드하고 환경 변수를 주입 받습니다. 하지만 이 과정은 애플리케이션 시작 시점에 이루어지기 때문에, `NODE_OPTIONS`가 필요한 시점보다 늦어 적용되지 않는 것입니다. 즉, `.env`를 `ConfigModule`로만 읽는 경우에는 Node.js가 `NODE_OPTIONS`를 적용할 시점보다 늦게 로드됩니다. 실제 원인은 실행 환경을 확인해야 합니다.

### 해결 방법 1: `scripts` 명령어 직접 수정

가장 간단한 해결 방법은 `package.json`의 `scripts`에 `NODE_OPTIONS` 설정을 직접 포함시키는 것입니다.

```json
"scripts": {
  "start": "export NODE_OPTIONS=\"--require @opentelemetry/auto-instrumentations-node/register\" && nest start"
}
```

이렇게 하면 `npm run start` 명령어를 실행할 때 `NODE_OPTIONS`가 먼저 설정된 후 NestJS 애플리케이션이 시작되므로 OpenTelemetry가 정상적으로 작동합니다.

### 해결 방법 2: `env-cmd` 라이브러리 활용

또 다른 방법으로는 `env-cmd`와 같은 라이브러리를 활용하는 것입니다. `env-cmd`는 `.env` 파일을 읽어 환경 변수를 설정한 후 명령어를 실행하는 기능을 제공합니다.

먼저 `env-cmd`를 설치합니다.

```bash
npm install env-cmd
```

그 다음 `package.json`의 `scripts`를 다음과 같이 수정합니다.

```json
"scripts": {
  "start": "npx env-cmd -f .env nest start"
}
```

이렇게 설정하면 `npm run start` 명령어를 실행할 때 `env-cmd`가 먼저 `.env` 파일을 읽어 환경 변수를 설정하고, 그 후 NestJS 애플리케이션을 시작하므로 OpenTelemetry가 정상적으로 작동하게 됩니다.

### 결론

설정과 관련된 섬세한 문제에 부딪힐 수도 있습니다. 특히 NestJS와 같이 프레임워크 수준에서 환경 변수를 관리하는 경우에는 적용 시점을 신중하게 고려해야 합니다. 말씀드린 두 가지 해결 방법 외에도 여러 방법이 있을 수 있지만, 핵심은 `NODE_OPTIONS`가 애플리케이션 시작 시점보다 먼저 설정되도록 하는 것입니다. 이 글이 OpenTelemetry Zero-Code Instrumentation을 적용하는 과정에서 어려움을 겪는 분들에게 조금이나마 도움이 되었으면 합니다.
