---
noteID: 2a4e8027-38fd-471a-91fc-5f7e64143704
---

### 2. **Instrumentation의 종류**

1. **제로 코드(Zero-code) Instrumentation**
    
    - **Java Agent**: 애플리케이션 바이트코드를 동적으로 조작하여 자동으로 Instrumentation 적용.
    - **Spring Boot Starter**: Spring의 autoconfigure 기능을 활용해 자동으로 라이브러리 Instrumentation 적용.
2. **Library Instrumentation**
    
    - 확장 포인트를 사용하거나 라이브러리 내 코드를 감싸는 방식으로 구현되며 사용자가 직접 설치해야 함.
3. **Native Instrumentation**
    
    - 라이브러리 또는 프레임워크에 직접 내장된 Instrumentation.
4. **Manual Instrumentation**
    
    - 개발자가 애플리케이션의 도메인에 맞게 직접 작성하는 Instrumentation.
5. **Shims**
    
    - 다른 관측 라이브러리(OpenTracing, OpenCensus 등) 데이터를 OpenTelemetry로 변환하는 브릿지 역할.

---

### 3. **컨텍스트 전파(Context Propagation)**

- 여러 신호(Trace, Metric, Log) 간 연관성을 유지하기 위해 **Trace Context**가 사용됩니다.
    - **HTTP 서버**나 **메시지 소비자**: 외부 요청의 컨텍스트를 추출.
    - **HTTP 클라이언트**나 **메시지 생산자**: 외부로 내보내는 요청에 컨텍스트 삽입.
    - 호출 스택과 스레드 간 컨텍스트가 전달되도록 코드 작성 필요.

---
### 4. **Semantic Conventions (의미론적 규칙)**

- 표준 운영에서 사용할 **Span 이름**, **Metric 단위** 등의 규칙을 정의합니다.
- Instrumentation을 작성할 때 이 규칙을 참고하여 해당 도메인에 맞게 적용하는 것이 권장됩니다.


```java

@Override
public Future<RecordMetadata> send(ProducerRecord<K, V> record, Callback callback) {
// intercept the record, which can be potentially modified; this method does not throw exceptions
	ProducerRecord<K, V> interceptedRecord = this.interceptors.onSend(record);
	return doSend(interceptedRecord, callback);
}

```

```java

private ConsumerRecords<K, V> poll(final Timer timer) {
    acquireAndEnsureOpen();

    try {
        this.kafkaConsumerMetrics.recordPollStart(timer.currentTimeMs());

        if (this.subscriptions.hasNoSubscriptionOrUserAssignment()) {
            throw new IllegalStateException(
	            "Consumer is not subscribed to any topics or assigned any partitions"
            );
        }

        do {
            client.maybeTriggerWakeup();

            // try to update assignment metadata BUT do not need to block on the timer for join group
            updateAssignmentMetadataIfNeeded(timer, false);

            final Fetch<K, V> fetch = pollForFetches(timer);
            if (!fetch.isEmpty()) {
                // before returning the fetched records, we can send off the next round of fetches
                // and avoid block waiting for their responses to enable pipelining while the user
                // is handling the fetched records.

                // NOTE: since the consumed position has already been updated, we must not allow
                // wakeups or any other errors to be triggered prior to returning the fetched records.
                if (sendFetches() > 0 || client.hasPendingRequests()) {
                    client.transmitSends();
                }

                if (fetch.records().isEmpty()) {
                    log.trace("Returning empty records from `poll()` "
                            + "since the consumer's position has advanced for at least one topic partition");
                }

                return this.interceptors.onConsume(new ConsumerRecords<>(fetch.records()));
            }
        } while (timer.notExpired());

        return ConsumerRecords.empty();
    } finally {
        release();
        this.kafkaConsumerMetrics.recordPollEnd(timer.currentTimeMs());
    }
}

```

