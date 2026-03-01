---
title: "[MySQL 아키텍처 1] 성능 튜닝 전에 구조부터: MySQL Server와 InnoDB의 역할 경계 정리"
pubDatetime: 2026-03-01T00:00:00.000Z
description: "MySQL 엔진과 InnoDB의 역할 경계를 중심으로 스레드, 메모리, 플러그인/컴포넌트, 쿼리 실행 구조를 입문 관점에서 정리한다."
categories: [database, learning]
tags: [mysql, innodb, architecture, threading, memory, optimizer, query-execution]
draft: false
---

MySQL은 사용자 관점에서는 다른 DBMS와 큰 차이가 없어 보이지만, 내부는 역할 분리가 강한 구조를 가진다.
처음엔 이 차이가 체감되지 않지만, 실행계획을 읽거나 성능 이슈를 추적할 때는 이 구조적 차이가 바로 드러난다.
이번 글에서는 어디까지가 MySQL 엔진의 책임이고 어디부터가 스토리지 엔진의 책임인지, 그 경계를 기준으로 전체 구조를 정리한다.
이 글은 SQL 기본 문법과 기본 조회 쿼리를 이미 사용해본 독자를 기준으로 작성했다.

## MySQL 전체 구조에서 먼저 볼 것

아래 그림은 MySQL의 전체 구조를 한눈에 보기 위한 기준점이다.
처음부터 모든 구성요소를 외우기보다, 요청이 들어와 실행되는 흐름에서 MySQL 엔진과 스토리지 엔진이 어디서 역할을 나누는지 먼저 확인하는 편이 이해가 빠르다.

<img src="/images/mysql/mysql-architecture-overview.svg" alt="MySQL 전체 구조" style="display:block; width:100%; max-width:900px; height:auto; margin:1rem auto;" />

이 글에서 그림을 볼 때 확인할 포인트는 세 가지다.

1. SQL 처리는 MySQL 엔진(서버 레이어)에서 담당한다.
2. 실제 데이터 읽기/쓰기와 저장 관리는 스토리지 엔진(InnoDB)에서 담당한다.
3. 두 계층은 핸들러 인터페이스를 통해 연결된다.

핵심 용어를 짧게 정리하면 다음과 같다.

- MySQL 엔진: SQL 해석과 실행 계획 결정 담당
- 스토리지 엔진: 실제 데이터 저장/조회 담당
- Handler API: 두 계층이 작업을 주고받는 공통 인터페이스
- 포그라운드 스레드: 클라이언트 요청 처리 스레드
- 백그라운드 스레드: 내부 유지 작업 처리 스레드

## 역할 분리: MySQL 엔진과 스토리지 엔진

MySQL은 하나의 덩어리로 동작하는 게 아니라, SQL을 해석하고 실행 전략을 만드는 계층과 데이터를 실제로 다루는 계층이 분리되어 있다.

### MySQL 엔진(서버 레이어)

MySQL 엔진은 클라이언트 연결을 관리하는 커넥션 핸들러를 시작으로, SQL 파서와 전처리기에서 문장을 해석하고 옵티마이저에서 실행 계획을 선택한다.
요약하면, 쿼리를 어떤 순서와 방식으로 실행할지 결정하는 책임이 MySQL 엔진에 있다.

### 스토리지 엔진(InnoDB)

스토리지 엔진은 MySQL이 데이터를 실제로 저장하고 조회하는 계층이다.
실행기가 요청한 작업을 데이터 파일과 인덱스 구조에 반영하며, 읽기/쓰기, 인덱스 탐색, 락과 트랜잭션 제어를 담당한다.
종류는 여러 가지지만 현재 운영 환경의 기본값이자 사실상 표준은 InnoDB다.
참고로 MyISAM은 트랜잭션/외래 키를 지원하지 않아 주로 레거시 문맥에서 언급되고, MEMORY 엔진은 메모리 기반이라 재시작 시 데이터가 유지되지 않는다.

