# 파괴 연출과 판정 상태 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 수집 내용

[파괴 연출 영상](https://www.youtube.com/shorts/QSqcR2sLkdo)의 00:09–00:18 모델 교체·사전 애니메이션, 00:30 데칼, 00:45 사전 조각 분리를 기존 기록에서 식별했다. 수집 ID는 `destruction-effects`다. 2026-09-25 기존 자막·대표 화면 분석을 재검토했으며 이번 상용 게임 실행이나 전체 영상 재생은 없다.

## 채택 근거와 새 열람의 범위

[Epic Destruction Quick Start](https://dev.epicgames.com/documentation/en-us/unreal-engine/destruction-quick-start)의 Geometry Collection 생성·파쇄와 4절 shooting을 09-25 열람했다. 미리 만든 조각이 연결 그래프의 strain 조건에 따라 분리되는 예다. 사전 파쇄와 고정 붕괴 애니메이션을 구분하는 직접 근거로 채택했다.

[Destruction Overview, UE 5.6](https://dev.epicgames.com/documentation/en-us/unreal-engine/destruction-overview?application_version=5.6)은 09-23에 사전 파쇄·클러스터·캐시 구성을 확인한 자료다. 09-25에는 소개 문단만 확인했으며 상세 절을 재확인하지 않았다. 연결 그래프 설명의 근거는 위 Quick Start다. 버전을 지정하지 않은 문서 주소는 내용이 바뀔 수 있어 과거 열람으로 현재 모든 기능을 보장하지 않는다.

## 원자료 정정과 분석자의 확장

‘사전 분할이면 붕괴가 매번 같다’는 일반화는 제외한다. 미리 정한 것은 기하일 수 있고 운동은 실시간으로 달라질 수 있다. 반대로 사전 애니메이션을 쓰는 것이 잘못된 선택이라는 결론도 아니다.

메시·충돌·이동 가능 영역의 동기화, 역할별 파편 예산은 영상의 시각 표현 문제에서 확장한 구현 분석이다. Battlefield·Control·Rainbow Six·Donkey Kong Bananza의 전체 파괴 알고리즘을 이 분류 중 하나로 단정하지 않는다. 화면에 연기가 있다는 사실만으로 모델 교체 여부나 물리 계산 유무를 확정할 수도 없다.

## 남은 조사

상용 사례의 구체적 파괴 모델에는 제작진 발표·자산·코드가 추가로 필요하다. 자체 장면에서도 부분 파괴 후 통과, 충돌 교체 시점, 활성 강체 수와 CPU/GPU 시간은 실행해 보지 않았다. 해당 결과 없이 ‘실시간이 더 빠르다’ 또는 ‘사전 파쇄가 항상 저렴하다’고 결론내리지 않는다.
