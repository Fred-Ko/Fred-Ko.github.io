---
title: Opentelemetry - Zero-code instrumentation의 NODE_OPTIONS 적용 안되는 문제
datetime: 2024-12-21T15:32:21.590Z
tags:
  - nestjs
  - opentelemetry
  - zero-code-instrumentation
  - node-options
  - environment-variables
  - config-module
  - auto-instrumentations-node
  - env-cmd
  - nodejs
  - troubleshooting
nanoId: WQRsDo1cgUM3bnp8yzIRUgTSn
permalink: /WQRsDo1cgUM3bnp8yzIRUgTSn/
---
## Intro
이번 글에서는 NestJS 프로젝트에 OpenTelemetry Zero-Code Instrumentation을 적용하는 과정에서 `NODE_OPTIONS` 설정이 제대로 반영되지 않는 문제와 그 해결 방법에 대해 공유하고자 합니다.

### 문제 상황: `npm run start` 시 `NODE_OPTIONS` 무시

OpenTelemetry Zero-Code Instrumentation을 활성화하기 위해서는 일반적으로 `NODE_OPTIONS` 환경 변수를 사용하여 `@opentelemetry/auto-instrumentations-node/register` 모듈을 로드해야 합니다. 다음과 같이 말이죠.

```bash
export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
npm run start
```

하지만 NestJS 프로젝트에서 `package.json`의 `scripts`에 정의된 `start` 명령어를 통해 실행하면 위와 같이 `NODE_OPTIONS`를 설정해도 적용되지 않는 현상이 발생했습니다.

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

반면, 터미널에서 직접 `export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register" && npm run start` 명령어를 실행하면 정상적으로 OpenTelemetry가 작동하는 것을 확인할 수 있었습니다.

### 문제 원인 분석: 환경 변수 적용 시점

이러한 현상의 원인을 분석해 본 결과, 환경 변수 적용 시점의 문제라는 결론에 도달했습니다. NestJS는 일반적으로 `@nestjs/config`와 같은 모듈을 사용하여 `.env` 파일을 로드하고 환경 변수를 주입 받습니다. 하지만 이 과정은 애플리케이션 시작 시점에 이루어지기 때문에, `NODE_OPTIONS`가 필요한 시점보다 늦어 적용되지 않는 것입니다. 즉, OpenTelemetry 자동 계측은 Node.js 프로세스가 시작될 때부터 활성화되어야 하는데, NestJS의 환경 변수 로딩 시점이 이보다 늦어 문제가 발생하는 것입니다.

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