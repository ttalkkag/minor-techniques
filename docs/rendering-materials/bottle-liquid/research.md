# Half-Life: Alyx 병 액체 표현 조사

[기술 분석](analysis.md) · [그룹 요약](../README.md)

## 조사 이력과 질문

수집 ID `bottle-liquid-shader`는 2026-09-22 추가 웹 조사 항목이며 근거는 아래 Valve 공지다. 2026-09-23 통합 판정에 이어 2026-09-25 공지 본문을 대조했다. 확인할 질문은 셰이더 존재와 물리 계산의 부재가 같은 주장인지다. 공식 현상과 자체 근사 모델을 분리한다.

## 공식 기록과 구체 위치

| 자료 | 위치·내용 | 열람 범위 |
| --- | --- | --- |
| [Valve Update 1.4, 2020-05-27](https://steamcommunity.com/games/546560/announcements/detail/2229791404478061089) | Game Features의 병을 흔들 때 액체가 출렁여 보이는 기능 | 이번 실제 본문은 아래 공식 목록에서 재확인 |
| [Steam 1.4 수록 목록](https://store.steampowered.com/news/posts/?appgroupname=Half-Life%3A+Alyx&appids=546560&enddate=1592263154&feed=steam_community_announcements) | 27 May 2020, Game Features의 병 항목 | 2026-09-25 본문 직접 대조 |
| [Steam 1.4.1 수록 목록](https://store.steampowered.com/oldnews/?appgroupname=Half-Life%3A+Alyx&appids=546560&enddate=1743490800&feed=steam_community_announcements) | 15 Jun 2020, Game Features & Fixes의 라벨·liquid shader 수정 | 2026-09-25 본문 직접 대조 |
| [Valve Commentary Update, 2020-11-12](https://steamcommunity.com/games/546560/announcements/detail/2795003923897250614) | 개발자 해설을 확인할 후속 경로 | 원자료 조사 기록만 유지. 이번 게임 내 음성·자막은 열람하지 않음 |

## 채택·보류한 주장

공식 기록으로 액체의 시각 반응 추가와 셰이더 수정은 채택할 수 있다. 그러나 이 기록만으로 모든 물리 계산이 없다고 하거나 VR 사양 때문에 구현이 불가능했다고 단정할 수 없다. 셰이더가 있다는 사실은 물리 상태를 별도로 계산하지 않는다는 증명이 아니다.

원자료의 [Polygon 개발자 인터뷰 경로](https://www.polygon.com/videos/2021/1/6/22213232/half-life-alyx-liquid-bottle-shaders)는 이전 조사에서 본문 접근에 실패했다. 이번에도 그 세부를 검증했다고 추가하지 않았다. 원작의 반사·굴절·배치·유체 상태·정확한 GPU 예산은 미확인이다.

## 자체 모델로 확장한 부분

원자료의 병 고정 내용물/수면 근사/내부 구조 비교와 관찰 카메라 분리는 유지했다. 분석의 회전 좌표식, 감쇠 모델, 원통 부피 예는 이번 자체 설계·기하 도출이다. 공식 공지의 구현 설명을 복원한 식으로 인용하지 않는다. 일정 높이와 일정 양의 차이를 독립적으로 설명해 근사가 숨기는 조건을 드러낸다.

정합성 검토에서는 감쇠식의 자유 응답을 기준으로 `ζ=0`의 무감쇠와 `ζ≥1`의 비진동 조건을 분리했다. 외력이 없을 때 특성근은 `−ζω±ω√(ζ²−1)`이므로 정지 후 0으로 돌아온다는 설명에는 `ω>0, ζ>0` 전제가 필요하다. 부피식도 부정적분 대신 병 바닥에서 수면까지의 정적분으로 명시했다. 이 보완은 자체 식의 수학적 조건이며 Valve의 물리 파라미터가 아니다.

## 남은 조사

게임 내 병 액체 개발자 해설, 공개 셰이더 코드 또는 개발자 직접 설명을 확보하면 실제 구현과 근사 모델을 더 구체적으로 비교할 수 있다. 열린 병·뒤집힘·부피 보존은 아직 자체 실험도 수행하지 않았다. 공식 그림과 게임 모델은 복제하지 않고 자작 병 형상·단면 도식을 사용한다.
