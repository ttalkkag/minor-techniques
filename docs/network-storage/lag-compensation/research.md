# 지연 보상 리서치

[분석](analysis.md) · [그룹 요약](../README.md)

## 근거 기록

2026-09-22 수집 보완과 09-23 통합 검토 후, 09-25 원자료 문서·관련 자막 및 Riot·Photon 본문을 다시 열람했다. 네트워크 실행·서버 코드 계측·원작 재생은 수행하지 않았다.

수집 ID는 `lag-compensation`이다. 이전 검토는 OCR·자막과 대표 화면을 대조한 범위다. 아래 공개 영상의 시점별 논점과 공식 자료의 관련 절을 근거로 사용한다.

## 영상 주장 대조

| 위치 | 주장 | 채택 또는 제한 |
|---|---|---|
| [00:15](https://www.youtube.com/watch?v=o7waSG4jROw&t=15s) | 서로 다른 관측 시점 | 사수 화면·서버 처리·대상 상태 분리 |
| [00:27](https://www.youtube.com/watch?v=o7waSG4jROw&t=27s) | 과거 위치로 검사 | 히트스캔의 이력 질의로 채택 |
| [00:33](https://www.youtube.com/watch?v=o7waSG4jROw&t=33s) | 미래 위치를 예측하지 않아도 됨 | 비행 시간이 있는 이동 탄환까지 확장하지 않음 |
| [00:48](https://www.youtube.com/watch?v=o7waSG4jROw&t=48s) | 엄폐 후 피격 | 사수의 과거 화면을 인정할 때 생기는 절충 |
| [00:52](https://www.youtube.com/watch?v=o7waSG4jROw&t=52s) | 사용자가 특정 오류를 더 싫어함 | 사용자 연구 근거가 없어 보편적 결론에서 제외 |

## 공식 자료별 분석

### Riot: The State of Hit Registration

[개발팀 글](https://playvalorant.com/en-gb/news/dev/the-state-of-hit-registration/)의 `FROM CLICK TO HEADSHOT` 절을 09-25 다시 읽었다. 서버 권한, 클라이언트 예측, 발사 프레임 정보, 과거 위치·애니메이션 상태 검사를 설명한다. 시각 효과가 표시되는 시점과 판정에 쓴 프레임도 구분한다.

판정에 위치만 저장하면 충분하다는 가정을 피하는 근거로 썼다. 이 자료의 공개 시점은 2020년이다. 2026년 서버의 보상 길이·허용 오차·모든 엄폐물 처리 규칙을 확인한 것으로 쓰지 않는다.

### Photon Fusion 2: Lag Compensation

[공식 문서](https://doc.photonengine.com/fusion/v2/manual/advanced/lag-compensation)의 `Hitbox`, `Queries`, `Sub-tick Accuracy` 절을 09-25 확인했다. 페이지 갱신 표시는 2026-07-21이다. Hitbox 이력과 일반 Collider가 서로 다른 시간으로 질의될 수 있다는 제한을 상세 분석에 복구했다.

`IncludePhysX`는 일반 Collider의 현재 상태를 사용한다. `SubtickAccuracy`는 클라이언트가 본 틱 사이 보간 상태를 질의한다. Overview에 명시된 지원 범위는 Server Mode와 Host Mode다. 따라서 Shared Mode도 같은 서버 보상을 제공한다거나 “옵션을 켜면 동적 월드 전체가 과거로 이동한다”, “서브틱이면 지연이 없다”는 결론은 부적절하다.

### 기존 Valve 조사 기록

2026-09-22 조사에서 참고한 [Valve 지연 보상 기술 글](https://developer.valvesoftware.com/w/index.php?title=Latency_Compensating_Methods_in_Client%2FServer_In-game_Protocol_Design_and_Optimization&uselang=en)과 [Source SDK 구현](https://github.com/ValveSoftware/source-sdk-2013/blob/master/src/game/server/player_lagcompensation.cpp)은 네트워크·보간 지연 구분과 임시 복원 후 현재 상태 복구를 보강하는 자료다. 이번에는 이 두 본문을 재열람하지 않았으므로 현재 코드 동작·라인 검증으로 보고하지 않는다.

## 결론과 열린 질문

기존 `qualified` 판정을 유지한다. 0.6m 위치 차이와 이력 메모리 예산은 조건을 명시해 만든 교육용 계산이다. 원작 내부 수치가 아니다.

남은 문제는 순간이동·파괴된 엄폐물의 이력 표현, 허용 이력 초과 정책, 비대칭 지연에서 시각을 추정하는 방식이다. 대상 엔진과 게임 규칙이 정해진 후 각각 조사해야 하며, 문서에 없는 값을 이번에 추정하지 않았다.
