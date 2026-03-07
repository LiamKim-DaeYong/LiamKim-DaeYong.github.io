---
title: "[MySQL 아키텍처 4] InnoDB 버퍼 풀(Buffer Pool): 메모리 캐시가 성능과 복구를 동시에 책임지는 이유"
pubDatetime: 2026-03-07T00:00:00.000Z
description: "InnoDB 버퍼 풀의 내부 구조와 페이지 생명주기를 중심으로, LRU/flush/free list와 dirty page 관리가 왜 성능·안정성의 핵심인지 정리한다."
categories: [database, learning]
tags: [mysql, innodb, buffer-pool, lru, flush, redo-log, performance]
draft: false
---

디스크 I/O는 줄이고 싶지만, 장애 시 데이터 유실은 피해야 한다.
이 두 요구를 동시에 만족시키는 지점이 InnoDB 버퍼 풀(Buffer Pool)이다.
버퍼 풀을 단순 캐시로 보면 튜닝이 막히고, "쓰기 지연 + 복구 보장" 구조로 보면 InnoDB 동작이 한 번에 연결된다.

## 버퍼 풀을 캐시로만 보면 놓치는 것

버퍼 풀은 데이터/인덱스 페이지를 메모리에 유지해 디스크 접근을 줄이는 영역이다.
여기까지는 일반적인 캐시와 다를 바 없다.
그런데 InnoDB의 버퍼 풀은 단순 캐시 이상의 역할을 한다.

변경된 페이지, 즉 더티 페이지(Dirty Page)를 관리하고, 백그라운드 플러시(Flush)와 체크포인트(Checkpoint)까지 연결한다.
다시 말해 "빠르게 읽기"와 "안전하게 쓰기"를 같이 책임지는 컴포넌트다.

### 왜 redo log와 함께 봐야 하는가

InnoDB에서 쓰기는 보통 다음 순서로 처리된다.

1. 페이지를 버퍼 풀에서 수정한다.
2. 변경 사실을 redo log에 기록한다.
3. 나중에 더티 페이지를 디스크 데이터 파일에 반영한다.

이 구조 덕분에 쓰기 요청의 응답 지연을 줄이면서도, 장애 복구 시 redo를 재적용해 내구성(Durability)을 보완할 수 있다.

핵심은 "데이터 파일 반영 시점"과 "커밋 완료 시점"이 항상 같지 않다는 점이다.
커밋이 완료되었다는 것은 redo log에 변경이 안전하게 기록되었다는 뜻이지, 데이터 파일이 이미 갱신되었다는 뜻이 아니다.

아래 그림은 이 전체 흐름을 보여준다.

<img src="/images/mysql/innodb-page-lifecycle.svg" alt="InnoDB 페이지 생명주기: 읽기 → 수정 → redo 기록 → 지연 flush" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

## 버퍼 풀 내부를 움직이는 세 가지 리스트

버퍼 풀 안에서 페이지는 세 가지 리스트로 관리된다.
각 리스트의 역할을 이해하면 캐시 히트율, 공간 압박, 복구 시간이 어떻게 연결되는지 한 번에 보인다.

<img src="/images/mysql/innodb-buffer-pool-lists.svg" alt="InnoDB 버퍼 풀 내부 구조: LRU, 프리, 플러시 리스트" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

### LRU 리스트: 자주 쓰는 페이지를 메모리에 유지

버퍼 풀은 캐시 페이지의 사용 이력을 관리하기 위해 LRU(Least Recently Used) 리스트를 유지한다.
하지만 InnoDB는 단순 LRU가 아니라 midpoint insertion 전략을 사용한다.

새로 읽어온 페이지는 리스트의 중간 지점(midpoint)에 삽입된다.
이 페이지가 일정 시간 안에 다시 접근되면 Hot 영역으로 승격되고, 그렇지 않으면 Cold 영역 아래로 밀려나 제거 대상이 된다.

왜 이런 구조가 필요할까?
만약 단순 LRU였다면 `ALTER TABLE ... ENGINE=InnoDB`나 mysqldump 같은 풀 테이블 스캔 한 번으로 대량의 페이지가 LRU 상위를 점령해버린다.
그러면 실제로 자주 사용되는 핫 페이지가 밀려나고, 풀스캔이 끝나자마자 캐시 히트율이 급락하는 현상이 발생한다.
midpoint 전략은 이 "캐시 오염" 문제를 완화하기 위한 장치다.

```sql
-- midpoint 위치를 결정하는 변수 (기본값: 37, 전체의 약 3/8 지점)
SHOW VARIABLES LIKE 'innodb_old_blocks_pct';

-- 새 페이지가 Hot 영역으로 승격되기 위해 필요한 체류 시간(ms)
SHOW VARIABLES LIKE 'innodb_old_blocks_time';
```