## 두 계층은 어떻게 연결되는가

MySQL 엔진의 실행기는 스토리지 엔진 내부를 직접 호출하지 않고, 공통 인터페이스를 통해 읽기/쓰기 작업을 요청한다.
이 공통 인터페이스가 Handler API이며, InnoDB 역시 이 경로로 MySQL 엔진과 데이터를 주고받는다.

결국 이 구조에서 먼저 잡아야 할 기준은, SQL 처리 문제와 데이터 처리 문제를 같은 층위에서 보지 않는 것이다.
성능 이슈를 추적할 때도 MySQL 엔진 구간과 스토리지 엔진 구간을 분리해서 보면 원인 범위를 더 빠르게 좁힐 수 있다.

## MySQL 스레딩 구조

MySQL은 `mysqld` 단일 프로세스 안에서 여러 스레드가 역할을 나눠 동작한다.
스레드는 크게 두 종류로 구분된다.

- 포그라운드 스레드: 클라이언트 연결과 쿼리 실행을 담당
- 백그라운드 스레드: flush, purge, 체크포인트 같은 내부 유지 작업을 담당

핵심은 사용자 요청 처리 경로와 내부 유지 작업 경로가 분리되어 있다는 점이다.

## 스레드 모델: 전통 모델과 스레드풀 모델

여기서 다루는 기본 모델은 MySQL 커뮤니티 에디션의 전통적인 스레드 모델이다.
핵심 차이는 커넥션과 포그라운드 스레드의 매핑 방식에 있다.

- 전통 모델: 커넥션 1개당 포그라운드 스레드 1개(1:1)
- 스레드풀 모델: 여러 커넥션 요청을 제한된 워커 스레드가 처리(1:N)

MySQL 엔터프라이즈 에디션과 Percona Server는 전통 모델 외에 스레드풀 모델도 사용할 수 있다.

### 포그라운드 스레드(클라이언트 스레드)

포그라운드 스레드는 클라이언트 연결과 쿼리 요청을 직접 처리하는 실행 주체다.
전통적인 스레드 모델에서는 커넥션마다 포그라운드 스레드가 하나씩 할당되므로, 동시에 접속한 클라이언트 수만큼 포그라운드 스레드가 존재할 수 있다.

클라이언트가 작업을 마치고 커넥션을 종료하면, 해당 스레드는 바로 사라지지 않고 스레드 캐시로 반환되어 재사용된다.
다만 캐시에 이미 충분한 대기 스레드가 있으면 반환하지 않고 종료되며, 캐시에 유지할 최대 스레드 수는 `thread_cache_size` 시스템 변수로 제어한다.

쿼리 처리 과정에서 포그라운드 스레드는 스토리지 엔진(InnoDB)을 통해 데이터를 읽고 쓴다.
필요한 데이터가 메모리(예: InnoDB 버퍼 풀)에 있으면 메모리에서 처리하고, 없으면 디스크에서 데이터를 읽어와 작업을 진행한다.

### 백그라운드 스레드

InnoDB는 사용자 쿼리 실행과 별도로, 데이터 정리/기록 작업을 백그라운드 스레드에서 처리한다.
용어가 낯설면 아래 세 가지만 먼저 잡고 보면 된다.

- `flush`: 메모리에 있는 변경 내용을 디스크에 기록하는 동작
- `더티 페이지(dirty page)`: 메모리에서 값이 바뀌었지만 아직 디스크에는 반영되지 않은 페이지
- `체인지 버퍼(change buffer)`: 보조 인덱스 변경을 잠시 모아두었다가 나중에 반영하는 영역

백그라운드 스레드는 주로 다음 작업을 담당한다.

1. 체인지 버퍼 내용을 실제 인덱스에 병합
2. 로그를 디스크로 기록(flush)
3. 버퍼 풀의 더티 페이지를 디스크에 반영
4. 필요한 데이터를 버퍼 풀로 미리 읽어옴
5. 잠금 대기와 데드락 상태를 감시

