# 공간 음향과 도플러 리서치

[분석](analysis.md) · [주제 요약](README.md)

## 범위와 원자료

수집 ID는 `game-sound-physics`다. 2026-09-22 보완·09-23 통합 검토 기록을 유지하고 09-25 영상의 관련 자막과 Steam Audio·Unity 본문을 재열람했다. 09-26에는 Steam Audio·Unity 기술 자료를 새로 검색하고 본문을 대조했다. 이전 영상 검토는 캡처 27장을 수집하고 대표 화면을 대조한 범위다. 아래 공개 영상의 시점과 공식 자료를 근거로 사용하며 오디오 청취·스펙트럼 측정·전체 프레임 재검토는 수행하지 않았다.

같은 영상의 차폐와 도플러를 이 문서에 묶되 원인은 분리했다. 공통점은 음원·청자의 공간 상태이고, 차폐의 해결책으로 속도 갱신을 바꾸거나 도플러 문제를 벽 레이 수로 해결하지 않는다.

## 영상과 교정

| 위치 | 영상 논점 | 문서 판단 |
|---|---|---|
| [00:12](https://www.youtube.com/watch?v=1q9srGjkpD0&t=12s) | 먼 곳에서 고음이 줄어듦 | 거리 감쇠와 주파수별 흡수를 분리. “저음만 남음”을 이진 법칙으로 사용하지 않음 |
| [00:33](https://www.youtube.com/watch?v=1q9srGjkpD0&t=33s) | 접근·이탈 시 파면과 음높이 | 도플러 원리로 채택 |
| [00:48](https://www.youtube.com/watch?v=1q9srGjkpD0&t=48s) | 동굴의 반사음 | 직접음과 반사 경로 구분 |
| [01:03](https://www.youtube.com/watch?v=1q9srGjkpD0&t=63s) | 장애물 때문에 소리가 달라짐 | 차폐·재료 전달·반사를 나눠 설명 |

PUBG·Mario Kart·Zelda는 영상이 든 청각 사례다. 화면과 자막으로 출시 게임의 필터·전파 알고리즘을 특정하지 않았다.

## 출처별 근거 분석

[Steam Audio Occlusion Settings](https://valvesoftware.github.io/steam-audio/doc/unreal/occlusion-settings.html)의 `Apply Distance Attenuation`, `Apply Air Absorption`, `Apply Occlusion`, `Apply Transmission` 항목을 09-26 확인했다. 직접 경로의 모델이 독립 설정이고 전달은 주파수 의존 표현도 가능하다. 벽이면 반드시 무음이라는 설명을 제한한다.

[Steam Audio Simulation](https://valvesoftware.github.io/steam-audio/doc/capi/simulation.html)의 `iplSimulatorRunDirect`, `iplSimulatorRunReflections`, `iplSimulatorRunPathing`과 차폐 표본 설명을 같은 날 읽었다. 차폐·전달을 켠 직접 시뮬레이션은 오디오 처리 스레드에서 호출하지 않도록 하며, 반사·경로 계산은 오디오와 게임 스레드를 막지 않게 별도 스레드에서 실행하도록 권고한다. 공식 SDK를 쓰면 대상 게임의 음향이 자동 재현된다는 결론은 나오지 않는다.

[Unity 6.0 velocityUpdateMode](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/AudioSource-velocityUpdateMode.html)의 Description은 도플러 문제에서 이동과 속도 갱신 주기를 맞추도록 한다. 이 내용은 09-26 재열람했다. 순간이동 리셋 정책이나 1,800m/s 예시는 그 원리를 설명하기 위해 추가한 자체 설계·계산이다.

## 채택 범위와 미해결 문제

기존 `qualified` 판정을 유지한다. 열린 경로 비율과 전달량을 혼합한 식은 교육용 근사로 표시했고, 실제 회절 방정식이나 Steam Audio 내부 계산식으로 소개하지 않았다.

다음 조사에는 단일·다중 레이의 경계 전환, 음원 수에 따른 계산 비용, 동적 문 갱신 지연이 필요하다. 음악적 청취 품질과 물리 모델의 계수 정확도도 서로 다른 평가다. 이 문서는 SDK 도입 결정이나 성능 실측을 완료한 기록이 아니다.