`innodb_old_blocks_time`이 0이면 두 번째 접근 즉시 Hot으로 승격한다.
풀스캔이 잦은 환경이라면 이 값을 1000ms 이상으로 올려서, 단발 스캔 페이지가 Hot 영역을 오염시키지 못하게 막을 수 있다.

### 프리 리스트: 빈 프레임 관리

아직 어떤 페이지도 담지 않은 빈 프레임(frame) 목록이다.
새 페이지를 읽어 올 때는 이 리스트에서 빈 프레임을 꺼내 사용한다.

문제는 프리 리스트가 비었을 때다.
빈 프레임이 없으면 InnoDB는 LRU 리스트 하위에서 오래된 페이지를 내보내(eviction) 공간을 만들어야 한다.
이 eviction 비용이 발생하는 순간 읽기/쓰기 모두 일시적으로 느려질 수 있다.

운영 중에 `Innodb_buffer_pool_pages_free`가 지속적으로 0에 가깝다면, 버퍼 풀이 부족하다는 신호다.

### 플러시 리스트: 더티 페이지를 LSN 순서로 추적

수정된 페이지(더티 페이지)는 플러시 리스트에도 등록된다.
이 리스트는 LSN(Log Sequence Number) 순서로 정렬되어 있어서, 오래된 변경부터 디스크에 반영하는 데 사용된다.

여기서 중요한 점이 하나 있다.
하나의 페이지가 LRU 리스트와 플러시 리스트에 동시에 존재할 수 있다.
LRU에서는 "이 페이지를 캐시에 유지할 가치가 있는가"를 판단하고, 플러시 리스트에서는 "이 페이지를 디스크에 반영해야 하는가"를 판단한다.
두 리스트는 독립된 문제를 각각 관리하는 것이다.

## 페이지 생명주기: 읽기부터 flush까지

### 조회 경로

1. 필요한 페이지가 버퍼 풀에 이미 있으면 캐시 히트(Cache Hit)로 즉시 반환한다.
2. 없으면(캐시 미스) 프리 리스트에서 빈 프레임을 꺼내고, 디스크에서 페이지를 읽어 적재한 뒤 반환한다.

캐시 히트율이 높을수록 디스크 I/O가 줄어든다.
운영 환경에서 히트율이 99% 이상이면 대부분의 읽기가 메모리에서 처리되고 있다는 뜻이다.

### 변경 경로

1. 버퍼 풀의 페이지를 수정한다.
2. 해당 페이지를 dirty로 표시하고, 플러시 리스트에 등록한다.
3. 변경 내용은 redo log에 먼저 기록된다(Write-Ahead Logging).
4. 데이터 파일 반영(flush)은 백그라운드에서 나중에 이뤄진다.

이 WAL(Write-Ahead Logging) 원칙이 InnoDB의 핵심이다.
"redo에 먼저 쓰고, 데이터 파일은 나중에 반영한다."
덕분에 장애가 발생해도 redo log를 재적용하면 커밋된 변경을 복구할 수 있다.

### 체크포인트와 백그라운드 flush

백그라운드 스레드는 더티 페이지를 점진적으로 디스크에 내려쓰며, 체크포인트(Checkpoint) 지점을 전진시킨다.
체크포인트란 "여기까지는 데이터 파일에 안전하게 반영됐다"는 기록이다.

이 구조가 중요한 이유는 복구 시간과 직결되기 때문이다.
장애 복구 시 InnoDB는 체크포인트 이후의 redo만 재적용하면 된다.
체크포인트가 최신에 가까울수록 복구 범위가 줄어들고, 기동 시간이 짧아진다.

반대로 flush가 정체되면 다음과 같은 연쇄 문제가 발생한다.

1. 체크포인트가 전진하지 못한다.
2. 복구 시 재적용해야 할 redo 범위가 커진다.
3. redo log 공간이 부족해지면 InnoDB가 강제로 flush를 밀어붙이고, 이때 스파이크성 I/O가 발생한다.

그래서 운영에서 중요한 것은 "최대 flush 속도"가 아니라 "안정적인 flush 페이스"다.
급격한 쓰기 폭주 없이 꾸준히 더티 페이지를 내려쓰는 것이 이상적이다.

```sql
-- flush 관련 주요 설정
SHOW VARIABLES LIKE 'innodb_io_capacity';        -- 평상시 flush I/O 예산
SHOW VARIABLES LIKE 'innodb_io_capacity_max';     -- 긴급 flush 시 최대 I/O
SHOW VARIABLES LIKE 'innodb_max_dirty_pages_pct'; -- 더티 페이지 비율 상한
```

## 운영에서 바로 보는 지표

