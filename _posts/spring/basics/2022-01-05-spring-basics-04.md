---
title: "[스프링 핵심원리-기본편] 4. 예제 만들기 - 프로젝트 생성"
search: true
categories: [스프링, 스프링 핵심 원리-기본편]
tags: [Srping]
toc: true
---



해당 글은 김영한님의 [스프링 핵심 원리 -기본편](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81-%ED%95%B5%EC%8B%AC-%EC%9B%90%EB%A6%AC-%EA%B8%B0%EB%B3%B8%ED%8E%B8/dashboard) 강의를 수강하며 학습한 내용을 정리한 포스팅입니다.



## 프로젝트 생성

이제 예제를 통해 **역할**과 **구현**을 나누어 개발을 진행 해보려 한다.



### 사전 준비물

- Java 11 설치

- IDE: `IntelliJ` 또는 `Eclipse` 설치

  (본 포스팅은 Intellij 유료버전을 사용하여 작성 되었습니다.)



### 스프링 부트 스타터 사이트를 통해 프로젝트 생성

[https://start.spring.io](https://start.spring.io)



- 프로젝트 선택
  - Project: Gradle Project
  - Spring Boot: 2.6.2 (작성일 기준 2022-01-05)
  - Language: Java
  - Packaging: Jar
  - Java: 11
- Project Metadata
  - groupId: hello
  - artifactId: core
- Dependencies: 선택하지 않는다.


![]({{site.url}}/assets/img/post/spring/basics/04/project.PNG)



## 프로젝트 실행

스프링부트 스타터 사이트에서 다운받은 프로젝트를 Open하여 실행시켜본다.

![]({{site.url}}/assets/img/post/spring/basics/04/buildAndRun.png)

위의 사진처럼 Spring 로고가 출력되었다면 성공적으로 프로젝트 생성이 완료된 것이다.
