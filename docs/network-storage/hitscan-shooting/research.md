# 히트스캔 사격 리서치

[분석](analysis.md) · [그룹 요약](../README.md)

## 조사 범위와 시간

2026-09-22 원자료 수집·보완, 09-23 통합 검토 기록을 바탕으로 09-25 문서와 관련 자동 자막을 재독하고 Godot 공식 본문을 다시 열람했다. 영상 전체를 다시 재생하거나 게임을 실행하지 않았다. 시각 근거는 과거 대표 화면 검토 범위이며 이번 전체 프레임 검토 결과가 아니다.

수집 ID는 `hitscan-shooting`이다. 아래 공개 영상의 시점별 설명을 카메라·총구의 기하학적 차이에 사용하고, 광선 질의의 구성 요소는 Godot 공식 문서와 구분해 대조한다.

## 영상에서 가져온 논점

| 출처 위치 | 담긴 설명 | 문서에서 채택한 범위 |
|---|---|---|
| [영상 00:24](https://www.youtube.com/watch?v=kucqGt8Q2a8&t=24s) | 총구와 카메라 조준선의 시차 | 두 출발점의 기하학적 차이 |
| [00:42](https://www.youtube.com/watch?v=kucqGt8Q2a8&t=42s) | 눈은 보이지만 총구는 벽에 가려진 경우 | 총구 경로 검사 필요성을 보이는 장면 |
| [01:00](https://www.youtube.com/watch?v=kucqGt8Q2a8&t=60s) | 벽에 막힌 총구에서 공격 실패 처리 | 목표 선정과 장애물 검사 분리 |

자막의 00:48 이후 상대가 대응할 수 없다는 표현은 엄폐 구성·피격 범위·서버 규칙을 생략한 설명이다. 카메라 판정이면 모든 게임에서 일방 공격이 가능하다고 일반화하지 않는다. 초반에 언급한 게임 이름도 해당 게임 모든 무기의 판정 구현을 확인한 증거로 쓰지 않았다.

## 공식 자료와 해석

[Godot Ray-casting](https://docs.godotengine.org/en/stable/tutorials/physics/ray-casting.html)의 `Raycast query`, `Collision exceptions`, `Collision Mask`, `3D ray casting from screen` 절을 09-25 열람했다. 월드 좌표의 선분 질의, 결과의 충돌 위치, 자기 제외와 마스크를 확인했다. 물리 공간이 잠길 수 있으므로 질의 시점도 구분한다.

이 자료는 카메라 광선을 만드는 구성 요소를 뒷받침한다. 총구로 한 번 더 검사하는 절차, 사거리 기준, 내부 출발점에서의 발사 허용 여부는 분석 문서에서 제안한 무기 규칙이다. 공식 예제를 실제 게임의 사격 코드로 치환하지 않는다.

2026-09-26에는 같은 튜토리얼과 [PhysicsRayQueryParameters3D](https://docs.godotengine.org/en/stable/classes/class_physicsrayqueryparameters3d.html#class-physicsrayqueryparameters3d-property-hit-from-inside)를 대조했다. `hit_from_inside`의 기본값 false, 내부 충돌 시 영벡터 법선, 오목 다각형·높이맵 제외를 확인했다. 이는 해당 Godot API의 규약이며 다른 엔진에 그대로 적용하지 않는다.

[Riot 히트 등록 설명](https://playvalorant.com/en-gb/news/dev/the-state-of-hit-registration/)은 이번에 [지연 보상 조사](../lag-compensation/research.md)에서 재열람했다. 판정 권한·시점의 근거이며 카메라/총구 절충의 직접 구현 증거로 쓰지 않는다.

## 판정과 남은 조사

기존 `valid` 판정을 유지한다. 추가 상세화는 수학적 경로 연결과 누락하기 쉬운 경계 조건이다. 예제 높이 1.7/1.2/1.4m는 원본 측정값이 아니다.

실제 구현을 정할 때는 엔진의 광선 내부 시작점 규약, 발사 시점의 총구 좌표, 무기별 관통·사거리 정의를 확인해야 한다. 공개 API 설명만으로 원작의 마스크와 허용각을 알아낼 수 없으며, 이번에는 그런 값들을 추정하지 않았다.
