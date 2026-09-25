# 낡은 관측과 실행 결과 누락 — 리서치

[그룹 요약](../README.md) · [상세 분석](analysis.md)

검토 기준일: 2026-09-26. 영상 시각은 기존에 확인한 설명 구간이며, 대표 화면과 관련 자막 발췌를 근거로 삼는다. 아래 기술 자료는 2026-09-26 새로 검색하고 본문을 다시 확인했다. 원영상 전체 재생, 게임·모델 실행, 성능 측정은 하지 않았다.

## 원자료와 근거 위치

### `pokemon-ai`

[포켓몬을 자동사냥하는 AI 제작법](https://www.youtube.com/watch?v=m5SPH4zLRaM)

- 근거 위치: [01:50](https://www.youtube.com/watch?v=m5SPH4zLRaM&t=110s): 이동 가능 격자와 경로 탐색 예시. / [03:10](https://www.youtube.com/watch?v=m5SPH4zLRaM&t=190s): 게임 상태·계획·평가를 표시하는 대시보드. / [04:20](https://www.youtube.com/watch?v=m5SPH4zLRaM&t=260s): 기억 저장·검색과 세 역할의 연결 도식. / [05:40](https://www.youtube.com/watch?v=m5SPH4zLRaM&t=340s): 소포 전달 이후 반복 이동 문제 설명.
- 2026-09-23 판정: `qualified` — RAM·화면 혼합 관측과 목표·기억 분리는 제작자 저장소와 부합한다. 세 역할이 모두 LLM이라는 뜻은 아니며 일반 게임 지능·영상 비용은 입증되지 않았다.

### `game-commentator-vtuber`

[게임 화면을 해설하는 AI 사례](https://www.youtube.com/watch?v=Te1vRE6QY0w)의 [04:10](https://www.youtube.com/watch?v=Te1vRE6QY0w&t=250s)은 포켓몬 이름·타입의 인식 오류, [04:40](https://www.youtube.com/watch?v=Te1vRE6QY0w&t=280s)은 이전 화면을 함께 제공한 뒤 행동 문맥을 설명하는 장면이다. 정지 화면 한 장에서 빠지는 시간 정보를 다루는 근거로 사용한다. 편집된 사례만으로 입력 수 증가의 보편적 정확도 향상이나 게임 AI의 성능을 확정하지 않는다.

### `minecraft-ai-building`

[AI가 건축하는 마인크래프트 건물](https://www.youtube.com/watch?v=1QgXMuB-qMM)

- 근거 위치: [01:20](https://www.youtube.com/watch?v=1QgXMuB-qMM&t=80s): 사용자 요청을 게임 명령으로 변환한 대화. / [02:20](https://www.youtube.com/watch?v=1QgXMuB-qMM&t=140s): 집을 만드는 봇. / [03:50](https://www.youtube.com/watch?v=1QgXMuB-qMM&t=230s): 직접 월드 변경 권한을 사용한 구조물.
- 2026-09-23 판정: `qualified` — LLM 계획과 Mineflayer 실행, 직접 월드 변경과 생존 제약의 구분은 적절하다. 편집된 건축 성공을 자율 생존 성능으로 확대하지 않았다.

### `minecraft-ai-companion`

[마크 AI 여자친구를 만들고 데이트했습니다..](https://www.youtube.com/watch?v=XMide5J4Xbg)

- 근거 위치: [01:10](https://www.youtube.com/watch?v=XMide5J4Xbg&t=70s): 게임 행동 도구 명령 목록. / [02:50](https://www.youtube.com/watch?v=XMide5J4Xbg&t=170s): 게임 상태와 사용자 메시지가 섞인 대화 로그. / [03:10](https://www.youtube.com/watch?v=XMide5J4Xbg&t=190s): 공격 행동과 거절 대사의 불일치 설명.
- 2026-09-23 판정: `qualified` — 행동은 공격하고 대사는 거절하는 사례를 자막으로 확인했다. 공통 실행 결과로 대사를 만드는 해결안은 설계 제안이며 실제 모순율 개선은 미측정이다.

## 기술 자료의 근거와 채택

| 출처·열람 | 확인한 대목 | 채택한 해석 / 남는 범위 |
| --- | --- | --- |
| [제작자 Pokemon Red AI 저장소](https://github.com/sesang06/pokemon_red_ai), 2026-09-26 재열람 | `Architecture`, `ADK Autoplay`, `Memory and Runtime Data`: RAM+이미지 관측, 결정적 Executor, `map_id` 전환 시 이동 중단, 목표와 장기 기억 저장 분리 | 관측→행동→새 상태 판정을 채택한다. 현재 기본 브랜치의 설명을 읽었으며 특정 커밋의 실행·테스트나 영상 당시 코드 일치는 확인하지 않았다. |
| [Mindcraft 원 프로젝트](https://github.com/mindcraft-bots/mindcraft), 2026-09-26 재열람 | README의 LLM+Mineflayer 구성과 `allow_insecure_coding` 기본 비활성화 설명 | 모델 출력과 실행기의 권한을 구분한다. 현재 develop 브랜치의 설명이며 제한된 청사진·변경분 재시도는 이 프로젝트의 설계 제안이다. Mindcraft가 그대로 보장한다는 주장이 아니다. |

## 게임 장면의 해석과 적용 한계

`pokemon-ai` 자동 자막 05:33~05:40 주변은 소포 전달 뒤 반복 이동하는 제작자 사례를 설명한다. 좌표 이동 구현만으로 스토리 목표가 관리되지 않는다는 분석 근거다. 소포를 전달했다는 진술이 있어도 매번 현재 목표가 갱신되는지는 실행 기록이 필요하다.

`minecraft-ai-companion` 자동 자막 03:10~03:14 주변에는 공격 요청을 거절하는 대사와 실제 행동이 어긋났다는 설명이 있다. 모순이 발생한 사례는 채택하지만 빈도나 수정 후 개선량은 알 수 없다.

관측 시각을 동일 시간축으로 맞추는 조건과 건축 복원 전 현재 상태·버전을 비교하는 절차는 공개 API의 보장 항목이 아니라 자체 설계 보완이다. 서로 다른 장치의 시간을 그대로 빼거나 변경 좌표만 보고 복원하면 관측 나이와 동시 작업 보호가 잘못될 수 있다.

## 남은 리서치 질문

- 영상 당시 코드 버전과 공개 저장소의 어느 변경이 대응하는가?
- 같은 상태에서 관측 간격·행동 길이만 바꾸면 잘못된 완료 판정과 호출 수가 어떻게 달라지는가?
- 건축 중 일부 블록만 배치된 뒤 재시도할 때 자원 소모와 월드 변경이 중복되지 않는가?
