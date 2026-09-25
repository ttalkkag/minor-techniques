# 시야와 그릴 대상 줄이기

카메라에 무엇이 보이는지, 무엇을 그릴지, 캐릭터가 무엇을 발견하는지는 다른 문제다. 수집 자료 5개를 원인과 결과에 따라 6개 이슈로 정리했다. README는 개요이며 계산 과정과 근거 판단은 각 상세 문서에서 읽는다.

## 이슈 요약

| 이슈 | 원인과 해결 방향 | 상세 문서 |
| --- | --- | --- |
| 평면 나무가 눕거나 상공에서 회전한다 | 화면 평행·시점 지향·축 고정 기준을 분리하고 영벡터를 처리 | [분석](billboard-orientation/analysis.md) · [리서치](billboard-orientation/research.md) |
| 풀밭에서 드로콜을 줄여도 느리다 | 제출·기하·픽셀·그림자 비용에 맞춰 컬링·LOD·인스턴싱 선택 | [분석](vegetation-cost/analysis.md) · [리서치](vegetation-cost/research.md) |
| 자유 시점에서 배경이 사라진다 | 레일 카메라용 사전 목록의 범위와 변경 조건 확인 | [분석](precomputed-visibility/analysis.md) · [리서치](precomputed-visibility/research.md) |
| 벽 뒤 표적까지 발견한다 | 거리·정규화한 시야각·차폐·기억 상태를 분리 | [분석](field-of-view/analysis.md) · [리서치](field-of-view/research.md) |
| 광선은 통과하지만 캐릭터가 낀다 | 표면 발견 뒤 도착 공간과 이동 경로를 형상으로 검사 | [분석](shape-clearance/analysis.md) · [리서치](shape-clearance/research.md) |
| 고전 3D를 모두 같은 레이캐스터로 설명한다 | 교육용 격자 투영과 Doom의 BSP 순회를 구분 | [분석](grid-rendering/analysis.md) · [리서치](grid-rendering/research.md) |

## 원자료 대응

| 수집 ID | 연결한 이슈 | 유지한 판단 |
| --- | --- | --- |
| `billboards` | 빌보드 정렬 | 엔진의 앞면 축과 자체 수식의 축을 동일시하지 않음 |
| `grass-rendering` | 잔디 비용 | 주 카메라 밖 물체도 다른 패스에 필요할 수 있음 |
| `crash-visibility` | 가시성 사전 계산 | 개발자 회고이며 원작 코드·실기 성능은 미확인 |
| `raycasting` | 시야·형상 여유·격자 렌더링 | 하나의 영상이라도 출력과 원인이 달라 분리 |
| `dot-product-vision` | 시야; [법선 조명](../rendering-materials/normal-mapping/analysis.md) | 내적은 각도·방향 단계이며 완전한 감각·조명 모델은 아님 |

레이캐스팅과 내적의 시야 설명은 같은 판단 과정으로 통합했다. 표면 탐색·고전 렌더링은 같은 광선을 쓰더라도 다른 문제이므로 독립 문서로 두었다. 빌보드와 잔디의 공통 픽셀 중첩 비용은 잔디 분석에서 함께 다룬다.

## 관련 주제

- [재질과 화면 표현](../rendering-materials/README.md): 합성·법선·반사·밀도로 만드는 화면.
- [좌표와 깊이 정밀도](../rendering-precision/README.md): 가시성 누락과 다른 좌표·깊이 오류.