핵심은 쿼리 스레드가 내부 유지 작업까지 직접 처리하지 않도록 분리해, 전체 처리량과 응답성을 안정적으로 유지하는 데 있다.

#### 로그 스레드와 쓰기 스레드가 중요한 이유

백그라운드 작업 중에서도 영향이 큰 축은 두 가지다.
로그를 디스크에 기록하는 경로와, 더티 페이지를 디스크로 내려쓰는 경로다.

MySQL 5.5부터는 읽기/쓰기 I/O 스레드 수를 분리해 조정할 수 있으며, `innodb_read_io_threads`와 `innodb_write_io_threads` 변수로 설정한다.
읽기는 보통 요청 시점에 바로 필요해서 지연이 어렵고, 쓰기는 모아서 배치 처리하기 쉽다.
그래서 일반적으로 읽기 스레드보다 쓰기 스레드 수 조정이 성능에 더 직접적인 영향을 줄 수 있다.

```sql
SHOW VARIABLES LIKE 'innodb_read_io_threads';
SHOW VARIABLES LIKE 'innodb_write_io_threads';
```

## 스레드 상태를 볼 때 먼저 확인할 값

스레드 모델을 개념으로 이해했다면, 상태값은 GLOBAL 기준으로 먼저 확인하는 편이 혼동이 적다.

```sql
SHOW VARIABLES LIKE 'thread_cache_size';

SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Threads_cached',
  'Threads_connected',
  'Threads_created',
  'Threads_running'
)
ORDER BY FIELD(
  VARIABLE_NAME,
  'Threads_cached',
  'Threads_connected',
  'Threads_created',
  'Threads_running'
);
```

- `thread_cache_size`: 재사용할 스레드를 얼마나 유지할지 결정
- `Threads_cached`: 캐시에 대기 중인 재사용 가능 스레드 수
- `Threads_connected`: 현재 연결된 클라이언트 수
- `Threads_running`: 실제로 실행 중인 스레드 수
- `Threads_created`: 새로 생성된 스레드 누적 수

실습 환경의 유휴 시점에서 확인한 기준값은 다음과 같았다.
아래 값은 환경과 관측 시점에 따라 달라질 수 있는 예시다.

- `thread_cache_size=9`
- `Threads_cached=1`
- `Threads_connected=1`
- `Threads_created=2`
- `Threads_running=2`

## 간단 실습: 상태값 변화 확인

아래 관측 쿼리를 같은 콘솔에서 반복 실행하면, 상태값 변화를 비교하기 쉽다.

```sql
-- 콘솔 A (관측용: 기준값/실행 중/종료 후 동일하게 실행)
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Threads_cached',
  'Threads_connected',
  'Threads_created',
  'Threads_running'
)
ORDER BY FIELD(
  VARIABLE_NAME,
  'Threads_cached',
  'Threads_connected',
  'Threads_created',
  'Threads_running'
);
```

```sql
-- 콘솔 B (부하를 만드는 세션)
SELECT CONNECTION_ID() AS conn_id, SLEEP(30) AS slept;
```

확인 포인트는 세 가지다.

1. 콘솔 A에서 관측 쿼리를 먼저 실행해 기준값을 확인한다.
2. 콘솔 B에서 `SLEEP`을 실행한 뒤, 실행 중에 콘솔 A에서 관측 쿼리를 다시 실행한다.
3. `SLEEP` 종료 후 콘솔 A에서 관측 쿼리를 한 번 더 실행해 값이 일부 복귀하는지 확인한다.

추가로 실행 중 세션을 눈으로 확인하고 싶다면 아래 쿼리를 사용한다.

```sql
SHOW FULL PROCESSLIST;
```

실습의 핵심은 절대값이 아니라 `연결 증가 -> 상태값 변화 -> 연결 종료 후 일부 복귀` 흐름을 확인하는 데 있다.

