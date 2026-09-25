# 보상 설계와 종료 조건이 만드는 행동 — 리서치

[그룹 요약](../README.md) · [상세 분석](analysis.md)

검토 기준일: 2026-09-26. 영상 시각은 기존에 확인한 설명 구간이며, 대표 화면과 관련 자막 발췌를 근거로 삼는다. 아래 기술 자료는 2026-09-26 새로 검색하고 본문을 다시 확인했다. 원영상 전체 재생, 학습 코드 실행, 성공률·성능 측정은 하지 않았다.

## 원자료와 근거 위치

### `mario-reinforcement-learning`

[강화학습으로 슈퍼마리오 클리어하는 방법;;](https://www.youtube.com/watch?v=HEdstNPvpf8)

- 근거 위치: [00:20](https://www.youtube.com/watch?v=HEdstNPvpf8&t=20s): 1,000회 학습 후 플레이. / [01:00](https://www.youtube.com/watch?v=HEdstNPvpf8&t=60s): 7,000회 학습 표시. / [02:00](https://www.youtube.com/watch?v=HEdstNPvpf8&t=120s): 상태·입력→다음 상태·보상 관계. / [02:40](https://www.youtube.com/watch?v=HEdstNPvpf8&t=160s): 보상과 할인된 다음 가치의 식. / [03:20](https://www.youtube.com/watch?v=HEdstNPvpf8&t=200s): 다른 스테이지 학습 예시.
- 2026-09-23 판정: `qualified` — 보상·부분 관측 원리는 타당하다. Double DQN은 선택·평가 분리이며 두 네트워크만으로 정의하지 않았다. 학습 코드·횟수·성공률은 미재현이다.

## 기술 자료의 근거와 채택

| 출처·열람 | 확인한 대목 | 판단 |
| --- | --- | --- |
| [Double DQN 원 논문 본문](https://arxiv.org/html/1509.06461v3), 2026-09-26 재열람 | `Double Q-learning`의 식 (4)와 `Double DQN` 절의 온라인 행동 선택·타깃 가치 평가 식 | '네트워크 두 개'라는 설명을 채택하지 않고 행동 선택과 가치 평가를 분리한다. Atari 결과는 영상의 마리오 성공률을 검증하지 않는다. |
| [Gymnasium Handling Time Limits](https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/), 2026-09-26 재열람 | 1.3.0 호환 표기가 있는 문서의 `Termination`, `Truncation`, `Importance in learning code`: 유한 시간 과제의 남은 시간 관측과 외부 중단의 부트스트래핑 | 타임아웃 종류에 따른 타깃 계산을 채택한다. 모든 시간 제한에서 같은 처리를 하지는 않는다. |
| [PyTorch 마리오 튜토리얼](https://docs.pytorch.org/tutorials/intermediate/mario_rl_tutorial.html), 2026-09-26 재열람 | 프레임 전처리와 `td_target`의 온라인 argmax·타깃 평가 구현 | Double DQN의 선택·평가 분리를 대조했다. 튜토리얼의 패키지 조합을 실행하거나 영상의 학습 결과를 재현하지 않았다. |
| [Ng·Harada·Russell의 보상 변환 논문](https://people.eecs.berkeley.edu/~russell/papers/icml99-shaping.pdf), 2026-09-26 열람 | 1999년 논문의 Theorem 1, 식 (2): 할인율을 포함한 잠재함수 기반 추가 보상 | 단순 위치 차분이 할인된 과제에서 정책을 보존한다고 일반화하지 않는다. 분석의 두 이동 왕복 계산은 자체 반례다. |

## 영상 주장과 교정

원영상 설명의 02:03 챕터가 Double DQN을 명시한다. 자동 자막에서 명칭이 분명히 잡히지 않는다고 다른 알고리즘으로 바꾸지 않는다. 02:40 화면의 단순한 최댓값 식은 개요로 해석하고, 실제 업데이트 구현의 일치 여부는 미확인으로 남긴다.

00:20·01:00의 학습 횟수 표시는 제작자의 실행 보고다. 에피소드 수와 환경 스텝 수를 같은 단위로 바꾸거나, 보여준 클리어 한 번을 전체 평가 성공률로 쓰지 않는다. 03:20의 다른 스테이지 예시는 미학습 일반화와 그 맵을 다시 학습한 결과를 구분해야 한다.

## 남은 리서치 질문

- 원 학습 코드의 종료 플래그와 온라인/타깃 네트워크 사용이 논문 식에 맞는가?
- 영상의 학습 횟수는 에피소드, 업데이트, 환경 스텝 중 무엇을 세는가?
- 미학습 맵과 여러 시드에서 보상 수정이 클리어율을 높이는가, 다른 편법을 만드는가?
