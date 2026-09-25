# 이동·점프·충돌 판정

캐릭터가 어떻게 움직이는지, 어느 입력을 받아들이는지, 어디서 부딪혔다고 판단하는지는 서로 다른 규칙이다. 영상 6개와 추가 웹 조사 1개를 6개 이슈로 정리했다.

충돌 누락에는 속도·벽 두께·물리 갱신 간격을 조절하는 실험 명세가 있다. 각 문서는 계산 예와 조작 조건으로 원리와 모델의 한계를 설명한다.

## 문제별 문서

| 이슈 | 원인과 해결의 핵심 | 문서 |
| --- | --- | --- |
| 점프 궤적·조작감 | 물리 시간과 표시 시간을 분리하고, 운동 모델과 적분 오차를 비교한다. | [분석](jump-physics/analysis.md) · [리서치](jump-physics/research.md) |
| 접지 유예·입력 버퍼 | 마지막 접지와 마지막 입력의 시간 창을 별도로 기록하고 한 번만 소비한다. | [분석](input-grace/analysis.md) · [리서치](input-grace/research.md) |
| 코너·발판 보정 | 빈 공간 탐색, 벽 점프 거리, 과거 발판 속도 사용을 구분한다. | [분석](corner-correction/analysis.md) · [리서치](corner-correction/research.md) |
| 전투 판정 | 이동·공격·피격 도형과 활성 시간을 분리하고 공격별 중복 피해를 막는다. | [분석](hitboxes/analysis.md) · [리서치](hitboxes/research.md) |
| 발 IK | 몸의 이동과 발 자세를 분리하고 도달 범위·관절 한계·무릎 방향을 처리한다. | [분석](inverse-kinematics/analysis.md) · [리서치](inverse-kinematics/research.md) |
| 고속 충돌 누락 | 스텝의 끝점만 확인할 때 놓치는 접촉을 경로 검사로 찾는다. | [분석](collision-tunneling/analysis.md) · [리서치](collision-tunneling/research.md) · [실험](collision-tunneling/experiment.md) |

## 연결해서 읽기

점프의 수치 적분은 이동 결과를 만들고, 접지 유예는 점프를 승인할 때 작동한다. 코너 보정은 허용한 공간 이동이며, 고속 충돌 검사는 이동 도중의 접촉을 찾는다. 같은 조작 실패라도 이 층을 구분하면 바꿀 값이 명확해진다.

전투 판정의 재실행·통신 지연은 [네트워크와 저장](../network-storage/README.md), 시점 움직임은 [카메라와 레벨 설계](../camera-level-design/README.md), 관절·곡선 표현은 [애니메이션과 효과](../animation-effects/README.md)와 연결된다.

## 검토한 공개 영상과 범위

| 자료 | 통합 위치 | 유지한 한계 |
| --- | --- | --- |
| [점프 물리](https://www.youtube.com/shorts/dluLPk0zjIs) | 점프 궤적 | 운동 모델과 적분 오차를 구분 |
| [마리오 조작감](https://www.youtube.com/shorts/dNsyscOrNMY) | 점프 궤적 | 작품별 상수·역사적 최초 주장은 미확인 |
| [코요테 타임](https://www.youtube.com/shorts/0gkwRtolL4Y) | 입력 유예 | 허용 시간은 게임별 정책 |
| [코너 보정](https://www.youtube.com/shorts/hjVLIojpwVk) | 코너·발판 보정 | 공간 보정·발판 속도 유예를 분리 |
| [피격 판정](https://www.youtube.com/shorts/hUpx8lUaiDU) | 전투 판정 | 시각 효과와 피해 규칙을 분리 |
| [역운동학](https://www.youtube.com/shorts/0rjhNtdmgVI) | 발 IK | IK만으로 완전한 보행을 구현하지 않음 |
| Unity CCD 공식 웹 조사 | 고속 충돌 | 엔진 예시이며 특정 출시 게임 버그의 실측이 아님 |

수집 ID: `jump-physics`, `coyote-time`, `corner-correction`, `mario-controls`, `hitboxes`, `inverse-kinematics`, `collision-tunneling`.
