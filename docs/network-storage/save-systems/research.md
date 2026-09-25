# 저장·복원 리서치

[분석](analysis.md) · [그룹 요약](../README.md)

## 조사 범위

수집 ID는 `save-systems`다. 2026-09-25에 영상의 관련 자막과 기존 분석을 다시 읽었으며 09-22 보완·09-23 통합 검토 이력은 유지한다. 이전 시각 검토는 대표 화면을 대조한 범위다. 아래 공개 영상과 공식 저장 문서를 근거로 사용하며 카트리지 덤프·게임 실행·저장 장애 주입은 하지 않았다.

## 영상 근거와 교정

| 출처 위치 | 원래 논점 | 채택한 내용과 제외한 일반화 |
|---|---|---|
| [00:21](https://www.youtube.com/watch?v=0fap5_6orlw&t=21s) | 이름·위치·파티·아이템 | 세계 복원에 필요한 핵심 상태 |
| [00:27](https://www.youtube.com/watch?v=0fap5_6orlw&t=27s) | 이벤트를 비트로 저장 | 비트 플래그 원리. 자막의 이벤트 개수는 오인식 가능성이 커 사용하지 않음 |
| [00:51–00:57](https://www.youtube.com/watch?v=0fap5_6orlw&t=51s) | 번갈아 저장해 백업 복구 | 이전 정상본을 남기는 전략. 실제 쓰기 규약은 별도 조사 |
| [01:16](https://www.youtube.com/watch?v=0fap5_6orlw&t=76s) | 자동 저장과 하드웨어 발전 | 수동 저장이 사라졌다는 결론은 장르·정책 차이 때문에 제외 |

영상의 GB 32KB·GBA 128KB를 모든 카트리지의 공통 저장 사양으로 채택하지 않았다. 숫자가 맞는 특정 작품이 존재하더라도 기종 전체 규칙으로 확대할 근거는 별개다.

## 현재 공식 자료

[Epic Saving and Loading Your Game](https://dev.epicgames.com/documentation/en-us/unreal-engine/saving-and-loading-your-game-in-unreal-engine)의 `Saving A Game`, `Asynchronous Saving`, `Synchronous Saving` 절을 09-25 다시 열람했다. SaveGame 상태를 구성하고 저장하며 완료 때 성공/실패를 받는 흐름을 확인했다. 플레이 중 큰 저장과 작은/정지 중 저장의 선택 조건을 설명한다.

이 자료는 상태를 명시하고 완료를 처리해야 한다는 근거다. 이중 슬롯의 원자성·전원 손실 내구성을 보증하는 명세가 아니므로 분석의 이중 슬롯은 별도 교육용 설계로 표시했다.

2026-09-26에는 Epic 본문과 [SQLite Atomic Commit](https://sqlite.org/atomiccommit.html)의 3.7·3.9·3.10·7.1절을 대조했다. 운영체제 캐시로의 쓰기·다시 읽기와 비휘발성 저장소로의 flush는 구분된다. 따라서 이중 슬롯의 읽기 재검증만으로 전원 손실 내구성을 확인했다고 볼 수 없다. SQLite의 저널 절차 자체를 이중 슬롯과 같은 알고리즘으로 취급하지 않는다.

[Godot Saving games](https://docs.godotengine.org/en/stable/tutorials/io/saving_games.html)의 `JSON vs binary serialization`도 이번에 열람했다. 복잡한 자료형·크기·직렬화 수작업의 차이를 설명한다. JSON이면 무조건 작은 데이터, 바이너리이면 자동 호환이라는 가정을 피하는 비교 자료다.

## 원작 자료의 취급

원영상 설명에 [pret/pokered](https://github.com/pret/pokered)와 세대별 저장 구조 자료가 연결돼 있지만, 이번에 이 코드로 실제 저장 구조를 재구성하지 않았다. 원작의 정확한 세대 카운터·체크섬·슬롯 레이아웃이라고 설명하려면 대상 작품·버전과 코드 위치를 고정해 별도로 분석해야 한다.

따라서 기존 `qualified` 판정을 유지한다. 분석의 세대 7/8과 16개 이벤트는 자체 예제다. 이중 슬롯·버전·쓰기 순서에 관한 분석을 원작 역공학 완료로 표시하지 않는다.

## 후속 조사

실제 저장 API가 정해지면 완료와 영속화의 의미, 한 슬롯의 최소 원자 쓰기 단위, 용량 부족 때 기존 데이터 보존 규약을 확인한다. 스키마 변경과 동시 요청은 별도 복원 시나리오로 다룬다. 모의 장치 성공과 실제 전원 손실 내구성 결과는 구분해 기록해야 한다.
