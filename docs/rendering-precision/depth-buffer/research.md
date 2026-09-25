# 깊이 버퍼와 Reversed-Z 리서치

[상세 분석](analysis.md) · [그룹 요약](../README.md)

## 조사 대상과 날짜

수집 ID는 `depth-precision`이다. 아래 NVIDIA·Godot·Khronos 자료를 대상으로 깊이 저장의 분포, 반전 시 호환성 문제, 비교 조건을 조사했다. 영상 분석이 아닌 웹 문헌 조사 항목이다.

2026-09-25에 NVIDIA 글·Godot 글·`EXT_clip_control` 명세를 대조하고 설명용 깊이값을 계산했다. Reversed-Z의 개선 조건은 부동소수점 깊이 형식과 clip 범위를 함께 고려해 한정했다. 브라우저의 실제 깊이 포맷과 GPU 동작은 측정하지 않았다.

## 출처별 검토

| 출처와 절 | 뒷받침하는 주장 | 채택 판단과 범위 |
| --- | --- | --- |
| [Nathan Reed / NVIDIA, Visualizing Depth Precision](https://developer.nvidia.com/blog/visualizing-depth-precision/), 2021-10-21, `Why 1/z` | 저장 깊이는 시선축 거리의 역수에 대한 선형 매핑 | 상세 분석의 출발 관계로 사용 |
| 같은 글 `Graphing depth maps` | near 영향, 부동소수점과 반전, `[0,1]`과 `[-1,1]`의 차이 | 포맷·좌표 범위 조건을 함께 유지 |
| 같은 글 `Effects of roundoff error` | 변환 연산 오차와 저장 양자화는 별개 | 표의 오류율을 본 프로젝트의 실측값으로 옮기지 않음 |
| [Clay John / Godot, Introducing Reverse Z](https://godotengine.org/article/introducing-reverse-z/), 2024-04-29, `Writes to POSITION`, `Writes to DEPTH`, `Reads from depth_texture`, `Operations in clip space` | 깊이 관례 변경 시 직접 값을 쓰거나 비교하는 코드의 수정 범위 | 4.3 도입 당시의 변경 사례로 사용. 현재 모든 렌더러의 상태로 일반화하지 않음 |
| [Khronos, EXT_clip_control](https://registry.khronos.org/webgl/extensions/EXT_clip_control/), revision 2, `IDL / New Functions` | `clipControlEXT`와 두 깊이 모드, 기본값 | WebGL 포팅 시 점검할 조건으로 사용. 장치 지원은 미확인 |
| [Khronos, glDepthFunc 공식 참조 원문](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/glDepthFunc.xml), `Description`의 `GL_GREATER` / `GL_GEQUAL` | 입력 깊이를 현재 버퍼 값과 비교하며, 엄격 비교와 동률 허용은 다름 | 2026-09-26에 동률·초기 깊이값 경계 설명을 대조. 깜빡임이나 성능의 실측 근거가 아님 |

NVIDIA 자료의 근거 범위는 위 본문 절이며, 연결된 수치 실험 코드는 실행하지 않았다. Godot 글의 일반적인 성능 평가도 이 웹 실험의 성능 측정값으로 채택하지 않았다.

## 채택한 해석과 자체 모델

“흑백 깊이 그림 반전”과 “실제 저장·판정 변경”은 다르다. 정수형 깊이를 반전해도 같은 개선이 생기지 않는다는 조건은 독립 3비트 계산 예제로 설명한다. `n=1, f=100`의 식·표와 3비트 양자화는 자체 교육용 설정이며 외부 자료의 실험 조건을 복제한 것이 아니다.

관찰 카메라를 판정용 카메라와 분리하고, 양자화 뒤 같은 값으로 합쳐지는 표본을 비교한다. 미지원 포맷의 설명은 수학 도식으로 제한한다. 명세가 있다고 사용 가능하다고 판단하지 않는 이유는 문헌 확인과 장치 실행이 서로 다른 근거이기 때문이다.

## 미확인 질문

- 실제 배포 대상 브라우저에서 어떤 깊이 포맷과 clip-control 경로를 사용할 수 있는가?
- 동일 장면에서 일반/반전 비교 시, 위치 변환 오차와 저장 양자화를 각각 어떻게 기록할 것인가?
- 깊이 복원 효과와 동률 판정까지 포함하면 모드 전환의 결과가 일관되는가?
- 카메라 거리와 간격을 바꿨을 때 발생하는 실제 오류율·프레임 시간은 얼마인가?
