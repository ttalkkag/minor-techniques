# 추적 카메라 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 조사 이력과 원자료

아래 공식 문서와 직접 유도 글은 2026-09-26 검색 후 본문을 다시 대조했다. Cinemachine 3.1 문서의 표시 버전은 3.1.7이다. 영상 타임스탬프는 기존 자막·대표 화면 분석의 위치이며 이번에 전체 영상을 재생한 기록은 아니다.

| 원자료 | 핵심 대목 | 채택한 범위 |
|---|---|---|
| [카메라 구도 영상](https://www.youtube.com/shorts/xNp8De8CEoI) | 00:12 전방 확보, 00:30 반전, 00:42 비밀방 | 목표 생성·전환·구역 제한이라는 서로 다른 문제로 분리 |
| [카메라 수학 영상](https://www.youtube.com/shorts/caPi9d2gP7I) | 00:27 거리의 10%, 00:36 점근 추적, 00:45 데드존 | 반복 감쇠의 직관과 데드존 개념을 채택하되 10%를 공통 상수로 채택하지 않음 |

수집 ID는 `camera-framing`과 `camera-smoothing`이다. 기존 조사는 자막과 대표 화면을 바탕으로 했으며, 위 표의 시점에 해당 해석을 연결했다. 전체 프레임을 검토한 기록은 아니다.

## 출처별 분석

[Unity Cinemachine 3.1 Position Composer](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachinePositionComposer.html)의 Properties와 Shot composition을 대조했다. 오프셋, 예측 시간, 축별 감쇠, 데드존은 별도 항목이다. 예측 잡음과 smoothing의 지연 교환도 설명한다. 따라서 ‘앞을 보여 준다’를 모두 속도 예측이라고 부르지 않는다. 문서는 특정 Mario 카메라의 코드나 전환 임계값을 제공하지 않는다.

[Rory Driscoll, Frame Rate Independent Damping using Lerp](https://www.rorydriscoll.com/2016/03/07/frame-rate-independent-damping-using-lerp/)의 What Are We Trying To Do? → What About B? → Exponential Decay는 일정 시간 뒤 남을 오차에서 식을 유도한다. 분석의 FPS별 수치는 이 반복식을 직접 계산한 예다. 물리 틱으로 옮기는 것만으로 화면 샘플링의 떨림이 해결되지는 않는다는 설명도 포함된다.

[Confiner 2D](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineConfiner2D.html) 서두와 Oversize Windows는 화면 가장자리까지 포함한 제한과 방보다 큰 화면의 문제를 뒷받침한다. 도형점·비균일 스케일 변경은 경계 캐시, 렌즈 크기 변경은 렌즈 캐시 갱신 대상으로 구분된다. 분석의 구간 축소 식은 직사각형·직교 화면으로 제한한 자체 기하 유도다.

## 정정과 남은 질문

고정 α의 문제를 ‘높은 FPS에서 성능이 좋아진다’로 설명하지 않는다. 추적 속도가 달라진 것이다. 감쇠·데드존·히스테리시스는 각각 추적 속도·무반응 영역·전환 안정성을 다룬다.

원작의 임계값, 움직이는 목표에서 최적 감쇠값, 화면 비율별 편안함은 미확인이다. 이를 채우려면 원작 코드·제작진 설명 또는 조건을 고정한 자체 입력 재생과 사용자 관찰이 필요하다. 이번 자료 열람으로 상용 엔진 실행 결과를 주장하지 않는다.