## 간단 실습: 포그라운드/백그라운드 스레드 구분

`performance_schema.threads`를 조회하면 스레드 유형을 직접 구분해 볼 수 있다.

```sql
SELECT TYPE, COUNT(*) AS cnt
FROM performance_schema.threads
GROUP BY TYPE;
```

```sql
SELECT THREAD_ID, NAME, TYPE, PROCESSLIST_USER, PROCESSLIST_COMMAND
FROM performance_schema.threads
WHERE TYPE = 'FOREGROUND'
ORDER BY THREAD_ID;
```

실습 환경에서는 `BACKGROUND=36`, `FOREGROUND=3`으로 확인됐고, 포그라운드 목록에는 실제 쿼리 세션(`thread/sql/one_connection`)이 포함됐다.

## 메모리 할당 및 사용 구조

스레드 구조 다음으로 보는 메모리 구조의 핵심은 간단하다.
MySQL 메모리는 서버 전체가 공유하는 영역과, 커넥션/쿼리마다 따로 쓰는 영역으로 나뉜다.
여기서는 세부 구현보다 구분 기준만 먼저 잡는다.

<img src="/images/mysql/mysql-memory-allocation-overview.svg" alt="MySQL 메모리 할당 구조" style="display:block; width:100%; max-width:940px; height:auto; margin:1rem auto;" />

그림에서 먼저 확인할 포인트는 두 가지다.

1. 글로벌 메모리: 모든 세션이 함께 쓰는 공용 메모리
2. 세션 메모리: 연결 수와 쿼리 특성에 따라 늘어나는 메모리

### 글로벌 메모리

글로벌 메모리는 특정 연결만 쓰는 공간이 아니라, MySQL 서버 전체가 함께 쓰는 공용 메모리다.
그래서 연결 수가 늘어나도 연결마다 하나씩 생기지 않고, 모든 스레드가 같은 영역을 공유한다.

대표적인 글로벌 메모리는 다음과 같다.

1. 테이블 캐시: 자주 쓰는 테이블 정보를 메모리에 보관해 다시 여는 비용을 줄임
2. InnoDB 버퍼 풀: 자주 읽거나 자주 바뀌는 데이터를 메모리에 두어 디스크 접근을 줄임
3. InnoDB 어댑티브 해시 인덱스: 자주 찾는 데이터 경로를 더 빠르게 찾도록 돕는 메모리 구조
4. InnoDB 리두 로그 버퍼: 변경 이력을 잠시 메모리에 모아 두었다가 디스크 로그로 기록

### 로컬(세션) 메모리

로컬 메모리 영역은 세션 메모리라고도 하며, 클라이언트 스레드가 쿼리를 처리할 때 사용하는 메모리다.
클라이언트가 접속하면 서버는 요청을 처리할 스레드를 할당하고, 이 스레드가 쓰는 메모리는 다른 스레드와 공유되지 않는다.

대표 예시는 다음과 같다.

- `sort buffer`
- `join buffer`
- `read buffer`
- `read_rnd buffer`
- 커넥션/네트워크 버퍼
- 임시 테이블 메모리

로컬 메모리는 항상 같은 방식으로 할당되지 않는다.

1. 커넥션이 열려 있는 동안 유지되는 메모리
2. 쿼리 실행 시점에만 잠깐 할당되는 메모리(`sort buffer`, `join buffer` 등)

핵심은 로컬 메모리가 세션마다 독립적으로 늘어날 수 있다는 점이다.
개별 버퍼 크기를 크게 잡고 동시 연결까지 많아지면, 최악의 경우 메모리 부족으로 서버가 불안정해질 수 있다.
그래서 글로벌 메모리뿐 아니라 세션 메모리 관련 변수도 함께 점검해야 한다.

메모리 관점의 1차 기준은 "공유 영역 크기"와 "세션당 증가분"을 분리해서 보는 것이다.

## 메모리 관련 변수 빠르게 확인하기

