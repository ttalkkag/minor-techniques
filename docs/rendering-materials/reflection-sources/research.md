# 평면 반사·큐브맵·SSR 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 열람 이력

수집 ID `mirror-rendering`의 세 반사 방식을 비교한다. 2026-09-22 대표 장면 기록과 2026-09-23 통합 판정을 바탕으로 2026-09-25 아래 공식 반사 문서를 재열람했다. 원영상 전체 재생과 엔진 실행은 수행하지 않았다.

## 출처별 근거

| 자료·구체 위치 | 뒷받침하는 설명 | 이번 상태 |
| --- | --- | --- |
| [원영상](https://www.youtube.com/shorts/OCLRh6VDupM), 기존 장면 기록 00:09·00:30·00:54 | 복제 비유, 큐브맵, SSR의 화면 밖 누락 | 저장된 대표 장면 분석 열람 |
| [Epic Planar Reflection](https://dev.epicgames.com/documentation/en-us/unreal-engine/planar-reflections-in-unreal-engine), 도입부·Screen Space Reflections VS Planar Reflections | 반사 방향의 재렌더와 SSR의 화면 밖 정보 부족 | 2026-09-25 본문 대조 |
| [Unity 6.0 GL.invertCulling](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/GL-invertCulling.html), Description·예제 | 반사 카메라에서 앞뒤 면 컬링 방향 반전과 이전 상태 복구 | 2026-09-25 정합성 검토에서 본문 확인 |
| [Unity 6.0 Troubleshooting reflections](https://docs.unity3d.com/6000.0/Documentation/Manual/AdvancedRefProbe.html), Box projection | 무한 거리 큐브맵 가정과 근사 상자의 시차 보정 | 2026-09-25 본문 대조 |
| [Epic Lumen Technical Details](https://dev.epicgames.com/documentation/unreal-engine/lumen-technical-details-in-unreal-engine), Screen Tracing | 화면 추적 뒤 다른 장면 표현을 사용하는 구성 | 2026-09-25 관련 절 대조. 렌더러 설치·실행은 없음 |

## 교정과 선택 이유

원자료의 “도플갱어”를 실제 오브젝트 복제 필수라는 뜻으로 옮기지 않았다. “요즘 사용하지 않음”은 사용 통계가 없고 공식 엔진 기능 설명으로도 빈도를 판단할 수 없어 제외했다. 각 방식이 얻는 정보와 누락을 비교하는 원자료 의도를 분석의 중심으로 삼았다.

반사 위치·방향 식과 수치 예는 이번 자체 기하 설명이다. 소스 구현의 정확한 클리핑 행렬·부호 규약·중첩 거울 정책은 분석에서 확정하지 않는다. Lumen은 세 방식 외의 혼합 구성 사례를 보여 주는 자료이며 브라우저 구현의 기본 의존성으로 제안한 것이 아니다.

## 아직 남은 조사

반사 수·해상도·변형 기하·장면 갱신에 따른 비용, 큐브맵 혼합 경계, SSR 보완 전환의 품질은 실제 장면에서 확인해야 한다. 특정 게임의 사용 빈도·현행 내부 렌더러·보편적 성능 우위는 미확인이다. 기존 영상 판단은 대표 화면 분석 범위다. 원영상이나 공식 문서의 비교 이미지는 복제하지 않았다.
