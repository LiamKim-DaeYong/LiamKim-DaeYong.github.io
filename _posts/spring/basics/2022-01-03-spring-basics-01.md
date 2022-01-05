---
title: "[스프링 핵심원리-기본편] 1. 자바 진영의 추운 겨울과 스프링의 탄생"
search: true
categories: [스프링, 스프링 핵심 원리-기본편]
tags: [Srping]
toc: true
---



해당 글은 김영한님의 [스프링 핵심 원리 -기본편](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81-%ED%95%B5%EC%8B%AC-%EC%9B%90%EB%A6%AC-%EA%B8%B0%EB%B3%B8%ED%8E%B8/dashboard) 강의를 수강하며 학습한 내용을 정리한 포스팅입니다.


## 스프링의 등장 배경

스프링은 2002년 로드존슨이 자신의 저서인 `Expert One-one-One J2EE Design and Development`에 EJB의 문제점을 비판하며 소개한 약 3만줄 가량의 예제 코드로 시작되었다.



## 자바 진영의 추운 겨울 - EJB

스프링 등장 이전 `EJB (Enterprise Java Beans)` 라는 자바 표준 기술이 있었다. EJB는 거대규모 시스템 구축을 위한 컴포넌트 모델 이라고 설명 할 수 있다. (스프링과 같이 서버 애플리케이션 구현을 위한 컨테이너 기술이다.)



EJB의 등장으로 개발자는 비즈니스 로직에 집중 할 수 있는 환경을 갖추게 되었지만 구현할 비즈니스 로직보다 **EJB 컨테이너를 사용하기 위한 상투적인 코드들이 많다는** 불편함 또한 존재 하였다.

이로 인해, 마틴 파울러는 EJB에 반발해 오래된 방식의 **간단한 자바 오브젝트로 돌아가자**는 말을 했고, 이는 `POJO(Plain Old Java Object)`라는 용어의 기원이 되었다.



## 스프링 & Hibernate

이러한 EJB의 단점들을 비판하며 등장한 두명의 프로그래머가 있었다. 바로 `로드존슨(Spring)`과 `개빈 킹(Hibernate)`이다.

<figure class="half">
   <img src="http://image.kyobobook.co.kr/images/book/large/852/l9780764543852.jpg" style="width: 300px; height: 400px">
   <img src="http://image.kyobobook.co.kr/images/book/large/508/l9788992939508.jpg" style="width: 300px; height: 400px">
</figure>


`Hibernate 프레임워크`는 EJB의 ORM 기술인 엔티티빈을 대체할 목적으로 만들었고 Hibernate에 대한 내용은 추후 다른 포스팅에서 자세히 다루겠다.



## 스프링 역사 - 전설의 시작

책 출간 직후 `Juergen Hoeller(유겐 휠러)`, `Yann Caroff(얀 카로프)`가 로드 존슨에게 오픈소스 프로젝트를 제안하였고 현재까지 스프링의 핵심 코드의 상당수는 유겐 휠러가 개발하고 있다.



스프링 이름은 전통적인 J2EE(EJB)라는 겨울을 넘어 새로운 시작이라는(봄) 뜻으로 지어졌다.



#### 릴리즈

* 2003년 스프링 프레임워크 1.0 출시 - XML
* 2006년 스프링 프레임워크 2.0 출시 - XML 편의 기능 지원
* 2009년 스프링 프레임워크 3.0출시 - 자바 코드로 설정
* 2013년 스프링 프레임워크 4.0 출시 - 자바8
* 2014년 스프링 부트 1.0 출시
* 2017년 스프링 프레임워크 5.0, 스프링 부트 2.0 출시 - 리엑티브 프로그래밍 지원
* 2022년 1월 현재 스프링 프레임워크 5.3.14, 스프링 부트 2.6.2



## 스프링이란?

### 스프링 생태계

| <img src="https://spring.io/images/projects/spring-framework-640ad1b04f7efa89e0f0f7353e6b5e02.svg?v=2" width="100" height="100"/> | **스프링 프레임 워크** |

* **핵심기술**: 스프링 DI 컨테이너, AOP, 이벤트, 기타
* **웹 기술**: 스프링 MVC, 스프링 WebFlux
* **데이터 접근 기술**: 트랜잭션, JDBC, ORM지원, XML 지원
* **기술 통합**: 캐시, 이메일, 원격접근, 스케줄링
* **테스트**: 스프링 기반 테스트 지원
* **언어**: 코틀린, 그루비
* 최근에는 스프링 부트를 통해서 스프링 프레임워크의 기술들을 편리하게 사용

​

| <img src="https://spring.io/images/projects/spring-boot-7f2e24fb962501672cc91ccd285ed2ba.svg" width="100" height="100"/> | **스프링 부트** |

* **스프링을 편리하게 사용할 수 있도록 지원, 최근에는 기본으로 사용**
* 단독으로 실행할 수 있는 스프링 애플리케이션을 쉽게 생성
* Tomcat 같은 웹 서버를 내장해서 별도의 웹 서버를 설치하지 않아도 됨
* 손쉬운 빌드 구성을 위한 starter 종속성 제공
* 스프링 3rd parth(외부) 라이브러리 자동 구성
* 메트릭, 상태 확인, 외부 구성 같은 프로덕션 준비 기능 제공
* 관례에 의한 간결한 설정


#### 그외

| <img src="https://spring.io/images/projects/spring-data-79cc203ed8c54191215a60f9e5dc638f.svg" width="50" height="50"/> | **스프링 데이터** |<img src="https://spring.io/images/projects/logo-session-5b3068613a1bee9a50a69f12c6d255f5.png" width="70" height="70"/>|**스프링 세션**|
|<img src="https://spring.io/images/projects/spring-security-b712a4cdb778e72eb28b8c55ec39dbd1.svg" width="50" height="50"/>|**스프링 시큐리티**|<img src="https://spring.io/images/projects/spring-batch-4ed8fe7187bf70afd9c8efa229a4f77c.svg" width="70" height="70"/>|**스프링 배치**|
|<img src="https://spring.io/images/projects/spring-cloud-81fe04ab129ab99da0e7c7115bb09920.svg" width="80" height="80"/>|**스프링 클라우드**|<img src="https://spring.io/images/projects/spring-restdocs-7ba253b6470bc54f9dba54e12eef549b.png" width="80" height="80"/>|**스프링 RestDocs**|


### 스프링의 핵심 개념, 컨셉

- 스프링은 자바 언어 기반의 프레임워크
- 자바 언어의 가장 큰 특징 - **객체 지향 언어**
- 스프링은 객체 지향 언어가 가진 강력한 특징을 살려내는 프레임워크
- 스프링은 **좋은 객체 지향** 애플리케이션을 개발할 수 있게 도와주는 프레임워크