# 큰 월드에서 작은 이동이 사라지는 이유

[그룹 요약](../README.md) · [출처와 조사 기록](research.md)

## 범위가 남아 있어도 정밀도는 부족할 수 있다

부동소수점은 큰 값을 저장할 수 있지만 모든 큰 값 사이에 같은 간격으로 작은 수를 넣지는 못한다. 원점에서 멀어진 캐릭터가 조금 이동했는데 저장 결과가 이전 위치와 같으면 작은 이동을 잃는다. 정밀한 기준 위치를 따로 누적해 출력하는 경우에는 여러 이동이 한꺼번에 나타나는 것처럼 보일 수 있다. 반대로 반올림된 상태에 매번 같은 작은 이동을 더하면 계속 같은 위치에 머물 수도 있다. 렌더링뿐 아니라 물리 입력도 이렇게 저장될 수 있다. Godot 공식 문서는 표현 범위와 정밀도, 위치 진동과 물리 오류를 구별한다. [Godot, Why use large world coordinates?](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html#why-use-large-world-coordinates)

처리 경로를 `게임 상태 저장 → 물리 계산 → 카메라 상대 좌표 → GPU 전달 → 화면 변환`으로 적고 각 경계의 자료형을 확인한다. 화면이 안정됐다는 사실만으로 물리 위치도 복원됐다고 판단할 수는 없다.

## 반올림 순서가 결과를 바꾸는 예

JavaScript `Math.fround`는 값을 binary32로 반올림한 뒤 `Number`로 반환한다. 이를 명시한 저장 지점의 모델로 사용한다. [ECMAScript, Math.fround](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.fround)

아래 예는 카메라 위치가 `C=2²⁰`, 물체 위치가 `P=C+0.03`일 때다. 숫자의 단위를 미터로 정하면 두 점의 거리는 약 3cm다.

```js
const C = 2 ** 20;
const P = C + 0.03;
const late = Math.fround(P) - Math.fround(C);
const early = Math.fround(P - C);
```

| 처리 | 2026-09-25 JavaScript 계산 결과 | 의미 |
| --- | --- | --- |
| 큰 두 값을 먼저 단정밀도로 저장한 뒤 뺌 | `late = 0` | 저장하면서 차이를 잃음 |
| 차이를 먼저 계산한 뒤 작은 값을 단정밀도로 저장 | `early ≈ 0.02999999933` | 작은 거리 차이를 유지 |

같은 `fround`라도 어느 시점에 적용했는지가 다르다. 이미 같아진 두 큰 값에서 원점을 빼면 0만 남는다. 카메라 상대 좌표가 효과를 내려면 필요한 차이를 계산할 때까지 정보가 남아 있어야 한다. 이 예는 언어 수준의 저장 반올림 비교이며 GPU의 모든 명령을 흉내 낸 결과는 아니다.

## 세 가지 대응은 바꾸는 대상이 다르다

| 대응 | 처리 | 선택할 조건 |
| --- | --- | --- |
| 카메라 상대 렌더링 | 충분한 정밀도로 `물체 위치 - 카메라 위치`를 만든 뒤 화면용 작은 좌표를 사용 | 게임·물리 상태는 충분히 정확하고 화면 변환에서 문제가 생길 때 |
| 원점 이동 | 전역 위치와 로컬 위치를 분리하고 로컬 시뮬레이션의 원점을 함께 옮김 | 단정밀도 로컬 계산을 유지하되 전역 이동 범위가 클 때 |
| 고정밀도 저장·계산 | 필요한 위치 자료와 연산의 정밀도를 늘림 | 게임 상태·물리 자체에 작은 차이를 계속 보존해야 할 때 |

Unity HDRP 문서는 다른 기하 변환 전에 카메라 위치를 빼고 관련 행렬을 바꾸는 렌더링 구조를 설명한다. 게임 전체의 물리 원점 이동을 보장하는 문서는 아니다. [Unity HDRP 17.0.4, How Camera-relative rendering works](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/Camera-Relative-Rendering.html#how-camera-relative-rendering-works)

## 원점 이동이 보존해야 하는 것

다음 식은 엔진 API가 아니라 같은 전역 위치를 두 표현으로 유지하기 위한 자체 도출이다.

```text
전역 위치 W = 원점 O + 로컬 위치 L
원점을 Δ만큼 옮길 때:
O′ = O + Δ
L′ = L - Δ
그러면 O′ + L′ = O + L = W
```

가령 `O=1,000,000`, `L=250`이고 원점을 200 옮기면 `O′=1,000,200`, `L′=50`이다. 전역 위치는 1,000,250으로 같다. 모든 물체에 같은 이동을 적용하면 로컬 위치 차이도 보존된다. 반대로 캐릭터만 옮기고 충돌체·카메라·궤적·이전 프레임 위치 중 하나를 빼먹으면 그 데이터는 다른 좌표계를 사용하게 된다.

상태를 저장하거나 네트워크로 전달할 때도 원점과 로컬 위치의 기준이 일치해야 한다. 이 좌표계 관리 부담 때문에 원점 이동과 고정밀도를 단순히 같은 옵션의 빠른/느린 버전으로 취급하지 않는다. Godot도 원점 이동이 특히 다중 사용자 로직을 복잡하게 할 수 있음을 설명한다. [Godot, How large world coordinates work](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html#how-large-world-coordinates-work)

## CPU에서 고쳤는데 화면은 그대로인 경우

GPU로 전달하기 전에 큰 위치를 다시 단정밀도로 축소하면 CPU에서 보존한 차이를 잃을 수 있다. Godot의 2022년 설계 기록은 이동 성분을 두 단정밀도 값으로 나눠 처리한 접근을 설명한다. 이를 모든 셰이더 연산에 배정밀도가 제공된다는 뜻으로 읽지 않는다. [Godot, The Solution / The Real Solution](https://godotengine.org/article/emulating-double-precision-gpu-render-large-worlds/)

고정밀도는 비용과 적용 범위도 점검해야 한다. 특히 월드 좌표를 직접 사용하는 셰이더·파티클은 기본 위치 변환과 경로가 다를 수 있다. [Godot, Limitations](https://docs.godotengine.org/en/stable/tutorials/physics/large_world_coordinates.html#limitations)

## 설명을 위한 비교

원점 근처와 먼 곳에 같은 캐릭터 경로를 배치하고 요청 위치·저장 위치·상대 위치·접촉 결과를 따로 보여준다. 원점 이동을 수행할 때는 `O+L`과 물체 간 거리가 유지되는지 확인한다. 일부 물체의 보정을 의도적으로 생략한 경우에는 위치 관계가 어긋나는 이유가 바로 드러난다.

카메라 추적을 부드럽게 하는 문제, 깊이 버퍼에서 앞뒤를 저장하는 문제와는 분리한다. 이 문서는 특정 출시 게임의 오류·엔진별 비용을 재측정하지 않았으며, 실제 월드의 단위·물체 크기·시점에 맞는 허용 오차는 구현 전에 정해야 한다.
