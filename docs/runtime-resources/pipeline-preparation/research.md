# 셰이더·PSO 준비 자료와 판정

[상세 분석](analysis.md) · [그룹 요약](../README.md)

2026-09-23 기존 판정은 `qualified`다. 2026-09-25 원자료를 읽고 Epic 개발팀 글·공식 문서·Khronos 사양을 다시 열람했다. 현재 웹 문서의 버전 표시는 기존 검토의 버전이나 출시 게임의 현재 상태를 뜻하지 않는다.

아래 2026-09-25 웹 열람은 작성 단계의 기록이다. 이어진 교차검토에서는 사전 요청 누락의 시각 표현과 정상 완료를 전제한 대기 시간식의 범위를 교정했으며, 공개 본문을 다시 열람한 기록으로 세지 않는다.

## 조사 대상과 범위

수집 ID `shader-stutter`는 2026-09-22 웹 조사에서 시작했다. Fortnite의 조합 수집 사례, 준비 중 표시 정책, WebGL 확장의 적용 범위를 조사했고 실제 엔진·브라우저 실행은 하지 않았다. 아래 표는 그 주장을 개발팀 글·공식 문서·확장 사양의 어느 부분과 대조했는지 나타낸다.

## 출처별 주장 추적

| 자료 | 확인 위치 | 사용하는 근거 | 사용하지 않는 추론 |
| --- | --- | --- | --- |
| [Epic PSO 개발팀 기술 글](https://www.unrealengine.com/tech-blog/game-engines-and-shader-stuttering-unreal-engines-solution-to-the-problem), 2025-02-04 | PSO 정의, 조합 수 설명, Fortnite와 precaching 중반부, `Mobile platforms and consoles` | GPU·드라이버별 준비와 조합 수집의 어려움; 콘솔의 사전 실행 코드 배포 경로 구별 | 2026년 Fortnite 빌드가 같은 수치로 동작한다는 주장 |
| [PSO Precaching](https://dev.epicgames.com/documentation/en-us/unreal-engine/pso-precaching-for-unreal-engine) | `Component PSO Precaching`, `Proxy Creation Delay Strategy` | 로드 시 후보 요청과 준비 중 화면 정책 | 모든 컴포넌트가 동일한 대체 표시를 지원한다는 주장 |
| 같은 공식 문서 | `Manage System Resources` → `Memory`, `Compilation Thread Pool` | 준비의 메모리·동시 작업 비용 | 스레드 수만 늘리면 항상 빨라진다는 주장 |
| 같은 공식 문서 | `Validation and Tracking`의 통계 표, `Collect Information on PSO Precaching` | `Missed`, `Too late`, `Untracked`의 구별 | 프레임 그래프의 모든 봉우리가 PSO 지연이라는 주장 |
| [KHR_parallel_shader_compile](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/) | `Overview`의 비차단 조회, `Sample Code`의 완료 확인 뒤 `LINK_STATUS` 검사 | 완료 확인과 성공 판단의 분리 | WebGL 프로그램을 PSO라고 부르거나 총 준비 시간 감소 보장 |

Epic precaching 문서는 이번 열람에서 UE 5.8로 표시됐다. 이 문서는 API 값의 최신 권장 설정집이 아니라 원리 추적 자료다. 프로젝트에 실제 적용할 때는 해당 UE 버전의 지원 컴포넌트·RHI·설정을 다시 맞춰야 한다.

## 기존 메모에서 채택한 판단

원자료는 ‘첫 사용’과 ‘재방문’을 비교하면서도 캐시 초기화 여부를 확인하지 못하면 최초 실행으로 단정하지 말라고 했다. 이를 유지한다. 드라이버 캐시·파일 캐시·이미 로드된 자원 가운데 무엇이 영향을 줬는지 분리되지 않은 비교로 컴파일 원인을 확정할 수 없다.

누락/늦음 구분에 더해, 상세 문서에는 요청과 실제 작업 시작 사이의 대기열을 넣었다. `40ms 준비 + 20ms 대기 = 60ms 완료`는 자체 일정 예시다. Epic의 측정 결과를 재사용한 수치가 아니다. 준비 실패는 누락·지연과 다른 상태로 남겨 둔다. 사용 가능한 완료 시각이 없는 실패에 정상 완료를 전제한 대기 시간식을 적용하지 않는다.

Khronos 사양은 컨텍스트가 손실됐을 때 완료 조회가 참을 반환하도록 규정한다. 따라서 완료만 보고 성공 표시를 하는 설계는 적절하지 않다. 이 조건은 실제 구현 시 성공 확인·컨텍스트 상태 처리에 반영할 사항이지, 현재 웹 데모에서 재현한 결과가 아니다.

## 미확인 질문

- 대상 브라우저와 GPU에서 확장이 제공되며 완료 조회가 어떤 순서로 끝나는가?
- 같은 조합이라도 캐시를 남긴 실행과 확인 가능한 범위에서 초기화한 실행의 준비 단계가 어떻게 달라지는가?
- 표시 지연·기본 재질·초기 대기 가운데 실험의 시각적 비교에 가장 이해하기 쉬운 정책은 무엇인가?
- CPU 작업 대기, 자원 업로드, JavaScript 작업이 함께 발생했을 때 준비 지연을 분리해서 기록할 수 있는가?

기존 후속 과제를 문서의 결론과 분리했다. 브라우저 실측이나 Fortnite·Unreal 실행 결과는 추가하지 않았다.
