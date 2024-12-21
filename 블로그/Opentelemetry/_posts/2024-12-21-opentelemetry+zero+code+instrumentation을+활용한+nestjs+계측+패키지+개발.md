---
title: Opentelemetry - Zero-Code Instrumentation을 활용한 NestJS 계측 패키지 개발
datetime: 2024-12-21T17:26:12.878Z
tags:
  - zero-code-instrumentation
  - opentelemetry
  - nestjs
  - typescript
  - compiler-api
  - ast
  - regex
  - filtering
  - decorator
  - metadata
nanoId: vhIHDEqcHAMQz1kQnub9xjd3f
permalink: /vhIHDEqcHAMQz1kQnub9xjd3f/
---
## Intro

마이크로서비스 아키텍처의 확산과 함께 애플리케이션의 모니터링과 트레이싱이 중요한 과제로 떠오르고 있습니다. 특히, **Zero-Code Instrumentation**은 기존 코드를 최소한으로 수정하면서도 효과적인 계측을 가능하게 하는 장점으로 주목받고 있습니다. 이번 글에서는 Zero-Code Instrumentation을 사용함에도 불구하고 nestjs Controller와 Resolver 하위 호출은 계측이 안되는 문제점을 개선하는 프로젝트를 진행한 과정을 공유하고자 합니다.

## Zero-Code Instrumentation의 이해

Zero-Code Instrumentation의 주요 장점은 기존 코드의 수정을 최소화한다는 점입니다. 이를 통해 개발자는 애플리케이션의 핵심 로직을 변경하지 않고도 성능 모니터링 및 트레이싱을 손쉽게 도입할 수 있습니다.

예를 들어, 다음과 같은 환경 변수를 설정하여 OpenTelemetry의 자동 계측 기능을 활성화할 수 있습니다.

```bash
OTEL_NODE_ENABLED_INSTRUMENTATIONS="graphql,kafkajs,pg,nestjs-core"
```

위와 같이 설정하면 Controller와 Resolver 까지 계측되지만, 그 하위의 로직은 계측되지 않는 문제가 발생했습니다. 이를 해결하기 위해 대부분의 해결책은 데코레이터를 추가하는 방식으로 제안되었으나, 이는 Zero-Code의 장점인 코드 수정을 최소화하는 취지를 훼손하는 단점이 있습니다.

## 개발을 해보자

Zero-Code Instrumentation의 장점을 최대한 살리면서도 효과적인 계측을 구현하기 위해, 저는 최소한의 코드 수정으로 계측을 가능하게 하는 패키지를 직접 개발하기로 결심했습니다. 이를 위해 다음과 같은 요구사항을 설정하였습니다.

### 요구사항

- **최소한의 코드 수정**: 기존 애플리케이션 코드를 거의 변경하지 않고 계측을 적용
- **NPM 패키지 형태**: 손쉽게 설치 및 배포할 수 있는 형태로 패키지화 하여 도입하는데 Cost를 최소화
- **Regex를 이용한 필터링**:
    - 클래스 필터링
    - 클래스 메서드 필터링
    - 클래스 경로 필터링

## 설계

### Regex를 이용한 클래스 필터링

NestJS의 서비스 디스커버리를 활용하여 `onModuleInit` 시점에 클래스 이름을 추출하고, 이를 정규 표현식으로 필터링하는 방식을 채택하였습니다.

### Regex를 이용한 클래스 메서드 필터링

클래스 메서드의 이름도 마찬가지로 서비스 디스커버리를 통해 추출한 후, 정규 표현식으로 필터링합니다.

### Regex를 이용한 클래스의 경로 필터링

클래스의 파일 경로를 필터링하는 것은 다소 어려운 과제로 남았습니다. NestJS 코드를 분석해보아도 `InstanceWrapper`에서 경로를 추출할 수 있는 명확한 방법을 찾기 어려웠습니다. 이에 대한 해결책을 찾기 위해 ChatGPT에 질문해보니, 컴파일 시점에 파일 경로를 클래스에 추가하는 방법을 제안 하더라구요.

#### 컴파일 시점에 파일 경로를 클래스에 추가해보자

