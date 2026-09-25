# 월드 생성과 길찾기

큰 세계를 필요한 만큼 만들고, 무작위 결과를 실제로 이동할 수 있는 공간으로 바꾸는 기법을 정리한다. 노이즈는 모양을 만들고, 청크는 작업 범위를 나누며, 그래프와 이동 규칙은 도달 가능성을 판정한다.

계산 과정·구체 예시·대안·실패 조건은 `analysis.md`, 공개 출처의 대목과 적용 한계는 `research.md`에서 읽는다.

## 이슈 목록

| 이슈 | 원인과 해결 방향 | 문서 |
| --- | --- | --- |
| 지형과 구름의 노이즈 | 독립 난수와 내적 단순 합은 원하는 연속성을 만들지 못한다. gradient 보간, 최근접점 거리, 밀도와 조명을 구분한다. | [분석](noise-fields/analysis.md) · [리서치](noise-fields/research.md) |
| 수평 변위를 사용하는 파도 | 높이만 움직이면 봉우리 제어가 제한되고 수평 변위가 과하면 접힌다. 좌표 미분과 변형 법선을 함께 계산한다. | [분석](gerstner-waves/analysis.md) · [리서치](gerstner-waves/research.md) |
| 청크 생성과 변경 사항 보존 | 언로드를 저장 삭제로 다루면 사용자 변경이 사라진다. 기본 지형·수정 기록·생성 버전과 저장 완료 상태를 분리한다. | [분석](chunk-persistence/analysis.md) · [리서치](chunk-persistence/research.md) |
| 복셀 데이터에서 표면 메시 만들기 | 셀마다 큐브를 만들면 내부 면이 낭비되고 밀도만으로 표면 추출은 완성되지 않는다. 노출 면·병합·Dual Contouring의 입력과 비용을 나눈다. | [분석](voxel-meshing/analysis.md) · [리서치](voxel-meshing/research.md) |
| 던전 생성과 실제 도달 가능성 | 방 연결만 검사하면 열쇠·점프 조건을 놓친다. 진행 그래프, 방 템플릿, 내부 미로와 게임 상태 탐색을 분리한다. | [분석](dungeon-connectivity/analysis.md) · [리서치](dungeon-connectivity/research.md) |
| 최단 경로와 다수 유닛 이동 | 휴리스틱 조건을 놓치면 최단 경로가 깨지고 공유 방향장만으로 혼잡은 해결되지 않는다. 재개방·가중 비용·국소 회피를 구분한다. | [분석](pathfinding/analysis.md) · [리서치](pathfinding/research.md) |

## 유지한 주요 판정

- 펄린 노이즈 영상의 내적 단순 합은 fade·lerp 보간으로 정정한다. 변위 방향은 모서리→샘플로 일치시킨다.
- Worley의 F1은 최근접 거리이며 모든 파생 함수를 대표하지 않는다. 형태 노이즈와 볼륨 조명은 다른 단계다.
- Minecraft의 언로드와 저장 삭제를 구분한다. 버전별 공식 변경 기록은 역사 근거이며 영상의 단순 순서를 전체 생성 명세로 삼지 않는다.
- 부드러운 밀도 윤곽만으로 Dual Contouring을 특정하지 않는다. Bananza의 실제 구현과 후속 SDF 연구의 성능 우위는 미확정이다.
- Rogue 보존 코드의 방 내부 DFS와 전체 던전의 추가 통로를 구분한다. Dead Cells의 공개 당시 설계와 Switch 이식 후 변경도 분리한다.
- A*의 최적성은 휴리스틱과 구현 조건에 달려 있다. StarCraft 반복 클릭 일화는 독립 근거·재현을 확보하지 못했다.

## 원자료 대응

| 수집 ID | 통합 이슈 |
| --- | --- |
| `perlin-noise` | [지형과 구름의 노이즈](noise-fields/research.md) |
| `cloud-noise` | [지형과 구름의 노이즈](noise-fields/research.md) |
| `gerstner-waves` | [수평 변위를 사용하는 파도](gerstner-waves/research.md) |
| `minecraft-world-generation` | [청크 생성과 변경 사항 보존](chunk-persistence/research.md), [형태 계산](noise-fields/analysis.md) |
| `voxel-rendering` | [복셀 데이터에서 표면 메시 만들기](voxel-meshing/research.md) |
| `dungeon-generation` | [던전 생성과 실제 도달 가능성](dungeon-connectivity/research.md) |
| `roguelike-map-generation` | [던전 생성과 실제 도달 가능성](dungeon-connectivity/research.md) |
| `pathfinding` | [최단 경로와 다수 유닛 이동](pathfinding/research.md) |

각 리서치 문서는 영상·화면 대조 기록과 공개 원문 열람의 시점·범위를 구분한다. 교육용 계산과 설계 대안은 원작의 내부 구현이나 성능을 검증한 결과와 구별한다.
