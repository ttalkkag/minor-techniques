# 색상 블렌딩 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 질문과 열람 이력

수집 ID `color-blending`의 단순 알파 가중식과 가산 효과의 가독성을 구분했다. 2026-09-22 대표 화면 분석, 2026-09-23 통합 검토에 이어 2026-09-25 아래 공개 합성식과 GPU 상태 문서를 재열람했다. 원영상 전체 재생과 렌더러 실행은 수행하지 않았다.

## 근거와 위치

| 자료·위치 | 지지하는 주장 | 이번 확인 |
| --- | --- | --- |
| [원영상](https://www.youtube.com/shorts/Of9pFtvVBJQ), 기존 장면 기록 00:21·00:48·01:00 | 가산/반투명 차이, 곱셈, 알파 가중식 | 저장된 장면 분석을 읽음 |
| [W3C Compositing and Blending Level 1](https://www.w3.org/TR/compositing-1/), §5.1·§9.1.4 | 양쪽 알파를 포함한 source-over와 출력 색 복원 | 2026-09-25 본문 대조. 조회 문서는 2024-03-21 Candidate Recommendation Draft |
| [Unity 6.0 Blend](https://docs.unity3d.com/6000.0/Documentation/Manual/SL-Blend.html), Syntax·blend factors | RGB와 알파 인자 구분, SrcAlpha/One/OneMinusSrcAlpha 의미 | 2026-09-25 관련 본문 대조 |

## 원자료 교정과 상세화

단순 알파 가중식이 “불투명 배경 위 straight RGB”에 해당한다는 조건을 유지하고 양쪽이 반투명인 자체 수치 예를 더했다. 단순 `A+B`, `A×B`는 비음수 또는 0~1 입력 범위에 한정한다. 가산을 실제 빛·노출·톤 매핑 전체로, 곱셈을 실제 차폐로 설명하지 않는다.

RGB 인자와 출력 알파 인자를 별도로 맞추고, 목적지 버퍼의 RGB도 premultiplied 값이어야 한다는 전제를 명시했다. W3C §5.1의 `co=cs+cb(1−αs)`와 Unity의 인자 적용식에 따르면, straight 배경을 그대로 목적지에 둔 상태에서 `OneMinusSrcAlpha`만 곱하면 배경 알파를 누락한다. 2026-09-25 정합성 검토에서 두 원문을 다시 대조해 이 전제와 중간 버퍼의 표현 유지 조건을 보완했다. 특정 게임의 셰이더를 확인한 결과는 아니다.

## 남은 조사와 판단 경계

어느 자산의 가장자리 색이 잘못됐는지, 브라우저 기본 framebuffer와 중간 texture의 알파 표현이 어떻게 연결되는지는 구현에서 확인해야 한다. 선형/sRGB와 HDR/LDR의 비교는 아직 실행하지 않았다. 기존 대표 화면 분석은 렌더 결과 검증이 아니다. 비교 그림은 자체 색 블록으로 만들 수 있어 원영상 이미지 복제가 필요하지 않다.
