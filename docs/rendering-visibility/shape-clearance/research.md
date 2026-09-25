# 천장 탐색과 공간 여유 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 질문과 조사 범위

수집 ID `raycasting`에서 광선이 천장을 찾았다는 설명을 캐릭터 전체의 이동 허가로 사용할 수 있는지 조사했다. 2026-09-22 대표 화면 분석, 2026-09-23 통합 검토에 이어 2026-09-25 아래 영상 자막 구간과 공개 API를 대조했다. 2026-09-26에는 Unity 6.0의 겹침·광선·캡슐 이동 질의 문서를 다시 검색하고 본문을 대조했다. 영상 전체 재생·Nintendo 코드 역공학은 수행하지 않았다.

## 근거 대조

| 자료와 위치 | 자료에서 확인한 내용 | 분석에 반영한 경계 |
| --- | --- | --- |
| [원영상](https://www.youtube.com/shorts/PRwkpITfW-s), 자막 00:46–01:04 | 위쪽 광선·천장 교차점·기울기를 이용한다는 설명 | 실제 출시 게임 내부 구현을 입증하는 자료로 쓰지 않음 |
| [Unity Physics.CheckCapsule 6.0](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.CheckCapsule.html), Parameters·Description | 끝 구의 중심 두 개와 반지름으로 캡슐 부피 겹침 검사 | 2026-09-26 재확인. 선 검사와 부피 검사를 구분 |
| [Unity Physics.Raycast 6.0](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.Raycast.html), Notes | 광선 시작점 내부 콜라이더 미검출 | 2026-09-26 재확인. 미검출과 빈 공간을 동일시하지 않음 |
| [Unity Physics.CapsuleCast 6.0](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.CapsuleCast.html), Description·Notes | 형상을 경로를 따라 이동시키는 질의와 초기 겹침 미검출, 반지름 0의 정의되지 않은 결과 | 2026-09-26 확인. 겹침 검사와 sweep을 구분하고 초기 상태를 별도로 확인 |

## 원자료의 교정·추가 해석

법선·두께·출구 공간을 각각 확인하는 결정 과정으로 설명을 확장했다. 반지름 0.4m, 출구 0.6m의 반례와 캡슐 중심 계산은 이 문서의 자체 도출이다. 접지면의 허용 접촉과 도착 공간을 다루는 정책도 원작 사양이 아니다.

레이캐스팅을 같은 연산으로 사용해도 [시야](../field-of-view/analysis.md)는 표적까지의 차폐가 결과이고 이 이슈는 캐릭터 배치 가능성이 결과다. 그래서 한 문서에 두 문제의 해결법을 섞지 않았다.

## 확보하지 못한 사항

영상 설명에 연결된 특허 기사만으로 게임의 출시 코드와 정책을 확정하지 않는다. 실제 캐릭터 형상, 최대 천장 두께, 출구 후보 탐색 순서, 움직이는 장애물 처리와 접촉 여유값은 미확인이다. 대표 화면 분석과 문서 대조는 구현 검증을 뜻하지 않는다. 실험 그림은 자체 캡슐·벽 도식으로 준비할 수 있다.
