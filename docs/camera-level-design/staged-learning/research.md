# Mario 1-1 학습 설계 조사

[상세 분석](analysis.md) · [분류 요약](../README.md)

## 근거 구간

[원영상](https://www.youtube.com/watch?v=jhwrqgcReNI)의 기존 분석은 00:50 시작 위치, 01:50 버섯 회귀, 02:20 파이프 높이, 02:40 구멍, 04:10 점프 버튼과 속도 곡선을 묶었다. 수집 ID는 `mario-level-design`이다. 2026-09-25 기존 대표 화면 분석과 관련 자막을 대조했다. 이 검토를 전체 프레임 검증으로 확대하지 않는다.

## 원자료의 정정 보존

09-23 검토에서는 02:40·02:50 두 캡처를 직접 확인해 바닥 없는 낭떠러지와 바닥 있는 계단 틈을 구분했다. 09-25에 두 화면을 새로 재생·검증했다는 의미는 아니다. 두 지형을 모두 ‘폭이 넓어지는 구멍’으로 묶으면 서로 다른 실패 비용을 놓친다.

04:05–04:20의 해설은 버튼 해제와 낙하 중력의 설명이다. 3배라는 숫자와 상승 속도 처리 방식은 원작 ROM·코드에서 확인된 상수가 아니다. 자체 비교 모형에 그런 설정을 넣을 수는 있으나 원작 재현이라는 표시는 할 수 없다.

## 직접 자료와 해석

[Nintendo Iwata Asks, Letting Everyone Know It Was A Good Mushroom](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-New-Super-Mario-Bros-Wii/Volume-1/4-Letting-Everyone-Know-It-Was-A-Good-Mushroom/4-Letting-Everyone-Know-It-Was-A-Good-Mushroom-210863.html)을 2026-09-26 다시 열람했다. Goomba 뒤 버섯 등장, 파이프 반사, 위 블록으로 점프 회피가 막히는 대화가 채택한 핵심 근거다. ‘모든 사용자가 설명 없이 학습했다’는 통제 실험 결과는 아니므로 디자인 의도와 효과를 분리한다.

[Godot CharacterBody2D 문서](https://docs.godotengine.org/en/stable/tutorials/physics/using_character_body_2d.html)의 stable 본문을 2026-09-26 다시 열람해 사용자 코드로 이동·충돌 반응을 제어하는 수단임을 확인했다. 이번 글의 원작 역사 판정을 지지하는 근거로는 사용하지 않는다. API 존재만으로 마리오 조작감이 재현되는 것도 아니다.

## 남은 조사

정확한 원작 이동 상수는 근거가 확보될 때 별도 재현 주제로 다룬다. 현재 목표는 안전한 시도→결과 인지→조건 변경이라는 학습 기회를 원리로 설명하는 것이다. 공략을 본 참가자의 재플레이와 처음 본 참가자의 행동을 구분한 관찰, 실패 후 재시도 위치, 보상 회피 여부가 다음에 필요한 자료다. 아직 사용자 실험을 수행하지 않았다.
