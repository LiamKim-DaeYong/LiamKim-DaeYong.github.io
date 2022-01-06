---
title: "[스프링 핵심원리-기본편] 7. 예제 만들기 - 회원 도메인 개발"
search: false
categories: [스프링, 스프링 핵심 원리-기본편]
tags: [Srping]
toc: true
---



해당 글은 김영한님의 [스프링 핵심 원리 -기본편](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81-%ED%95%B5%EC%8B%AC-%EC%9B%90%EB%A6%AC-%EA%B8%B0%EB%B3%B8%ED%8E%B8/dashboard) 강의를 수강하며 학습한 내용을 정리한 포스팅입니다.



## 회원 도메인 개발

비즈니스 요구사항을 바탕으로 개발을 진행해 보자.



1. **member package 생성**

   ![]({{site.url}}/assets/img/post/spring/basics/07/img01.PNG)



2. **회원등급**

   요구사항에서 회원은 `일반회원`과 `VIP` 두가지 등급으로 나뉜다고 하였다. 등급을 표현하기 위해 방금 만든 `member` package 하위에 `Grade` enum을 생성한다.

   ```java
   package hello.core.member;

   public enum Grade {
       BASIC, // 일반회원
       VIP // VIP
   }
   ```



3. **회원 Entity**

   `Member` 클래스를 생성하고 `필드`(아이디, 이름, 등급)와 `생성자`, `Getter`, `Setter`를 추가한다.

   <br>

   intellij에서는 단축키를 통해 쉽게 코드(생성자, Getter, Setter등)를 추가할 수 있다.

   - **windows**: alt + insert
   - **macOs**: command + N

   | ![]({{site.url}}/assets/img/post/spring/basics/07/img02.jpg) | ![]({{site.url}}/assets/img/post/spring/basics/07/img03.jpg) |

   ```java
   package hello.core.member;

   public class Member {
       private Long id;
       private String name;
       private Grade grade;

        public Member(Long id, String name, Grade grade) {
           this.id = id;
           this.name = name;
           this.grade = grade;
       }

       public Long getId() {
           return id;
       }

       public void setId(Long id) {
           this.id = id;
       }

       public String getName() {
           return name;
       }

       public void setName(String name) {
           this.name = name;
       }

       public Grade getGrade() {
           return grade;
       }

       public void setGrade(Grade grade) {
           this.grade = grade;
       }
   }
   ```



4. **회원 저장소**

   `MemberRepository` 인터페이스를 생성하고 `회원저장`과 `회원조회` 기능을 정의한다.

   ```java
   package hello.core.member;

   public interface MemberRepository {

       // 회원저장
       void save(Member member);

       // 회원조회
       Member findById(Long memberId);
   }

   ```



5. **회원 저장소 구현체**

   회원 저장소는 DB가 결정되지 않았고 추후 변경이 될 가능성이 있기 때문에 개발과정에서는 `메모리 회원 저장소`를 사용하기로 하였다.

   `MemberRepository`의 구현체로 `MemoryMemberRepository` 클래스를 생성한다.

   ```java
   package hello.core.member;

   import java.util.HashMap;
   import java.util.Map;

   public class MemoryMemberRepository implements MemberRepository {

       private static Map<Long, Member> store = new HashMap<>();

       @Override
       public void save(Member member) {
           store.put(member.getId(), member);
       }

       @Override
       public Member findById(Long memberId) {
           return store.get(memberId);
       }
   }
   ```



6. **회원 서비스**

   `MemberService` 인터페이스를 생성하고 `회원가입`과 `회원조회` 기능을 정의한다.

   ```java
   package hello.core.member;

   public interface MemberService {

       // 회원가입
       void join(Member member);

       // 회원조회
       Member findMember(Long memberId);
   }

   ```



7. **회원 서비스 구현체**

   `MemberService`의 구현체로 `MemberServiceImpl` 클래스를 생성한다.

   ```java
   package hello.core.member;

   public class MemberServiceImpl implements MemberService {

       private final MemberRepository memberRepository = new MemoryMemberRepository();

       @Override
       public void join(Member member) {
           memberRepository.save(member);
       }

       @Override
       public Member findMember(Long memberId) {
           return memberRepository.findById(memberId);
       }
   }
   ```



## 정리

- `member` pakcage 하위에 총 6개의 파일을 생성하였다.

![]({{site.url}}/assets/img/post/spring/basics/07/img04.PNG)

- 다음 포스팅에서는 생성한 코드가 잘 실행되는지 테스트를 해보겠다.