```sql
SHOW VARIABLES WHERE Variable_name IN (
  'innodb_buffer_pool_size',
  'innodb_log_buffer_size',
  'max_connections',
  'sort_buffer_size',
  'join_buffer_size',
  'read_buffer_size',
  'read_rnd_buffer_size',
  'tmp_table_size',
  'max_heap_table_size'
);
```

실습 환경에서는 다음 값으로 확인됐다.

- `innodb_buffer_pool_size=134217728` (128MB)
- `innodb_log_buffer_size=16777216` (16MB)
- `max_connections=151`
- `sort_buffer_size=262144`, `join_buffer_size=262144`
- `read_buffer_size=131072`, `read_rnd_buffer_size=262144`
- `tmp_table_size=16777216`, `max_heap_table_size=16777216`

여기서 중요한 건 숫자 자체보다, 어떤 값이 공유 메모리인지 세션 메모리인지 구분해서 보는 습관이다.

## 플러그인 스토리지 엔진 모델

여기서 말하는 플러그인 스토리지 엔진 구조는 MySQL 아키텍처 기준의 설명이다.
다른 DBMS는 같은 방식의 엔진 분리 모델을 사용하지 않을 수 있다.

앞서 본 계층 분리 구조 위에서, MySQL은 스토리지 엔진과 여러 서버 기능을 플러그인 형태로 확장할 수 있다.
예를 들어 인증, 전문 검색 파서, 쿼리 재작성 기능을 플러그인으로 추가할 수 있다.
플러그인 모델의 장점은 필요한 기능을 선택적으로 붙일 수 있는 유연성이다.
반면 플러그인 간 의존성/수명주기 관리에는 한계가 있어, 이 지점이 컴포넌트 아키텍처 도입 배경이 됐다.
실무에서는 저장 엔진 관점에서 InnoDB를 기본 선택으로 보는 경우가 대부분이다.

```sql
SHOW ENGINES;
SHOW VARIABLES LIKE 'default_storage_engine';

SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();
```

## 컴포넌트 아키텍처

MySQL 8.0부터는 기존 플러그인 아키텍처를 보완하기 위해 컴포넌트(Component) 아키텍처가 도입됐다.
플러그인 구조의 한계는 크게 세 가지다.

1. 플러그인은 기본적으로 MySQL 서버와만 인터페이스하고, 플러그인 간 통신이 어렵다.
2. 플러그인은 서버 내부 변수나 함수를 직접 참조하는 방식이 많아 캡슐화와 안전성이 약하다.
3. 플러그인 간 의존관계를 명확히 선언하기 어려워 초기화/로딩 순서 관리가 복잡하다.

컴포넌트 아키텍처는 이런 한계를 줄이기 위해 서비스 기반 인터페이스와 의존성 관리 구조를 제공한다.

## 쿼리 실행 구조

아키텍처를 구성 요소로 나눠 봤다면, 이제는 실제 쿼리가 어떤 경로로 처리되는지 순서대로 보는 단계다.
핵심 흐름은 다음과 같다.

1. 클라이언트가 SQL을 전송한다.
2. MySQL 엔진이 SQL을 파싱하고 전처리한다.
3. 옵티마이저가 실행 계획을 선택한다.
4. 실행기가 스토리지 엔진에 필요한 작업을 요청한다.
5. 스토리지 엔진(InnoDB)이 데이터 읽기/쓰기를 수행하고 결과를 반환한다.

처음에는 각 단계의 내부 구현보다 "어느 계층에서 어떤 결정을 하는가"를 구분해서 보는 것이 중요하다.

<img src="/images/mysql/mysql-query-execution-flow.svg" alt="MySQL 쿼리 실행 전체 흐름" style="display:block; width:100%; max-width:960px; height:auto; margin:1rem auto;" />

### 쿼리 파서

쿼리 파서는 클라이언트가 보낸 SQL을 MySQL이 처리할 수 있는 토큰 단위로 나누고, 이를 트리 형태(파스 트리)로 구성한다.
이 단계에서 문법 오류가 검출되며, 오류 메시지가 사용자에게 반환된다.

