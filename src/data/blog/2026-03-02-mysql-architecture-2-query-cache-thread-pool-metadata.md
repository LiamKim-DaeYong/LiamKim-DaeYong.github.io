---
title: "[MySQL 아키텍처 2] 쿼리 캐시 이후: 스레드 풀과 트랜잭션 지원 메타데이터"
pubDatetime: 2026-03-02T00:00:00.000Z
description: "쿼리 캐시의 한계와 8.0 제거 배경을 짚고, 스레드 풀과 트랜잭션 지원 메타데이터의 역할을 아키텍처 관점에서 정리한다."
categories: [database, learning]
tags: [mysql, architecture, thread-pool, query-cache, metadata]
draft: false
---

이전 글에서 MySQL 엔진과 InnoDB의 역할 경계를 먼저 정리했다.
이번 글은 쿼리 캐시가 왜 사라졌는지, 그리고 스레드 풀이 무엇을 해결하려는지에 집중한다.
핵심은 "빠른 기능처럼 보이던 것이 왜 없어졌는지", 그리고 "고동시성에서 왜 처리 모델이 중요한지"를 이해하는 것이다.

## 쿼리 캐시: 왜 8.0에서 제거됐는가

쿼리 캐시는 동일 SQL의 실행 결과를 메모리에 저장해 재사용하는 기능이었다.
같은 조회가 반복되는 환경에서는 빠른 응답에 도움이 됐다.

문제는 데이터가 바뀔 때 발생했다.
테이블에 DML이 발생하면 해당 테이블과 관련된 캐시 엔트리가 통째로 무효화됐고,
이 과정에서 글로벌 뮤텍스 경합이 동시 처리 경로를 부분적으로 직렬화했다.
운영이 복잡해지고 버그 이슈도 반복되면서, MySQL 8.0에서는 쿼리 캐시 기능이 제거됐다.

정리하면 쿼리 캐시는 일부 환경에서는 효과가 있었지만, 일반적인 서비스 환경에서는 유지 비용이 더 컸다.

## 스레드 풀

이전 글에서 `one-thread-per-connection`과 스레드 풀의 기본 매핑 차이는 정리했다.
여기서는 개념 반복보다, 실제 운영에서 바로 보는 변수와 튜닝 포인트에 집중한다.

<img src="/images/mysql/mysql-thread-model-comparison.svg" alt="one-thread-per-connection과 thread pool 비교" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

구현 방식은 제품마다 다르다.
Oracle MySQL은 Enterprise Edition에서 Thread Pool을 플러그인으로 제공하고,
Percona Server는 별도 구현을 서버에 내장해 제공한다.
두 구현은 호환 방식이 다르기 때문에, 라이브러리 파일만 복사해 혼용하는 접근은 피하는 편이 안전하다.

### Percona 확장: 우선순위 큐

Percona 구현은 우선순위 큐(High/Low priority queue) 관련 설정을 제공한다.
설정에 따라 특정 작업을 먼저 처리해 잠금 해제를 앞당기면, 전체 락 경합을 줄이는 데 도움이 될 수 있다.

또 한 가지는 기대치다.
스레드 풀은 "설치하면 바로 빨라지는 기능"이 아니라, 동시 접속이 많은 환경에서 병목을 줄이기 위한 조정 수단에 가깝다.
워커 수를 너무 보수적으로 잡거나 쿼리가 길게 점유되면, 대기 시간이 늘어 오히려 느려질 수도 있다.
그래서 적용 전후로 지표를 비교해 실제 병목이 줄었는지 확인해야 한다.

아래 변수 설명과 그림은 Percona Server 기준이다.
Oracle MySQL Enterprise Edition은 변수 구성과 동작이 일부 다를 수 있다.
스레드 풀을 볼 때는 아래 네 변수를 함께 보면 흐름이 잡힌다.
먼저 그림으로 변수 관계를 보고, 그다음 항목별로 읽으면 훨씬 이해가 쉽다.

<img src="/images/mysql/mysql-thread-pool-variables-map.svg" alt="thread pool 주요 변수 관계도(Percona 기준)" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

