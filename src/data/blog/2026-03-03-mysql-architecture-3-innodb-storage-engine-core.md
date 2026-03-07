---
title: "[MySQL 아키텍처 3] InnoDB 스토리지 엔진 아키텍처 핵심 정리"
pubDatetime: 2026-03-03T00:00:00.000Z
description: "InnoDB의 클러스터링, 외래 키, MVCC, 잠금 없는 일관된 읽기, 자동 데드락 감지까지 핵심 동작을 구조적으로 정리한다."
categories: [database, learning]
tags: [mysql, innodb, clustered-index, foreign-key, mvcc, deadlock]
draft: false
---

이전 두 글에서 MySQL 엔진과 스토리지 엔진의 역할 경계, 그리고 쿼리 캐시 제거와 스레드 풀까지 정리했다.
이번 글은 InnoDB 내부로 들어간다.
핵심은 "InnoDB가 동시성과 정합성을 어떤 비용으로 맞바꾸는가"이다.
실행계획이 같아도 InnoDB 내부에서 어떤 버전 레코드를 읽고 어떤 잠금을 잡는지에 따라 지연 지점이 달라지기 때문에, 이 구조를 먼저 잡아두면 성능 이슈 추적이 훨씬 수월해진다.

## 프라이머리 키가 저장 구조를 결정한다

InnoDB 테이블은 프라이머리 키(Primary Key) 기준으로 정렬 저장되는 클러스터드 인덱스(Clustered Index) 구조를 가진다.
다시 말해, 데이터 파일의 레코드 배치 자체가 PK 순서를 따른다.
이 점이 MyISAM이나 다른 스토리지 엔진과 근본적으로 다른 부분이다.

여기서 중요한 차이가 하나 더 있다.
세컨더리 인덱스(Secondary Index)는 레코드의 물리 주소를 저장하지 않고, 해당 레코드의 PK 값을 저장한다.
그래서 세컨더리 인덱스를 통해 레코드를 찾을 때는 항상 두 단계를 거친다.

1. 세컨더리 인덱스에서 조건에 맞는 엔트리를 찾는다.
2. 그 엔트리에 저장된 PK 값으로 클러스터드 인덱스를 다시 탐색해 최종 레코드에 도달한다.

아래 그림은 이 경로를 보여준다.

<img src="/images/mysql/innodb-clustered-index-lookup.svg" alt="InnoDB 클러스터드 인덱스와 세컨더리 인덱스 조회 경로" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

실제로 이 경로가 어떻게 보이는지 EXPLAIN으로 확인할 수 있다.

```sql
EXPLAIN SELECT name FROM user WHERE email = 'alice@example.com';
```

`email`에 세컨더리 인덱스가 있다면, 실행계획에서 `idx_email`을 사용해 후보를 찾고 PK로 다시 레코드를 조회하는 흐름이 보일 것이다.
이 이중 탐색 구조는 InnoDB에서 매우 일반적이다.

### PK 설계가 전체 비용에 영향을 주는 이유

이 구조를 이해하면 PK 설계가 단순 유니크 제약이 아니라 저장 구조 선택이라는 점이 명확해진다.

- PK가 길면: 세컨더리 인덱스 엔트리마다 긴 PK를 저장해야 하므로 인덱스 크기가 증가한다.
- PK가 랜덤(UUID 등)하면: 새 레코드 삽입 시 클러스터드 인덱스의 물리적 순서가 흐트러져 페이지 분할(Page Split)이 빈번하게 발생한다.

운영 환경에서 `AUTO_INCREMENT` 정수 PK를 기본 선택으로 보는 이유가 여기에 있다.
순차 증가하는 값이 페이지 끝에 순서대로 추가되기 때문에 분할 비용이 낮고, 정수형이라 세컨더리 인덱스 크기도 작게 유지된다.

## 외래 키는 잠금을 전파한다

외래 키(Foreign Key)는 InnoDB에서 엔진 레벨로 지원한다.
부모/자식 테이블 간 무결성 검증을 자동으로 처리해주는 편리한 기능이지만, 내부 동작을 보면 예상보다 넓은 범위에서 잠금이 잡힌다.

```sql
CREATE TABLE parent (
  id BIGINT PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE child (
  id BIGINT PRIMARY KEY,
  parent_id BIGINT NOT NULL,
  CONSTRAINT fk_child_parent
    FOREIGN KEY (parent_id) REFERENCES parent(id)
) ENGINE=InnoDB;
```

이 구조에서 자식 테이블에 INSERT가 들어오면, InnoDB는 부모 테이블의 해당 행에 공유 잠금(S-lock)을 걸어 참조 무결성을 확인한다.
문제는 같은 시점에 다른 트랜잭션이 부모 행을 삭제하려고 배타 잠금(X-lock)을 요청하면 충돌이 발생한다는 점이다.

아래 그림은 이 잠금 전파 시나리오를 보여준다.

<img src="/images/mysql/innodb-fk-lock-propagation.svg" alt="외래 키 검증 시 잠금 전파 흐름" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

