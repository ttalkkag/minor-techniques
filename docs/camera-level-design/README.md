# 카메라·시야·레벨 설계

카메라가 보여 주는 범위와 캐릭터가 이동할 수 있는 범위를 나누어 다룬다. 전방 확보·감쇠·경계는 추적 카메라로, 랜드마크·우회·체감 크기는 동선 설계로 통합했다. 기차 장비는 제한된 시점에서 기존 기능을 재사용한 역사 사례다.

## 이슈별 문서

| 이슈 | 원인·증상 | 상세 분석 | 근거 조사 |
|---|---|---|---|
| 추적·감쇠·구역 경계 | 전방 공간, 작은 입력의 화면 흔들림, 비밀방 조기 노출 | [분석](camera-follow/analysis.md) | [리서치](camera-follow/research.md) |
| 좁은 문과 카메라 | 이동 캡슐 막힘과 카메라 가림 | [분석](door-clearance/analysis.md) | [리서치](door-clearance/research.md) |
| 락온과 표시 | 대상 선택·이동 방향·마커의 불일치 | [분석](target-lock/analysis.md) | [리서치](target-lock/research.md) |
| 동선과 체감 규모 | 경로 연결은 있지만 길을 모르거나 이동만 길어짐 | [분석](navigation-scale/analysis.md) | [리서치](navigation-scale/research.md) |
| 단계적 튜토리얼 | 실패 이유를 배우기 어렵고 이동 규칙과 배치가 어긋남 | [분석](staged-learning/analysis.md) | [리서치](staged-learning/research.md) |
| 기차 장비 | 제한된 탑승 장면을 기존 표현으로 구성 | [분석](train-armor/analysis.md) | [리서치](train-armor/research.md) |

## 핵심 정리

카메라 오프셋·속도 예측·감쇠·데드존은 서로 다른 규칙이다. 구역 밖 노출을 막으려면 카메라 중심뿐 아니라 화면 전체를 포함해 경계를 정해야 하며, 문 통과는 이동 충돌과 시야 가림을 따로 다룬다. 락온에서는 선택 상태·입력 좌표계·구도·표시가 같은 대상을 가리켜야 한다.

랜드마크·합류점·안전한 연습은 행동 기회를 설계한다. 실제 면적·이동거리·체감 규모는 다른 값이며 설계 의도가 모든 사용자의 행동을 보장하지 않는다. 기차 장비는 외부 조사자가 GECK에서 플레이어의 팔 장비로 확인했다고 보고한 사례이고 엔진의 절대적 차량 구현 불가능성이나 성능 향상은 미확인이다.

## 수집 자료와 통합 위치

| 수집 ID | 상세 위치 |
|---|---|
| `camera-framing` | [추적·감쇠·구역 경계](camera-follow/research.md) |
| `camera-smoothing` | [추적·감쇠·구역 경계](camera-follow/research.md) |
| `door-level-design` | [좁은 문과 카메라](door-clearance/research.md) |
| `z-targeting` | [락온과 표시](target-lock/research.md) |
| `level-guidance` | [동선과 체감 규모](navigation-scale/research.md) |
| `world-scale-illusion` | [동선과 체감 규모](navigation-scale/research.md) |
| `mario-level-design` | [단계적 튜토리얼](staged-learning/research.md) |
| `train-armor` | [기차 장비](train-armor/research.md) |

출처의 근거와 원작 실행·사용자 평가 여부는 각 리서치에 구분했다.