<img src="/images/mysql/mysql-query-parser-tree.svg" alt="쿼리 파서 토큰화와 파스 트리 예시" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

예를 들어 `SELECT name FROM members WHERE id = 1;` 같은 문장은
`SELECT`, `FROM`, `WHERE` 같은 키워드와 식별자/연산자/리터럴로 분해된 뒤,
`SELECT_STMT`를 루트로 하는 트리 구조로 정리된다.

### 전처리기

전처리기는 파서가 만든 파스 트리를 바탕으로, 쿼리가 실제로 실행 가능한지 확인하는 단계다.
이 과정에서 토큰을 실제 객체(테이블, 칼럼, 함수 등)에 매핑하고, 객체 존재 여부와 접근 권한을 검사한다.

파서가 "문법이 맞는지"를 본다면, 전처리기는 "실제로 실행 가능한지"를 본다.

<img src="/images/mysql/mysql-preprocessor-validation-flow.svg" alt="전처리기 검증 흐름" style="display:block; width:100%; max-width:960px; height:auto; margin:1rem auto;" />

```sql
-- 실패 예시: 존재하지 않는 객체 참조
SELECT no_such_col
FROM information_schema.tables;
```

이 쿼리는 문법 자체는 맞지만, `information_schema.tables`에는 `no_such_col`이 없기 때문에
객체 매핑 단계에서 오류가 반환된다.

### 옵티마이저

옵티마이저는 SQL을 실행하기 전에 가능한 실행 방법을 비교하고, 예상 비용이 가장 낮은 실행 계획을 선택한다.
이 과정은 내비게이션이 여러 경로를 비교해 가장 빠를 것으로 보이는 길을 고르는 방식과 유사하다.

다만 선택 기준은 실제 실행 결과가 아니라 통계 정보와 비용 모델 기반의 추정치다.
그래서 선택된 계획이 항상 실제로 가장 빠른 것은 아니며, 데이터 분포나 통계 상태에 따라 결과가 달라질 수 있다.

<img src="/images/mysql/mysql-optimizer-plan-selection.svg" alt="옵티마이저 후보 계획 비교와 선택 흐름" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

그림의 비용 숫자는 동작 원리를 설명하기 위한 예시값이다.
옵티마이저의 핵심은 "가능한 계획을 여러 개 만든 뒤, 현재 통계 기준으로 가장 저렴해 보이는 계획을 고른다"는 점이다.

### 실행 엔진

실행 엔진은 옵티마이저가 선택한 실행 계획을 실제 처리 순서로 수행하는 단계다.
핵심 역할은 계획에 따라 어떤 연산을 먼저 수행하고, 어떤 시점에 데이터를 읽거나 다음 연산으로 넘길지 조정하는 것이다.
실행 엔진은 데이터를 직접 저장/조회하기보다, 필요한 작업을 핸들러에 요청하고 반환된 결과를 조합한다.

### 핸들러

핸들러는 MySQL 엔진과 스토리지 엔진 사이의 호출 인터페이스다.
실행 엔진은 핸들러를 통해 읽기/쓰기/인덱스 탐색 같은 작업을 요청하고, 스토리지 엔진은 처리 결과를 다시 반환한다.
이 경계 덕분에 MySQL 엔진은 저장 방식의 내부 구현을 직접 알지 않아도 된다.

## 마무리

이번 글에서는 MySQL 아키텍처를 역할 경계 기준으로 정리했다.
핵심은 SQL 처리 계층과 데이터 처리 계층을 분리해 보는 관점이며, 성능 이슈를 볼 때도 이 기준이 출발점이 된다.
다음 글에서는 InnoDB 버퍼 풀과 로그 구조를 중심으로, 이 경계가 실제 성능 지표와 어떻게 연결되는지 이어서 정리할 예정이다.