이 상황이 양방향으로 확대되면 데드락으로 이어질 수 있다.
예를 들어 T1이 자식 INSERT로 부모 행에 S-lock을 잡고 있는 동안, T2가 부모 DELETE로 X-lock을 대기하고, 동시에 T2가 잡고 있는 다른 잠금을 T1이 기다리는 구조가 만들어질 수 있다.

### 운영 관점에서의 선택

외래 키는 정합성을 높여주지만, 고동시성 구간에서는 이 잠금 비용이 처리량에 직접 영향을 준다.
그래서 실무에서는 두 가지 접근이 혼용된다.

1. 외래 키를 유지하되, 트랜잭션 순서를 일관되게 맞춰 데드락 가능성을 줄이는 방식
2. 외래 키 제약을 걸지 않고 애플리케이션 레벨에서 정합성을 관리하는 방식

어느 쪽이든 핵심은 "잠금 전파 범위를 인지하고 있느냐"다.
잠금이 어디까지 퍼지는지 모르면 성능 저하 원인을 추적하기 어렵다.

## MVCC: 잠금 없이 일관된 읽기를 제공하는 구조

InnoDB의 가장 중요한 특성 중 하나는 읽기 트랜잭션이 쓰기 트랜잭션을 기다리지 않는다는 점이다.
이것을 가능하게 하는 구조가 MVCC(Multi-Version Concurrency Control)이고, 이를 통해 제공되는 읽기 방식을 잠금 없는 일관된 읽기(Non-Locking Consistent Read)라고 부른다.

### 버퍼 풀과 언두 로그

MVCC의 핵심 구조는 두 가지다.

- 버퍼 풀(Buffer Pool): 레코드의 최신 버전을 보관한다.
- 언두 로그(Undo Log): 변경 이전의 과거 버전을 체인 형태로 보관한다.

레코드가 UPDATE 되면 버퍼 풀에는 최신 값이 올라가고, 변경 전 값은 undo 영역에 남는다.
이 undo 레코드들은 체인으로 연결되어 있어서, 필요하면 여러 단계 이전 버전까지 따라갈 수 있다.

읽기 트랜잭션은 자신의 Read View를 기준으로 "이 레코드의 어떤 버전이 나에게 보여야 하는가"를 판단한다.
최신 버전이 자신에게 보이지 않아야 하면 undo 체인을 따라 적절한 과거 버전을 찾아 반환한다.

<img src="/images/mysql/innodb-mvcc-consistent-read.svg" alt="InnoDB MVCC와 잠금 없는 일관된 읽기 흐름" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

### Read View와 격리 수준

Read View가 언제 만들어지는지가 격리 수준별 동작 차이의 핵심이다.

- **READ COMMITTED**: 문장(statement)을 실행할 때마다 Read View를 새로 만든다.
- **REPEATABLE READ**: 일반적으로 첫 일관된 읽기(consistent read) 시점에 Read View를 한 번 만들고 트랜잭션이 끝날 때까지 유지한다. (`START TRANSACTION WITH CONSISTENT SNAPSHOT`은 시작 시점에 스냅샷을 고정)

아래 시나리오로 차이를 확인할 수 있다.

```text
T1: SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
T1: START TRANSACTION;
T1: SELECT balance FROM account WHERE id = 1;  -- 결과: 100

T2: START TRANSACTION;
T2: UPDATE account SET balance = 200 WHERE id = 1;
T2: COMMIT;

T1: SELECT balance FROM account WHERE id = 1;  -- 결과: 200
T1: COMMIT;
```

READ COMMITTED에서 T1의 두 번째 SELECT는 새로운 Read View를 만들기 때문에, T2가 커밋한 변경(200)이 보인다.
만약 격리 수준이 REPEATABLE READ였다면, T1은 첫 일관된 읽기 시점에 만들어진 Read View를 트랜잭션 종료까지 재사용하므로 두 번째 SELECT에서도 여전히 100이 반환된다.

실습 환경에서 직접 확인해 보려면 콘솔 두 개를 열고, 위 순서대로 실행한 뒤 격리 수준만 바꿔서 같은 시나리오를 반복하면 된다.

```sql
-- 현재 세션의 격리 수준 확인
SELECT @@transaction_isolation;
```

### 장기 트랜잭션이 위험한 이유

MVCC 구조에서 한 가지 반드시 알아야 할 점이 있다.
COMMIT 직후에 undo 레코드가 바로 삭제되지 않는다는 것이다.

아직 그 버전을 참조하는 Read View가 남아 있으면 InnoDB는 해당 undo 레코드를 삭제(purge)할 수 없다.
장기 트랜잭션이 하나라도 열려 있으면 그 시점 이후의 모든 undo 레코드가 쌓이게 되고, 이는 다음과 같은 연쇄 문제를 일으킨다.

1. undo 테이블스페이스 공간 증가
2. purge 작업 지연(purge lag)
3. 레코드를 읽을 때 undo 체인을 길게 따라가야 하므로 조회 성능 저하

