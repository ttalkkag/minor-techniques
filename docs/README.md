# 게임 실험실

게임의 화면·시점·캐릭터·규칙을 직접 조절하며 개발 기법의 원인과 해결 방법을 이해하기 위한 문서다. 렌더링·물리·메모리·시간 제약이 만드는 현상과, 이를 해결할 때 달라지는 비용·표현·조작감을 다룬다.

주제별 README에서 문제를 고르고, `analysis.md`에서 작동 원리와 해결 조건을, `research.md`에서 공개 출처와 적용 한계를 확인한다. 실험을 설계한 주제에는 `experiment.md`가 있다.

[목록 페이지 구성](INDEX.md)

## 실험 주제

| 주제 | 상세 주제 수 | 다루는 문제 |
| --- | ---: | --- |
| [시야와 가시성](rendering-visibility/README.md) | 6 | 빌보드·잔디·가림·레이캐스팅·시야 판정 |
| [재질과 화면 표현](rendering-materials/README.md) | 6 | 알파·법선·가짜 내부·반사·연기·병 속 액체 |
| [렌더링 정밀도](rendering-precision/README.md) | 5 | 정점 흔들림·무늬 왜곡·깊이 버퍼·큰 좌표·Mode 7 |
| [이동과 충돌](movement-collision/README.md) | 6 | 점프·입력 보정·모서리·히트박스·IK·고속 충돌 |
| [애니메이션과 효과](animation-effects/README.md) | 5 | 곡선 이동·이징·머리카락·파괴·상태 반응 |
| [카메라와 레벨 설계](camera-level-design/README.md) | 6 | 카메라 추적·좁은 문·동선·튜토리얼·락온·기차 장비 |
| [월드와 절차 생성](world-generation/README.md) | 6 | 노이즈·파도·던전·청크·복셀·경로 찾기 |
| [보상·난이도·무작위성](game-rules/README.md) | 6 | 전투 보상·동적 난이도·난수·분포·매칭·규칙 AI |
| [게임 AI](game-ai-agents/README.md) | 2 | 관측 지연·행동 결과·목표 상태·강화학습 보상 |
| [네트워크와 저장](network-storage/README.md) | 5 | 지연 보상·롤백·히트스캔·저장·패스워드 |
| [실행 자원과 데이터 표현](runtime-resources/README.md) | 8 | 풀링·셰이더 준비·스트리밍·압축·레트로 제약·입력과 실행 경계 |
| [상황에 따른 음악 전환](adaptive-music/README.md) | 1 | 박자 동기화·레이어 전환·예약과 취소 |
| [공간에 따른 소리 변화](spatial-audio/README.md) | 1 | 거리 감쇠·벽 차폐·전달·반사·도플러 |
| [게임기 음원 채널 제약](audio-channel-budget/README.md) | 1 | 동시 재생 한도·효과음 선점·시퀀스와 샘플 저장 |

## 첫 실험: 고속 물체의 충돌 누락

빠르게 움직이는 물체가 얇은 벽을 통과하는 장면에서 속도·벽 두께·물리 갱신 간격을 바꾸고, 위치 검사와 경로 검사의 차이를 비교한다.

[상세 분석](movement-collision/collision-tunneling/analysis.md) · [리서치](movement-collision/collision-tunneling/research.md) · [실험 설계](movement-collision/collision-tunneling/experiment.md)

문서의 계산 예와 관찰 순서로 실패 조건과 해결 방법을 확인할 수 있다.
