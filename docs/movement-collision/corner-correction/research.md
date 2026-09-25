# 모서리 보정 리서치

[상세 분석](analysis.md) · [그룹 요약](../README.md)

수집 ID는 `corner-correction`이다. 영상 근거는 2026-09-22의 대표 화면·자막·OCR 분석이며, 2026-09-26에 대조한 공식 자료의 범위는 아래 표에 있다. 원게임 실행 기록은 없다.

## 영상 근거

[원영상](https://www.youtube.com/watch?v=hjVLIojpwVk&t=9s)의 00:09는 머리가 걸렸을 때 옆으로 이동하는 사례, 00:21은 대시 중 위로 들어올리는 사례, 00:39는 멈춘 발판의 이전 속도를 활용하는 사례로 기록돼 있다.

영상 제목은 점프 위치 보정을 말한다. 자동 자막의 ‘코너 콜렉션’은 `Corner Correction`, 한국어 ‘코너 보정’으로 읽는다.

## 출처별 판단

| 출처 | 구체 근거·열람 상태 | 분석에 사용한 범위 |
| --- | --- | --- |
| [Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/index.html) | 09-26 본문 열람: 4 `Jump Corner Correction`, 5 `Dash Corner Correction` | 두 보정의 방향과 상황이 다름을 확인했다. 후보 검색 순서와 경로 검사는 자체 설계다. |
| 같은 제작자 글 | 09-26 본문 열람: 7 `Lift Momentum Storage`, 8·9 벽 점프 여유 | 과거 발판 운동을 잠시 유지하는 행동과 벽까지 거리 여유를 구별한다. 글의 픽셀값을 범용 권장값으로 옮기지 않았다. |
| [Godot CharacterBody2D](https://docs.godotengine.org/en/stable/classes/class_characterbody2d.html) | 09-26 stable 본문 열람: `safe_margin`, `PlatformOnLeave`, `platform_on_leave`, `slide_on_ceiling` | 충돌 복구 여유·이탈 시 속도 전달·천장 슬라이드는 빈 공간 후보를 고르는 코너 보정이나 정지 전 속도의 시간 유예를 자동으로 정의하지 않는다. |

제작자 글의 근거는 표에 연결한 `maddymakesgames.com` 본문이다.

## 채택한 설계와 남은 조사

공간 보정·벽 점프 거리·발판 속도 보존은 하나의 영상에서 소개되지만 같은 상태 변수가 아니다. 한 분석 문서 안에서 세 절차를 분리하고, 입력 시각 허용은 [별도 분석](../input-grace/analysis.md)으로 연결했다.

목적지와 경로를 모두 검사하는 절차, 한 틱 총 보정량 제한, 발판 식별자는 교육용 구현의 제안이다. 공개 글의 원작 소스 설명으로 잘못 인용하지 않는다. 마리오 스피드런의 특정 사례·작품·입력 조건은 추가 근거가 없어 보류한다.

원작 캡처 재배포 권한은 확인하지 않았다. 향후 그림은 보정 전후 충돌체와 후보 지점을 자체 도식으로 작성할 수 있다.
