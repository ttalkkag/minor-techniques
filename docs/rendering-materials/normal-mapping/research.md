# 노멀맵과 2D 제작 파이프라인 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 열람 범위

수집 ID `normal-mapping`의 방향 표현과 `dot-product-vision`의 조명 설명을 통합했다. 2026-09-22 대표 화면 분석, 2026-09-23 통합 검토에 이어 2026-09-25 아래 영상 자막 구간과 공개 본문을 대조했다. 원영상 전체 재생과 원작 셰이더 실행은 수행하지 않았다.

## 자료별 주장 대조

| 자료·위치 | 지지 내용 | 한계 |
| --- | --- | --- |
| [노멀맵 영상](https://www.youtube.com/shorts/i6Mu34lCSb0), 자막 00:04–00:11, 00:14–00:27 | 동일 법선 평면의 단순화와 픽셀별 방향 | 노멀맵 없는 모든 2D가 동일 밝기라는 일반화는 교정 |
| 같은 영상, 00:29–00:35 | Dead Cells의 3D→2D 사례 | 전체 파이프라인 실행 근거는 아님 |
| [Unity 6.1 Normal Maps](https://docs.unity3d.com/6000.1/Documentation/Manual/StandardShaderMaterialParameterNormalMap.html), 도입부·Colors in a normal map·비스듬한 관찰 설명 | Y+ 규약, RGB 방향, 실제 기하가 유지되는 한계 | 2026-09-25 재확인. 모든 압축 포맷의 원시 RGB 디코더로 일반화하지 않음 |
| [Thomas Vasseur, 2018-01-25](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-), `What: A 3D workflow...`, PNG·normal map 출력 단락 | 프레임 PNG와 법선 출력, 툰 셰이더 사용 | 2026-09-25 제작자 본문 재열람. 현행 전체 자산의 실사는 아님 |
| [PBRT 3판 §8.3](https://www.pbr-book.org/3ed-2018/Reflection_Models/Lambertian_Reflection), `LambertianReflection::f` | BRDF의 반사율/π | 2026-09-25 재확인. 코사인 항과 BRDF 구분 |

## 채택과 보완

원자료의 RGB·정규화·접선 기저·실루엣 설명을 유지하고, 방향 복원 수치 예와 프레임/뒤집기 오류의 연결을 추가했다. [내적 영상](https://www.youtube.com/shorts/tfShkMZ49NU) 00:47–01:03의 조명 설명은 코사인 시각화로 한정한다. 값이 커진다는 사실만으로 광원 감쇠나 재질 전체를 설명하지 않는다.

기존에 검토한 Unity 6000.7 URP Secondary Texture 절차는 베타 문서에 기반한 후보였다. 이번에는 버전 설치나 비용을 확인하지 않았으므로 도입 지침으로 복사하지 않았다. 선택한 정식 프로젝트의 렌더링 경로에서 다시 확인해야 한다.

## 남은 질문과 자료 사용

특정 압축 포맷의 디코딩·좌우 반전 처리·광원 수와 레이어 비용은 구현 대상으로 정한 뒤 확인한다. 기존 대표 화면 분석은 전체 영상 검증이 아니다. 제작기의 그림·Dead Cells 스프라이트는 복제하지 않았고 자체 표면·법선 도식을 사용할 수 있다.