- `thread_pool_size`: 스레드 그룹 개수. 보통 CPU 코어 수를 시작점으로 둔다.
- `thread_pool_oversubscribe`: 그룹당 추가 동시 실행 허용량. 너무 크면 스케줄링 비용이 커질 수 있다.
- `thread_pool_stall_limit`: 작업이 오래 막혔다고 판단하는 시간 기준(ms).
- `thread_pool_max_threads`: 워커 스레드 상한. 상한에 도달하면 새 요청은 대기한다.

특히 지연 시간에 민감한 서비스는 `thread_pool_stall_limit`을 조정 대상으로 보게 된다.
다만 이 값을 극단적으로 낮추면 스레드를 너무 자주 깨우거나 늘리게 되어, 오히려 시스템이 불안정해질 수 있다.

변수 이름과 동작 범위는 제품/버전에 따라 차이가 있을 수 있다.
그래서 튜닝 전에는 현재 서버에서 노출되는 변수와 기본값을 먼저 확인하는 것이 안전하다.

```sql
SHOW VARIABLES LIKE 'thread_handling';
SHOW VARIABLES LIKE 'thread_pool%';
```

## 트랜잭션 지원 메타데이터

테이블을 만들면 행 데이터만 저장되는 게 아니라, 테이블 이름/컬럼/인덱스 같은 구조 정보도 함께 저장된다.
이 구조 정보를 메타데이터(데이터 딕셔너리)라고 부른다.

MySQL 5.7까지는 이 메타데이터를 파일(`.frm` 등) 중심으로 관리했다.
그래서 서버가 비정상 종료되면 파일 상태와 실제 엔진 상태가 어긋나는 문제가 생길 수 있었고, 운영에서는 이를 "테이블이 깨졌다"라고 표현하곤 했다.

MySQL 8.0부터는 메타데이터를 InnoDB 기반 트랜잭션 데이터 딕셔너리로 관리한다.
메타데이터 변경도 복구 흐름 안에서 처리되기 때문에, 중간 상태가 남는 문제가 이전보다 크게 줄었다.

| 관점 | MySQL 5.7까지 | MySQL 8.0부터 |
|---|---|---|
| 메타데이터 저장 | 파일 중심(`.frm` 등) | InnoDB 트랜잭션 데이터 딕셔너리 |
| 비정상 종료 후 정합성 | 파일-엔진 불일치 가능 | 복구 흐름에서 정합성 개선 |
| 스키마 변경 안정성 | 중간 상태 이슈 가능 | DDL 원자성(atomic DDL)에 가깝게 개선 |

참고로 `mysql.ibd`는 딕셔너리 관련 내부 정보를 담는 전용 테이블스페이스다.
여기서 테이블스페이스는 InnoDB가 디스크에 데이터를 저장할 때 쓰는 논리 단위라고 보면 된다.

요약: 8.0의 핵심은 메타데이터를 파일에서 InnoDB 트랜잭션 관리로 옮겨 정합성과 복구 안정성을 높인 것이다.

```sql
-- 현재 스키마 테이블 목록과 엔진 확인
SELECT TABLE_SCHEMA, TABLE_NAME, ENGINE
FROM information_schema.tables
WHERE TABLE_SCHEMA NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys')
ORDER BY TABLE_SCHEMA, TABLE_NAME
LIMIT 20;

-- 현재 스키마 컬럼 메타데이터 확인
SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.columns
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION
LIMIT 30;
```

## 마무리

이번 글에서는 쿼리 캐시 제거 배경, 스레드 풀의 목적과 주요 변수, 트랜잭션 지원 메타데이터 전환을 연결해서 정리했다.
핵심은 기능 이름보다 "동시성 병목을 어떻게 줄였는지"와 "장애 시 메타데이터 정합성을 어떻게 지키는지"를 함께 보는 관점이다.
다음 글에서는 InnoDB 스토리지 엔진 아키텍처로 넘어가, 클러스터링 인덱스와 MVCC, 잠금 없는 일관된 읽기 흐름을 이어서 다룰 예정이다.

