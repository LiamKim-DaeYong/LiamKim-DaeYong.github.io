---
title: "[스프링 핵심원리-기본편] 6. 예제 만들기 - 회원 도메인 설계"
search: true
categories: [스프링, 스프링 핵심 원리-기본편]
tags: [Srping]
toc: true
---



해당 글은 김영한님의 [스프링 핵심 원리 -기본편](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81-%ED%95%B5%EC%8B%AC-%EC%9B%90%EB%A6%AC-%EA%B8%B0%EB%B3%B8%ED%8E%B8/dashboard) 강의를 수강하며 학습한 내용을 정리한 포스팅입니다.



## 회원 도메인 설계

[이전 게시물]({{site.url}}/posts/spring-basics-05)에서 비즈니스 요구사항에 대해 설명하였다. 이제 요구사항을 통해 구체적인 설계를 진행해 보자.



### 회원 도메인 요구사항

- `회원가입`과 `조회` 기능

- 회원은 `일반회원`과 `VIP` 두 가지 등급으로 나뉜다.

- 회원 데이터는 자체 DB를 구축할 수 있고, 외부 시스템과 연동할 수 있다. **(미확정)**



  #### 회원 도메인 협력 관계
![]({{site.url}}/assets/img/post/spring/basics/06/img01.PNG)




  #### 회원 클래스 다이어그램
  ![]({{site.url}}/assets/img/post/spring/basics/06/img02.PNG)



  #### 회원 객체 다이어그램램
  ![]({{site.url}}/assets/img/post/spring/basics/06/img03.PNG)

> 회원 서비스: memberServiceImpl



<br>

- 어떤 DB를 사용할지 구체적으로 정해져 있지 않은 상황이다.
- 결정될 때 까지 개발을 미룰 수 없기 때문에 우선 회원 저장소를 추상화하고 구현체로 메모리 회원 저장소를 만들려고 한다. (자바코드로 메모리에 회원 정보를 저장, 개발과정에서만 사용)
- 이후 DB가 결정되면 구현클래스를 새로 만들어 변경할 계획이다.