관련 자료를 엄청 많이 찾아보았습니다. 코드도 상당히 많이 찾아보았습니다. 자료를 찾던중 [NestJS CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin)을 활용하면 컴파일의 특정 시점에 사용자 정의 로직을 실행할 수 있습니다. 다만, 관련 공식 문서나 가이드가 너무 부족하여 추가 자료를 찾아보던 중 [블로그 글](https://jbl428.github.io/2023/10/22/nestjs-%EC%BB%A4%EC%8A%A4%ED%85%80-cli-plugin-%EB%A7%8C%EB%93%A4%EA%B8%B0)을 참고할 수 있었습니다. 이 블로그는 제가 원하는 대부분의 내용을 포함하고 있어 큰 도움이 되었습니다. 이 자리를 빌어 감사의 말씀을 전하고자 합니다.

### 구현

#### NestJS CLI 플러그인 코드 작성

##### 그럼 뭘해야 하는가?

![](assets/img/pasted-image-20241222013134.png)


결국 짧게 정리하면
1. class를 찾는다.
2. class 코드의 경로를 찾는다.
3. class 코드의 경로를 class에 메타데이터로 추가한다.

##### 구현
컴파일 시점에 파일 경로를 클래스에 추가하기 위해 TypeScript의 AST(Abstract Syntax Tree)와 Compiler API를 활용하여 다음과 같은 트랜스포머를 작성하였습니다.

```typescript
import * as ts from 'typescript';
import * as path from 'path';

export const before = (): ts.TransformerFactory<ts.SourceFile> => {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      const process: ts.Visitor = (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          const filePath = path.relative(process.cwd(), sourceFile.fileName);

          const decoratorFactory = ts.factory.createCallExpression(
            ts.factory.createIdentifier("Reflect.defineMetadata"),
            undefined,
            [
              ts.factory.createStringLiteral("filePath"),
              ts.factory.createStringLiteral(filePath),
              ts.factory.createIdentifier(node.name.text),
            ]
          );

          const decoratorStatement =
            ts.factory.createExpressionStatement(decoratorFactory);

          return [node, decoratorStatement];
        }

        return ts.visitEachChild(node, process, context);
      };

      const updatedStatements = sourceFile.statements.flatMap((stmt) =>
        ts.isClassDeclaration(stmt) ? process(stmt) : stmt
      ) as ts.Statement[];

      return ts.factory.updateSourceFile(
        sourceFile,
        ts.factory.createNodeArray(updatedStatements)
      );
    };
  };
};
```

위 코드는 클래스 선언을 탐지하여 해당 클래스의 파일 경로를 메타데이터로 추가하는 역할을 합니다. 이를 통해 `onModuleInit` 시점에 파일 경로를 포함한 클래스 정보를 필터링할 수 있게 됩니다.

##### 컴파일 후 확인

패키지를 빌드한 후, 컴파일된 파일을 확인해보면 다음과 같이 클래스 하단에 `Reflect.defineMetadata`가 추가된 것을 확인할 수 있습니다.

```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserReadEntity = void 0;
const typeorm_1 = require("typeorm");
let UserReadEntity = class UserReadEntity {};
exports.UserReadEntity = UserReadEntity;
// ... 중간 코드 ...
exports.UserReadEntity = UserReadEntity = __decorate(
  [(0, typeorm_1.Entity)()],
  UserReadEntity
);
Reflect.defineMetadata(
  "filePath",
  "src/users/entities/user-read.entity.ts",
  UserReadEntity
);
//# sourceMappingURL=user-read.entity.js.map
```

하단에 보면 예쁘게 잘 들어간 모습을 볼 수 있습니다. 이제 `onModuleInit` 시점에 해당 메타데이터를 추출하여 파일 경로를 필터링할 수 있게 되었습니다.

## NPM 패키지 첫 등록

**패키지 링크:** [@fredko/nestjs-opentelemetry-tracing](https://www.npmjs.com/package/@fredko/nestjs-opentelemetry-tracing)

직접 개발한 패키지를 NPM에 등록하여 다른 개발자들도 손쉽게 사용할 수 있도록 했습니다. 패키지 이름은 `@fredko/nestjs-opentelemetry-tracing`이며, 아직 README나 문서가 완벽하게 정리되지는 않았으나 초기 버전을 등록하였습니다. 테스트 과정은 다음과 같습니다.

### 테스트 방법

1. **패키지 설치**
    
    ```bash
    npm install @fredko/nestjs-opentelemetry-tracing
    ```
    
2. **Nest CLI 설정에 플러그인 추가**
    
    `nest-cli.json` 파일에 플러그인을 추가합니다.
    
    ```json
    {
      "$schema": "https://json.schemastore.org/nest-cli",
      "collection": "@nestjs/schematics",
      "sourceRoot": "src",
      "compilerOptions": {
        "deleteOutDir": true,
        "plugins": [
          {
            "name": "@fredko/nestjs-opentelemetry-tracing"
          }
        ]
      }
    }
    ```
    
3. **다이나믹 모듈 추가**
    
    `app.module.ts` 파일에 다이나믹 모듈을 추가합니다.
    
    ```typescript
    @Module({
      imports: [
        OtelNestTracingModule.forRoot({
          dirInclusionPatterns: [/src/],
          classNameIncludePatterns: [/Handler/, /Controller/, /Resolver/],
          classNameExcludePatterns: [],
          methodNameIncludePatterns: [],
          methodNameExcludePatterns: [],
        }),
      ],
    })
    export class AppModule {}
    ```
    
4. **트레이스 테스트**
    
    애플리케이션을 빌드하고 실행하여 트레이스가 정상적으로 작동하는지 확인합니다.
    
    
![](assets/img/pasted-image-20241222020208.png)

    빨간색으로 네모진 부분이 원래는 트레이스가 안되던 부분입니다.
    
## 결론

Zero-Code Instrumentation을 사용하면서 최소한의 Cost로 프로젝트에 도입해보는 분들중에 저와같은 고민을 해보신 분들에게 많은 도움되었으면 좋겠습니다.

---