### 버퍼 풀 크기와 인스턴스

```sql
-- 버퍼 풀 메모리와 분할 단위 확인
SHOW VARIABLES WHERE Variable_name IN (
  'innodb_buffer_pool_size',
  'innodb_buffer_pool_instances',
  'innodb_page_size'
);
```

버퍼 풀은 너무 작으면 캐시 미스가 늘고, 너무 크게 잡으면 OS 여유 메모리를 압박한다.
전용 DB 서버라면 물리 메모리의 약 60~80%를 시작점으로 두고, 워크로드 기준으로 조정하는 방식이 일반적이다.

`innodb_buffer_pool_instances`는 버퍼 풀을 여러 인스턴스로 나눠 내부 뮤텍스 경합을 줄이는 설정이다.
버퍼 풀이 1GB 이상이면 보통 8개 이상으로 나누는 것을 권장한다.

### 히트율과 읽기 압력

```sql
-- 디스크 읽기 대비 메모리 읽기 비율 관측
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%';
```

주요 지표를 정리하면 다음과 같다.

- `Innodb_buffer_pool_read_requests`: 버퍼 풀에 대한 논리적 읽기 요청 수
- `Innodb_buffer_pool_reads`: 버퍼 풀에 없어서 디스크에서 읽은 횟수

히트율은 `1 - (reads / read_requests)` 로 계산할 수 있다.
`reads`가 빠르게 증가하면 실제 디스크 읽기 압력이 높다는 신호다.
다만 히트율 숫자 하나만으로 결론 내리기보다, 응답시간(p95/p99)과 함께 봐야 정확하다.

### 더티 페이지와 flush 압력

```sql
-- 더티 페이지 누적과 공간 상태 점검
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_dirty';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_data';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_pages_free';
```

더티 페이지 비율이 장시간 높게 유지되면 체크포인트 지연과 스파이크성 flush 위험이 커진다.
반대로 free 페이지가 지나치게 적으면 읽기/쓰기 순간에 eviction 비용이 튀는 현상이 나타날 수 있다.

이 세 가지(히트율, 더티 비율, free 페이지)를 함께 보면 버퍼 풀의 전반적인 건강 상태를 판단할 수 있다.

## 자주 부딪히는 오해

### "커밋했으니 데이터 파일에도 이미 반영됐다"

항상 그렇지 않다.
커밋 시점은 redo log의 내구성 보장 시점이다.
데이터 파일 반영은 이후 백그라운드 flush 단계에서 이뤄진다.
이 둘이 같은 시점이라고 가정하면, 장애 복구 동작이나 체크포인트 개념이 이해되지 않는다.

### "버퍼 풀은 크게만 잡으면 무조건 좋다"

아니다.
버퍼 풀이 크면 캐시 용량은 늘어나지만, 동시에 관리해야 할 더티 페이지도 늘어난다.
체크포인트 간격이 길어지면 복구 시간이 늘고, 급격한 flush가 필요한 상황에서 I/O 스파이크가 심해질 수 있다.
OS 페이지 캐시, 연결 메모리, 기타 프로세스가 쓸 메모리까지 포함해 시스템 전체 메모리 계획 안에서 결정해야 한다.

### "히트율이 높으니 문제 없다"

부분적으로만 맞다.
히트율이 99%라도 특정 구간에서 더티 페이지 flush 스톨이나 락 경합이 있으면 체감 지연은 급격히 커질 수 있다.
히트율은 "평균"이고, 사용자가 느끼는 것은 "꼬리 지연(tail latency)"이기 때문이다.
그래서 히트율, 지연시간, flush 관련 지표를 묶어서 봐야 한다.

## 마무리

이번 글에서는 InnoDB 버퍼 풀의 내부 구조와 페이지 생명주기를 정리했다.

1. 버퍼 풀은 단순 캐시가 아니라 "성능 + 복구" 경계를 동시에 담당하는 핵심 계층이다.
2. 쓰기는 "버퍼 풀 수정 → redo 기록 → 지연 flush" 순서로 진행된다(WAL 원칙).
3. LRU/free/flush 리스트가 각각 캐시 유지, 공간 관리, 쓰기 반영을 담당하며, 하나의 페이지가 여러 리스트에 동시에 존재할 수 있다.
4. 운영 지표는 히트율 하나가 아니라 응답시간, 더티 비율, free 페이지를 함께 봐야 의미가 있다.
5. 튜닝 목표는 최고 성능 한순간이 아니라, 스파이크를 줄이는 안정적인 flush 페이스 설계다.

다음 글에서는 doublewrite buffer, redo/undo, log buffer를 하나의 쓰기/복구 경로로 연결해 "왜 InnoDB가 crash-safe를 유지하는가"를 이어서 정리할 예정이다.

