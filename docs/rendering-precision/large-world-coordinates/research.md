# 큰 월드 좌표 리서치

[상세 분석](analysis.md) · [그룹 요약](../README.md)

## 자료와 열람 범위

수집 ID는 `floating-origin`이다. 아래 공식 문서·개발 기록을 대상으로 카메라 상대 렌더링, 원점 이동, 고정밀도 계산의 차이와 반올림 지점을 조사했다. 영상 분석이 아닌 웹 문헌 조사 항목이다.

2026-09-25에 아래 공식 자료를 대조하고 `Math.fround` 예제를 계산했다. 엔진 실행·GPU 경로·네트워크 원점 이동은 검증하지 않았다. `stable` 문서는 바뀔 수 있으므로 아래 절은 이번 열람 기준이다.

## 출처별 근거

| 출처와 정확한 위치 | 뒷받침하는 주장 | 채택 범위 |
| --- | --- | --- |
| [Godot, Large world coordinates](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html), `Why use large world coordinates?` | 크기에 따른 표현 간격 증가와 위치·물리 오류 | 범위와 정밀도를 구분하는 근거 |
| 같은 문서 `How large world coordinates work`, `Limitations` | 고정밀도 비용, origin shifting의 로직 부담, 일부 셰이더·파티클 제한 | 기능명 하나로 모든 경로가 해결된다고 판단하지 않음 |
| [Unity HDRP 17.0.4, Camera-relative rendering](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Camera-Relative-Rendering.html), `How Camera-relative rendering works` | 다른 기하 변환 이전의 카메라 위치 빼기와 행렬 조정 | 렌더링 구조로 한정; 물리 좌표 이동의 근거로 쓰지 않음 |
| [Clay John / Godot, Emulating Double Precision on the GPU](https://godotengine.org/article/emulating-double-precision-gpu-render-large-worlds/), 2022-10-17, `The Solution`, `The Real Solution` | GPU 전달 시 축소 문제와 이동 성분 분리 | 당시 채택 설계로 사용; 현재 모든 GPU/셰이더의 배정밀도 보장으로 확대하지 않음 |
| [ECMAScript, Math.fround](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.fround), §21.3.2.17 단계 4~6 | binary32의 roundTiesToEven 변환 후 Number 반환 | 선택한 저장 지점의 수치 모델로 사용 |

현재 Godot 문서와 2022년 글은 역할이 다르다. 개발 글은 채택 과정의 증거이고, 기능 제한을 판단할 때는 함께 읽은 공식 문서의 해당 절을 따른다. 그 글의 특정 장치 사례를 현재 장치 호환성 조사로 재사용하지 않았다.

## 대응 방식의 구분과 자체 모델

`floating origin / camera-relative / 고정밀도`는 바꾸는 대상이 다르다. `O+L` 보존식과 수치 예제는 카메라만 움직이는 경우와 시뮬레이션 상태를 함께 바꾸는 경우의 차이를 설명한다.

`Math.fround(2²⁰+0.03)-Math.fround(2²⁰)=0`과 먼저 차이를 구하는 예제는 2026-09-25의 언어 수준 계산이다. 임의의 저장 지점에 반올림을 넣었으므로 실제 셰이더의 모든 중간 결과를 검증한 것은 아니다. 이미 같은 값으로 반올림한 두 큰 값에서는 차이를 복구할 수 없다.

## 미확인 질문

- 구현에서 위치 자료가 처음 단정밀도로 변하는 지점은 어디인가?
- 원점 변경 때 물리·카메라·궤적·이전 프레임 데이터가 같은 기준으로 갱신되는가?
- 렌더링만 안정화한 모드에서도 물리 오차가 남는 장면을 분리할 수 있는가?
- 월드 좌표 셰이더와 파티클을 포함할 때 어떤 경로가 추가 보정 대상인가?
- 필요한 허용 오차를 유지하는 비용은 대상 브라우저에서 얼마인가?
