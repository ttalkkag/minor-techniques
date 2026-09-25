# 락온과 Navi 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 출발점

[Z 타게팅 영상](https://www.youtube.com/shorts/OjbUm_hnYFU)의 00:24 대상 선정, 00:36 대상 중심 이동, 00:54 요정 표시를 기존 분석에서 식별했다. 수집 ID는 `z-targeting`이다. 2026-09-25 기존 자막·대표 화면 분석을 재검토했으며 전체 영상 재검토는 아니다. 제목의 ‘세계 최초 에임핵’은 기술 명칭이나 역사적 결론으로 쓰지 않는다.

## 1차 자료의 의미

[Nintendo Iwata Asks, Where the Name Navi Came From](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/4-Where-the-Name-Navi-Came-From/4-Where-the-Name-Navi-Came-From-231748.html)을 2026-09-26 다시 열람했다. Koizumi가 타깃 표식을 요정으로 만들고 Osawa가 이름을 붙인 대목은 선택 정보를 캐릭터 표현으로 발전시킨 직접 회고다. 후반의 Kokiri Forest 대화는 동시에 많은 인물을 표시하기 어려워 요정을 먼저, 인물을 접근 후 표시한 별도의 사례다.

이 인터뷰는 표시 제약이 표현 설계로 연결된 근거이지만 정확한 표시 거리·폴리곤 수·성능 절감량을 제공하지 않는다. 요정의 존재 표시와 잠긴 대상 표시를 하나의 상태로 합치거나 N64에서 인물 렌더링 자체가 불가능했다는 뜻으로 확장하지 않는다.

[Cinemachine 3.1 Target Group](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineTargetGroup.html)의 Properties 및 그룹 구성 설명을 2026-09-26 다시 열람했다. 해당 3.1 문서의 표시 버전은 3.1.7이다. Weight·Radius로 여러 대상의 구도를 구성할 수 있다는 근거다. 적 선택 점수·대상 유지·전환 입력의 근거는 아니므로 분석에서 자체 상태 설계로 분리했다.

## 채택과 보류

대상 선택, 이동 기준, 구도, 마커를 함께 조율하는 원리는 채택한다. 거리만의 선정 공식, 특정 유예 시간, 모든 게임에 적합한 자동 전환은 확정하지 않는다. 실제 원작 알고리즘을 주장하려면 개발 코드나 개발자 설명이 더 필요하다. 자체 실험에서는 대상 ID와 전환 이유를 공개해 마커와 움직임의 불일치를 관찰할 수 있다. 그 관찰을 원작 알고리즘의 확인과 혼동하지 않는다.
