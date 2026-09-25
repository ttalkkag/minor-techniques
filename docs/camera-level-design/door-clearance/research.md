# 문·카메라 통과 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 원자료와 이번 범위

[게임 속 문 크기 영상](https://www.youtube.com/shorts/ncXQqHiFjHQ)의 기존 기록은 00:15 캡슐, 00:21 뒤쪽 카메라, 00:42 가구 비율이다. 수집 ID는 `door-level-design`이다. 2026-09-25 기존 대표 화면 분석을 재검토했으며, 원작 치수 실측이나 전체 영상 재생은 하지 않았다.

## 직접 대조한 자료

[Unity 6.0 Character Controller](https://docs.unity3d.com/6000.0/Documentation/Manual/class-CharacterController.html)의 Properties와 Fine-tuning을 2026-09-26 다시 열람했다. 반지름·높이 외 접촉 허용과 단차 설정을 따로 다루므로 문 폭 하나로 통과 여부를 설명하는 것은 부족하다. 분석의 `W−2r`은 엔진 규칙을 대신하지 않는 단순 기하 예시다.

[Epic USpringArmComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/USpringArmComponent)의 설명과 bDoCollisionTest·ProbeSize·ProbeChannel·TargetArmLength 항목을 2026-09-26 다시 대조했다. 당시 문서의 표시 버전은 Unreal Engine 5.8이다. 장애물이 있을 때 카메라 거리를 줄이는 기능이 캐릭터 이동 충돌과 분리되어 있다. 이것이 영상의 ‘카메라도 통과해야 한다’를 시야 확보 문제로 제한한 근거다.

두 공식 문서는 캐릭터와 카메라의 설정 근거이며 특정 상용 게임의 문 치수를 입증하는 자료는 아니다.

## 판정과 후속 조사

캐릭터 통과·카메라 가림·화면상 비율을 독립 문제로 채택한다. 방과 가구를 모두 같은 배율로 키우거나 FOV만 바꾸면 해결된다는 주장은 채택하지 않는다. 보이는 틈은 통과 가능해야 한다는 일반 설계 목표와 일부러 좁게 만드는 장르의 선택도 구분한다.

원작 치수, 입력 장치별 통과율, 카메라 수축의 편안함은 미확인이다. 후속 조사에서는 엔진 설정을 기록한 실제 장면과 중앙/사선 입력 재생을 확보해야 하며, 문 폭 변경 전후의 FPS 향상을 이 자료로 추정할 수 없다.