운영 환경에서 "특별히 느린 쿼리가 없는데 전체적으로 느려지는" 현상이 나타나면, 장기 트랜잭션이 원인인 경우가 적지 않다.
아래 쿼리로 오래 열려 있는 트랜잭션을 확인할 수 있다.

```sql
SELECT trx_id, trx_state, trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS running_sec,
       trx_rows_locked, trx_rows_modified
FROM information_schema.innodb_trx
ORDER BY trx_started;
```

## 데드락 감지와 대응

앞서 외래 키 잠금 전파에서 데드락 가능성을 언급했다.
InnoDB는 이 문제를 자동으로 처리하기 위해 wait-for graph 기반의 데드락 감지 메커니즘을 내장하고 있다.

동작 방식은 다음과 같다.

1. 트랜잭션이 잠금을 대기하면, InnoDB는 "누가 누구를 기다리는지"를 그래프로 추적한다.
2. 이 그래프에서 순환(cycle)이 감지되면 교착 상태로 판단한다.
3. 순환에 포함된 트랜잭션 중 롤백 비용이 상대적으로 작은 쪽을 희생자(victim)로 선택해 롤백한다.
4. 희생자 트랜잭션은 `ERROR 1213 (40001): Deadlock found` 에러를 받는다.

<img src="/images/mysql/innodb-deadlock-detection.svg" alt="InnoDB 데드락 감지와 wait-for graph" style="display:block; width:100%; max-width:980px; height:auto; margin:1rem auto;" />

데드락 관련 상태를 점검할 때는 아래 쿼리를 사용한다.

```sql
-- 데드락 감지 활성화 여부
SHOW VARIABLES LIKE 'innodb_deadlock_detect';

-- 잠금 대기 타임아웃 (초)
SHOW VARIABLES LIKE 'innodb_lock_wait_timeout';

-- 가장 최근 데드락 정보 포함
SHOW ENGINE INNODB STATUS;
```

### 데드락 감지를 끄는 경우

`innodb_deadlock_detect=OFF`로 감지를 비활성화하는 선택지도 존재한다.
이 설정은 감지 자체의 오버헤드를 줄이기 위한 것인데, 매우 특수한 환경(동일 행에 수백 개 트랜잭션이 동시 접근하는 극단적 핫스팟)에서만 검토 대상이다.

감지를 끄면 교착 상태가 즉시 해소되지 않고, `innodb_lock_wait_timeout`에 도달할 때까지 대기하게 된다.
그래서 이 설정을 끌 때는 반드시 timeout 값을 충분히 낮추고, 애플리케이션에서 재시도 정책을 함께 구현해야 한다.
둘 중 하나라도 빠지면 장시간 잠금 대기로 서비스가 멈출 수 있다.

## 장애 복구: innodb_force_recovery

`innodb_force_recovery`는 정상 운영을 위한 성능 옵션이 아니다.
디스크 손상이나 비정상 종료로 InnoDB가 기동되지 않을 때, 데이터 덤프 가능성을 높이기 위한 비상 복구 옵션이다.

값을 올릴수록 더 많은 내부 검증을 건너뛰며, 그만큼 데이터 정합성에 대한 보장도 줄어든다.
그래서 실무에서 장애가 발생했을 때 대응 우선순위는 다음과 같다.

1. 최신 백업 + binlog 기반 복구 경로를 먼저 확인한다.
2. 복구 테스트 환경에서 덤프 가능 범위를 검증한다.
3. 정상 경로가 없을 때만 force recovery를 단계적으로 적용한다.

핵심은 force recovery를 오래 유지하는 것이 아니라, RPO(Recovery Point Objective)/RTO(Recovery Time Objective) 기준으로 안전한 복구 경로를 확보하는 것이다.
평소에 백업 + binlog 복구 체계가 정상 동작하는지 주기적으로 검증하는 것이 장애 대응의 본질이다.

## 마무리

이번 글에서는 InnoDB 스토리지 엔진의 핵심 동작을 클러스터링, 외래 키, MVCC, 데드락, 복구 관점으로 정리했다.

1. InnoDB는 PK 클러스터링으로 저장 구조와 조회 경로를 동시에 결정한다.
2. 세컨더리 인덱스는 물리 주소가 아니라 PK를 저장하므로, PK 설계가 전체 인덱스 비용에 영향을 준다.
3. 외래 키 검증은 부모 테이블까지 잠금을 전파하므로, 고동시성 구간에서는 잠금 범위를 인지하고 설계해야 한다.
4. MVCC는 최신 버전과 undo 버전을 함께 관리해 락 대기 없이 일관된 읽기를 제공한다.
5. 장기 트랜잭션은 purge 지연을 통해 전체 성능을 끌어내리는 원인이 된다.
6. 데드락 감지는 기본적으로 유지하되, 감지를 끌 때는 timeout/재시도 정책까지 한 세트로 설계해야 한다.
7. 장애 대응의 본질은 force recovery가 아니라 백업 + binlog 복구 체계다.

다음 글에서는 InnoDB 버퍼 풀(Buffer Pool), redo/undo, doublewrite buffer를 하나의 쓰기/복구 경로로 연결해 정리할 예정이다.
