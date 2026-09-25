# 점프 모델 리서치

[상세 분석](analysis.md) · [그룹 요약](../README.md)

영상 근거는 2026-09-22의 대표 화면·자막·OCR 분석이다. 2026-09-26에 대조한 공개 자료의 열람 범위는 아래 표에 있다. 원영상 전편과 원작 실행을 새로 검증한 기록은 아니다.

## 원영상에서 가져온 관찰

| 수집 ID·영상 | 기존 분석의 근거 위치 | 해석과 제한 |
| --- | --- | --- |
| `jump-physics` · [점프의 수식](https://www.youtube.com/watch?v=dluLPk0zjIs&t=15s) | 00:15 상승·하강 중력, 00:24 샘플 점, 00:39 갱신식 | 중력 설계와 수치 적분을 분리한다. 00:39의 새 속도를 쓰는 식이 반암시적 Euler 판정의 근거다. |
| `mario-controls` · [마리오 조작감](https://www.youtube.com/watch?v=dNsyscOrNMY&t=6s) | 00:06 가속·감속, 00:21 수직 운동, 00:33 공중 제어 | 조작 요소의 분해에 사용한다. 특정 작품의 내부 상수나 최초 도입 주장의 증거로 쓰지 않는다. |

영상 타임스탬프는 대표 화면·자막 분석에 근거한 위치 안내이며 전체 프레임 정밀 검토를 뜻하지 않는다.

## 공개 자료 대조

| 자료 | 근거 대목·이번 확인 범위 | 채택한 내용 |
| --- | --- | --- |
| [Unity Fixed Updates](https://docs.unity.com/en-us/engine/6000.6/manual/scripting/managing-time-and-frame-rate/fixed-updates) | 09-26 본문 열람, Unity 6000.6: `Fixed updates`, 표시 프레임률이 고정 갱신률보다 높을 때·낮을 때 | 한 표시 프레임의 고정 갱신은 0회·1회·여러 회일 수 있다. 아래 Godot 본문과도 대조했다. |
| [Godot Physics interpolation introduction](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html) | 09-26 stable 본문 열람: `Physics ticks and rendered frames`, `Adapt the tick rate?`, `In the past` | 고정 틱·표시 보간·표시 지연을 구분한다. 더 부드러운 표시가 더 정확한 충돌을 뜻하지 않는다. |
| [Nintendo New Super Mario Bros. 설명서](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_NewSuperMarioBros_EN.pdf) | 09-26 텍스트 열람: PDF 10번째 페이지, 인쇄 21쪽 `Jump and Stomp` | 버튼을 짧게/길게 누르는 조작 차이만 채택한다. 1985년 원작 코드나 중력 변경 방식의 근거가 아니다. |

Godot stable의 [물리 보간 사용 안내](https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/using_physics_interpolation.html)도 09-26에 대조했다. 순간이동 위치를 먼저 설정한 뒤 `reset_physics_interpolation()`을 호출하면 이전 변환이 현재 변환과 같아져 잘못된 이동 잔상을 막는다. 상세 분석의 초기화 절차는 이 불연속 상태 처리 원리와 연결된다.

## 교정과 도출

원자료의 식을 단순히 ‘Euler’라고만 소개하면 위치 갱신에 어떤 속도를 쓰는지 사라진다. 두 순서를 나란히 적고, 첫 스텝 `0.9/1.0/0.8 m` 예제로 차이를 드러냈다. 일정 가속도 오차와 정지 거리 수치는 교육용 수식에서 직접 계산했다. 게임 측정값이나 공식 문서의 수치가 아니다.

영상의 ‘마리오 조작감’과 수식 영상은 같은 운동·시간 문제로 통합했다. 코요테 타임과 입력 버퍼는 점프를 승인하는 조건이므로 [입력 유예](../input-grace/analysis.md)로 분리했다.

## 남은 조사

- 특정 작품을 재현하려면 작품·버전을 먼저 지정하고 공개 코드나 재현 가능한 입력/좌표 기록을 확보한다.
- 보간이 실제 사용자 반응과 착지 성공에 주는 영향은 사용자 실험이 필요하다. 현재 문서로 우위를 확정하지 않는다.
- 점프 비교에서는 해석해 오차와 의도한 비대칭 중력의 효과를 별도 결과로 보여준다.

자료는 링크와 자체 해설로 사용한다. 원영상 캡처를 공개 사이트에 재배포할 이용 조건은 확인하지 않았으며, 이 문서는 캡처를 포함하지 않는다.
