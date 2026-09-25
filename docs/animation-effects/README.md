# 애니메이션·머리카락·파괴와 상태 반응

움직임의 시간 곡선과 공간 경로를 나누고, 화면 표현과 실제 상태 변화의 관계를 다룬다. 원인·수식·절차는 분석으로, 출처별 해석과 미확인 사항은 리서치로 분리했다.

## 이슈별 문서

| 이슈 | 원인·증상 | 상세 분석 | 근거 조사 |
|---|---|---|---|
| 이징과 시간 | 끝점·구간 연결에서 위치·속도·가속도가 끊김 | [분석](easing/analysis.md) | [리서치](easing/research.md) |
| 곡선 경로와 속력 | 균일 매개변수가 균일 거리가 아님 | [분석](curve-motion/analysis.md) | [리서치](curve-motion/research.md) |
| 머리카락 표현과 물리 | 렌더 가닥·물리 가이드·충돌 품질의 혼동 | [분석](hair-simulation/analysis.md) | [리서치](hair-simulation/research.md) |
| 파괴 상태 동기화 | 파손 메시와 충돌·이동 영역의 불일치 | [분석](destruction-state/analysis.md) | [리서치](destruction-state/research.md) |
| 상태 반응 규칙 | 개별 조합 코드·동시 반응 순서·반복 전파 | [분석](state-reactions/analysis.md) | [리서치](state-reactions/research.md) |

## 핵심 정리

이징의 자연스러움은 목적에 달려 있으며 시간 길이가 속도·가속도에 영향을 준다. 베지에의 매개변수는 CSS 입력 시간이나 이동 거리와 같지 않다. 머리카락은 렌더 가닥과 물리 가이드를, 파괴는 사전 기하와 붕괴 운동을 구분해야 한다.

상태 반응을 공통 규칙으로 묶으면 조합을 설명하기 쉬워지지만 동시 처리·중복 전파와 개별 조율은 남는다. 상용 게임의 특정 상수·자산 개수·전체 알고리즘을 짧은 영상이나 다른 엔진의 문서만으로 확정하지 않는다.

## 수집 자료와 통합 위치

| 수집 ID | 상세 위치 |
|---|---|
| `animation-curves` | [이징과 시간](easing/research.md) |
| `vector-curves` | [곡선 경로와 속력](curve-motion/research.md) |
| `hair-rendering` | [머리카락 표현과 물리](hair-simulation/research.md) |
| `destruction-effects` | [파괴 상태 동기화](destruction-state/research.md) |
| `zelda-physics-engine` | [상태 반응 규칙](state-reactions/research.md) |

출처의 근거와 원작·엔진 실행 여부는 각 리서치에 구분했다.
