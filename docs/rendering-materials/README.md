# 재질과 화면 표현

실제 형상을 늘리지 않아도 색 합성·법선·가상 교차·주변 영상·공간 밀도로 복잡한 장면을 표현할 수 있다. 각 기법이 보존하거나 생략하는 정보가 달라 수집 자료 6개를 6개 이슈로 나눴다. 아래는 개요이며 작동 과정·수치 예·자료 판단은 상세 문서에서 읽는다.

## 이슈 요약

| 이슈 | 원인과 해결 방향 | 상세 문서 |
| --- | --- | --- |
| 투명 경계가 검어지고 밝은 효과가 묻힌다 | 색·알파 표현과 GPU 인자를 맞추고 대비를 별도 판단 | [분석](color-compositing/analysis.md) · [리서치](color-compositing/research.md) |
| 요철처럼 보이지만 옆에서는 평평하다 | 조명 법선·실제 기하·충돌의 차이와 방향 좌표계를 확인 | [분석](normal-mapping/analysis.md) · [리서치](normal-mapping/research.md) |
| 창문 속 방은 보이지만 들어갈 수 없다 | 시선과 가상 경계의 교차를 사용하고 외부 관찰 범위를 명시 | [분석](interior-mapping/analysis.md) · [리서치](interior-mapping/research.md) |
| 거울에서 화면 밖 물체가 사라진다 | 반사 카메라·큐브맵·SSR이 갖는 정보의 범위를 구분 | [분석](reflection-sources/analysis.md) · [리서치](reflection-sources/research.md) |
| 연막의 품질·시점에 따라 표적이 달리 보인다 | 밀도 생성·광선 누적·공유 상태·게임 차폐 규칙을 분리 | [분석](volumetric-smoke/analysis.md) · [리서치](volumetric-smoke/research.md) |
| 병의 액체가 흔들리지만 양과 흐름은 맞지 않는다 | 수면 근사·감쇠·부피 보존의 범위를 따로 정의 | [분석](bottle-liquid/analysis.md) · [리서치](bottle-liquid/research.md) |

## 원자료 대응

| 수집 ID | 연결한 이슈 | 유지한 판단 |
| --- | --- | --- |
| `color-blending` | 색 합성 | 단순 알파 식은 불투명 배경 조건이며 출력 알파를 생략하지 않음 |
| `normal-mapping` | 법선과 조명 | 실제 실루엣·충돌은 바뀌지 않음. Dead Cells는 공개 제작기 범위 |
| `interior-mapping` | 가상 실내 | 가구 평면 확장은 존재하지만 입체 기하 전체를 대체하지 않음 |
| `mirror-rendering` | 반사 정보 | 실제 오브젝트 복제가 필수는 아니며 사용 빈도·보편 성능 우위는 미확인 |
| `smoke-effects` | 볼륨 연막 | 볼륨 표현만으로 유체 계산·네트워크 판정까지 확인되지 않음 |
| `bottle-liquid-shader` | 병 수면 근사 | 공식 패치는 시각 반응·셰이더 수정만 확인하며 자체 모델은 Valve 코드가 아님 |

같은 화면 착시라도 데이터와 실패 조건이 달라 이슈를 합치지 않았다. 내적 조명의 코사인 항과 Lambert BRDF 구분은 [법선 분석](normal-mapping/analysis.md)에 연결하며, 연막의 평면 방향은 [빌보드 분석](../rendering-visibility/billboard-orientation/analysis.md)을 따른다.

## 관련 주제

- [시야와 그릴 대상 줄이기](../rendering-visibility/README.md): 빌보드 정렬·컬링·픽셀 비용.
- [좌표와 깊이 정밀도](../rendering-precision/README.md): 재질 문제처럼 보이는 좌표·깊이 오류.
