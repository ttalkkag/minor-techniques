# 잔디 최적화 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 질문과 열람 기록

수집 ID `grass-rendering`을 통해 생략·재사용 단계에 따라 병목이 달라지는지 조사했다. 아래 00:18·00:30·00:54 장면은 2026-09-22 대표 화면 분석에 대응한다. 2026-09-23 통합 판정을 바탕으로 2026-09-25 공식 최적화 지침과 GPU Gems 본문을 열람했다. 2026-09-26에는 두 자료와 Unity 6.0의 변형 bounds API를 다시 검색·대조했다. 원영상 전체를 다시 재생하거나 성능을 측정한 기록은 아니다.

## 자료별 비교

| 자료·구체 위치 | 채택한 설명 | 적용하지 않은 결론 |
| --- | --- | --- |
| [원영상](https://www.youtube.com/shorts/BtBXRm1noIg), 00:18 컬링·00:30 LOD·00:54–01:00 인스턴싱 | 서로 다른 단계의 작업을 줄이는 도식 | 특정 출시 게임의 구현·성능 수치 |
| [Unity GPU 최적화](https://unity.com/how-to/gpu-optimization), `Optimize fill rate and reduce overdraw`, `Reduce the batch count`, `Pay attention to culling` | 픽셀 중첩·제출·카메라별 가시성 분리 | 드로콜 수만으로 전체 성능 확정 |
| [GPU Gems Chapter 7](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-7-rendering-countless-blades-waving-grass), §7.3.2, §7.4.1–7.4.4 | 교차 카드와 군집·정점·풀 단위 바람 변형의 차이 | 당시 GPU 결과를 현대 브라우저에 그대로 적용 |
| [Unity Renderer.localBounds 6.0](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Renderer-localBounds.html), Description | 정점 변형 셰이더에서 기본 bounds가 부정확하면 사용자 bounds로 보완 | bounds의 기하 포함 조건을 모든 LOD 선택의 의무 조건과 동일시하지 않음 |

공식 지침·GPU Gems·bounds API의 관련 본문은 2026-09-26 직접 열람했다. GPU Gems는 영상 설명란에 있었으나 원자료에서 현재 내용까지 검증한 링크는 아니었다. 이번에는 상단 정점 변형과 변형 단위별 차이를 분석에 반영했다.

## 교정과 통합 판단

- “보이지 않으면 그리지 않음”은 해당 카메라·패스의 판정이다. 그림자·반사에 필요한 대상을 전역 제거하는 규칙으로 확장하지 않았다.
- “먼 풀은 이미지 평면”이라는 설명은 한 LOD 선택으로 한정했다. 화면 점유율과 알파 비용에 따라 다른 선택이 가능하다.
- 바람 bounds, 팝핑, Terrain/일반 메시/별도 인스턴싱의 차이를 구현 전 확인 조건으로 유지했다.
- 기존 GPU Resident Drawer·GPU occlusion culling 언급은 엔진별 경로 후보로 남긴다. 이 문서에서는 해당 버전·Terrain 호환성·채택 우위를 다시 확인하지 않았으므로 기본 해결책으로 확정하지 않는다.
- 대표 화면 분석을 성능 검증이나 전편 수동 검토로 읽지 않는다.

## 남은 질문

어느 단계가 실제 병목인지, 카드 빈 영역 축소와 LOD 중 무엇이 먼저 효과가 있는지, 그림자 포함 bounds가 얼마나 커지는지는 자체 장면에서 측정해야 한다. 영상이나 책의 그림을 복제하지 않고 자체 풀·카드 도식으로 설명한다.
