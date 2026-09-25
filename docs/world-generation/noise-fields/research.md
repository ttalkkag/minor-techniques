# 지형과 구름의 노이즈 — 리서치

[그룹 요약](../README.md) · [상세 분석](analysis.md) · [리서치](research.md)

## 원자료와 검토 범위

2026-09-22 영상 분석과 2026-09-23 통합 검토를 바탕으로 2026-09-25 상세 문서를 작성했다. 조사 대상 source ID는 `perlin-noise`, `cloud-noise`다. 각 영상의 외부 URL·시점과 채택 근거를 아래에 기록한다. 원영상 전체 재생, 원작 실행, 성능 측정이나 사용자 실험을 새로 수행하지 않았다. 공개 자료의 열람 시점과 범위는 출처별로 구분한다.

## 출처별 확인과 채택

| 출처 | 구체 대목과 근거 | 판정 |
| --- | --- | --- |
| [펄린 노이즈 영상](https://www.youtube.com/shorts/kY9TYQYxCZM) | 기존 자막 대조 기록의 00:17–00:28에서 변위 방향과 내적 합 설명이 쟁점이다. | gradient 입문은 채택. 단순 합을 최종 높이로 삼는 설명은 보간식으로 정정한다. |
| [Ken Perlin 참조 구현](https://cs.nyu.edu/~perlin/noise/) | 2026-09-25 상세 작성 시 열람: `noise`의 바닥 함수·모서리 변위, `fade`, 중첩 `lerp`, 고정 permutation을 확인했다. | 2D 교육식의 근거. 원 코드와 같은 seed API가 있다고 확대하지 않는다. |
| [구름 영상](https://www.youtube.com/shorts/UxTa_8XlJfo) | 00:33 최근접점, 00:42 혼합 장면이라는 수집 기록. | F1 입문으로 채택. 전체 Worley 계열과 모든 구름 렌더러의 정의로 쓰지 않는다. |
| [Worley 1996 원논문](https://cedric.cnam.fr/~cubaud/PROCEDURAL/worley.pdf) | 2026-09-25 상세 작성 시 열람: 첫 페이지 Fn 정의, 두 번째 페이지 COMPUTATION에서 이웃 셀 후보와 거리 기준 배제, APPLICATION에서 Fn 조합을 확인했다. | 이웃 셀 누락 반례, F1/F2 구분을 채택. 논문 구현의 점 분포와 임의 데모의 한 셀 한 점 배치를 구분한다. |
| [Horizon Zero Dawn 개발 발표 소개](https://www.guerrilla-games.com/read/the-real-time-volumetric-cloudscapes-of-horizon-zero-dawn) | 2026-09-23 검토 기록: 모델링·애니메이션·조명 분리. 이번 슬라이드 전체 재열람은 하지 않았다. | 밀도와 조명을 분리하는 실제 제작 사례로 유지한다. |
| [FastNoiseLite 문서](https://github.com/Auburn/FastNoiseLite/wiki/Documentation) | 2026-09-23 기록: 여러 노이즈·옥타브·domain warp 설정과 좌표 변형을 확인했다. | 도구 후보. 속도 우위나 기존 월드 호환성을 판정한 자료는 아니다. |

## 해석의 변화

이전 짧은 분석에 있던 ‘매끄러운 패턴’은 미분 성질을 혼동할 여지가 있었다. 상세 분석에서는 Perlin의 fade 보간과 Worley의 최근접점 전환을 따로 설명했다. 수집된 그림의 매끄러운 외형만으로 두 함수의 미분이 같다고 추론하지 않는다.

본문의 네 gradient 수치 예시는 참조 원리에서 직접 계산한 교육 예시다. 영상 프레임의 숫자를 복사한 값이나 원 코드 실행 결과가 아니다. 구름의 조명 방식은 현재 기상 현상을 재현하는 솔버를 검증했다는 뜻이 아니다.

## 남은 조사

- 주기적 특징점 배치와 domain warp를 조합할 때 경계에서 값과 변화율이 실제로 이어지는가.
- [Nubis³ 공식 소개](https://www.guerrilla-games.com/read/nubis-cubed)는 2026-09-23에 복셀 구름·압축 SDF 가속 소개만 확인했다. 발표 전체와 구현을 읽기 전에는 독립 데모의 필수 구성이나 성능 개선량으로 채택하지 않는다.
- 큰 좌표의 부동소수점 정밀도와 화면 해상도에 따른 고주파 패턴 소실은 노이즈 정의 외의 후속 과제다.
