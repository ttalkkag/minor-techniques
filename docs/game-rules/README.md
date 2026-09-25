# 보상·난이도·무작위성·매칭

플레이어의 선택과 결과를 만드는 규칙을 정리한다. 행동별 자원 흐름, 정보 공개 시점, 확률 분포, 상태 재현과 상대 선택은 서로 다른 설계 문제다. 수식의 성립과 재미·공정성의 체감은 별도 근거로 판단한다.

`analysis.md`는 원인·계산·해결 절차·반례, `research.md`는 공개 출처의 대목과 적용 한계를 담는다.

## 이슈 목록

| 이슈 | 원인과 해결 방향 | 문서 |
| --- | --- | --- |
| 전투 보상과 위험 선택 | 대기가 비용 없이 회복을 주면 공격보다 유리해질 수 있다. 행동별 자원 수지, 회복 가능량·시간 창, 실패 손실을 함께 설계한다. | [분석](combat-risk-reward/analysis.md) · [리서치](combat-risk-reward/research.md) |
| 동적 난이도의 흔들림 | 한 번의 실패에 크게 반응하면 보정이 진동한다. 관측 평균·상하한·변화율·판단 간격과 수동 도움을 분리한다. | [분석](dynamic-difficulty/analysis.md) · [리서치](dynamic-difficulty/research.md) |
| 무작위 정보 공개와 실패 연속 분포 | 공개 시점과 추첨 규칙을 섞으면 결과의 원인을 놓친다. 입력·출력 무작위성과 독립·천장·셔플백·누적 확률을 별도 축으로 비교한다. | [분석](randomness-distributions/analysis.md) · [리서치](randomness-distributions/research.md) |
| 난수의 재현과 체크포인트 | 같은 시드라도 호출 순서와 중간 상태가 다르면 결과가 달라진다. 스트림·상태·규칙 버전·체크포인트를 함께 관리한다. | [분석](deterministic-rng/analysis.md) · [리서치](deterministic-rng/research.md) |
| 실력 점수와 상대 선택 | 점수 하나는 불확실성·대기시간·핑·파티 조건을 모두 표현하지 못한다. 레이팅, 후보 선택, 표시 정책을 분리한다. | [분석](matchmaking/analysis.md) · [리서치](matchmaking/research.md) |
| 규칙 점수로 기술 선택하기 | 사용 불가 기술이나 중복 효과에 선호 점수를 적용하면 잘못된 행동을 고른다. 후보 조건·비용 방향·상황 규칙·동점 추첨을 구분한다. | [분석](rule-based-ai/analysis.md) · [리서치](rule-based-ai/research.md) |

## 유지한 주요 판정

- DOOM Eternal의 자원별 보상 행동과 Bloodborne의 반격 회복 창은 실제 자료로 구분한다. 모든 공격이 모든 자원을 회복시킨다고 일반화하지 않는다.
- 러버밴딩은 DDA의 한 사례다. 자동 보정이 접근성 전체를 대신하거나 모든 장르에서 더 낫다고 판단하지 않는다.
- 평균 성공률은 최장 실패를 보장하지 않는다. 누적 확률의 시작 상수를 표시 확률과 같게 두면 장기 평균이 달라진다.
- 결정성은 플레이어의 불확실성 부재가 아니다. PokéRogue beta 코드와 2024년 영상·운영 저장 주기를 구분한다.
- 무승부를 포함하는 Elo의 E는 기대점수다. TrueSkill의 평균과 불확실성, 실제 대기열 정책도 따로 읽는다.
- Gold/Silver의 비용 점수는 낮을수록 선호한다. 커뮤니티 재구성 소스를 제작사 원본 공개나 실행 재현으로 표시하지 않는다.

## 원자료 대응

| 수집 ID | 통합 이슈 |
| --- | --- |
| `combat-incentives` | [전투 보상과 위험 선택](combat-risk-reward/research.md) |
| `risk-reward` | [전투 보상과 위험 선택](combat-risk-reward/research.md) |
| `dynamic-difficulty` | [동적 난이도의 흔들림](dynamic-difficulty/research.md) |
| `game-randomness` | [무작위 정보 공개와 실패 연속 분포](randomness-distributions/research.md) |
| `pseudorandom-fairness` | [무작위 정보 공개와 실패 연속 분포](randomness-distributions/research.md) |
| `retro-rng` | [난수의 재현과 체크포인트](deterministic-rng/research.md) |
| `pokerogue-rng` | [난수의 재현과 체크포인트](deterministic-rng/research.md) |
| `matchmaking` | [실력 점수와 상대 선택](matchmaking/research.md) |
| `pokemon-gold-silver` | [규칙 점수로 기술 선택하기](rule-based-ai/research.md), [압축·데이터 배경](rule-based-ai/analysis.md) |

각 리서치 문서는 이전 화면 대조 기록, 공개 원문 근거, 독립 교육 모형의 계산을 구분한다. 모형의 수치 검증은 원작 재현이나 사용자 경험 검증을 대신하지 않는다.
