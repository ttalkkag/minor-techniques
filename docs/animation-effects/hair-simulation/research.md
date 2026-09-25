# 헤어 표현과 물리 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 원자료 대조

[머리카락 영상](https://www.youtube.com/shorts/ZiQo1jKDRvY)의 00:15 카드, 00:21 관절, 00:33 스트랜드가 기존 대표 장면이다. 수집 ID는 `hair-rendering`이다. 2026-09-25 기존 대표 화면 분석과 관련 자막을 대조했다. 자막의 00:36 이후 2만 가닥, 00:41 이후 저사양/고사양 구분, 00:52 이후 단발 변경 일화는 각각 별도 주장으로 나눴다. 이를 원작 자산 검사로 취급하지 않는다.

## 확인한 파이프라인

[Epic Groom Scalability and Performance](https://dev.epicgames.com/documentation/en-us/unreal-engine/groom-scalability-and-performance-with-unreal-engine)의 Strands Pipeline·Strands Assets·Interpolation을 09-25 열람했다. 가이드의 시뮬레이션 결과를 렌더 가닥으로 전달하고, 이후 가시성·조명 단계를 거친다. 따라서 렌더 가닥 수와 물리 가이드 수를 같은 비용 지표로 묶지 않는다. 문서는 보이지 않는 Groom도 그림자 때문에 갱신될 수 있음을 설명하므로 카메라 밖이면 비용이 반드시 0이라는 해석도 피한다.

[Epic Enabling Physics Simulation on Grooms](https://dev.epicgames.com/documentation/en-us/unreal-engine/enabling-physics-simulation-on-grooms-in-unreal-engine)의 Collision Constraint·Strand Parameters를 09-25 대조했다. 충돌 제약과 가이드당 입자 수가 시뮬레이션 설정으로 존재한다. 이로써 충돌이 시뮬레이션 밖의 별도 사후 장식이라는 잘못된 순서를 배제했다.

## 수정·보류

카드의 외형 표현과 적은 관절로 변형하는 특정 설정을 구분한다. 스트랜드가 반드시 모든 렌더 가닥을 독립적으로 물리 계산한다는 해석은 채택하지 않는다. 카드/스트랜드 선택과 LOD는 장면·플랫폼·품질 목표에 따른 선택이다.

원영상 설명의 Famitsu·Frostbite·발표 자료 링크는 추가 조사 후보다. PRAGMATA의 특정 가닥 수와 단발 변경 이유는 이번에도 제작진 원자료를 확보하지 못했으므로 사실로 승격하지 않았다. 이번 열람에서 Epic 문서가 UE 5.8로 표시됐지만 이를 모든 엔진·플랫폼의 지원 범위로 확장하지 않는다.

## 남은 연구

동일 자산에서 가이드 수와 렌더 가닥 수를 따로 바꾼 비용·관통·실루엣 자료, 순간이동과 LOD 전환의 안정성 기록이 필요하다. 아직 엔진 실행이나 실제 게임 자산 검사는 없다.
