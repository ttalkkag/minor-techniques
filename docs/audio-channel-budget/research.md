# 게임기 음원 채널·샘플 재생 리서치

[분석](analysis.md) · [주제 요약](README.md)

## 검토 범위

수집 ID는 `game-console-audio`다. 2026-09-22 수집·09-23 통합 검토 이후 09-25에 영상의 관련 자막과 기존 분석을 재독했다. 09-26에는 Pan Docs·libnds·Web Audio·Microsoft PCM 기술 자료를 새로 검색하고 본문을 대조했다. 이전 영상 검토는 캡처 37장을 수집하고 대표 화면을 대조한 범위다. 칩·에뮬레이터 실행이나 원음 청취는 하지 않았다.

## 영상의 근거 위치

| 출처 | 설명 | 채택 범위 |
|---|---|---|
| [01:00](https://www.youtube.com/watch?v=2i0QKs5r_zI&t=60s) | 합성 파형 시각화 | 합성 파형으로 음색 구성 |
| [03:10](https://www.youtube.com/watch?v=2i0QKs5r_zI&t=190s) | Pulse 1·2, Wave, Noise | 네 하드웨어 음원 채널의 예 |
| [03:40](https://www.youtube.com/watch?v=2i0QKs5r_zI&t=220s) | DS 파형과 샘플 비교 | 샘플 기반 음악의 아이디어 |
| [04:50](https://www.youtube.com/watch?v=2i0QKs5r_zI&t=290s) | DS 게임 음악 사례 | 영상이 제시한 사례이며 음질 평가 미실시 |

05:00 이후 세대 변화 설명은 역사적 경향으로 한정한다. 최신 게임이 전부 저장 음원을 사용하거나 하드웨어 제약이 완전히 사라졌다는 결론은 사용하지 않는다. 작곡가 전원이 직접 어셈블리를 썼다는 일반화도 채택하지 않는다.

## 출처별 자료 분석

[Pan Docs Audio Registers 소스](https://raw.githubusercontent.com/gbdev/pandocs/master/src/Audio_Registers.md)의 채널별 절, 특히 `Sound Channel 3 — Wave output`과 파형 RAM 설명을 09-26 재열람했다. 32개 4비트 표본과 읽기 속도를 조절하는 구조를 확인했다. gbdev 연구 프로젝트의 원본 문서이며 Nintendo가 발행한 사양서로 표시하지 않는다.

[devkitPro libnds sound.h](https://github.com/devkitPro/libnds/blob/master/include/nds/arm9/sound.h)의 `soundPlaySample`, `soundPlayPSG`, `soundPlayNoise` 선언을 09-26 확인했다. 샘플·PSG·노이즈 경로가 노출돼 있다는 사실은 “DS는 샘플 전용”이라는 해석을 제한한다. 함수 존재만으로 특정 게임의 사운드 드라이버·CPU 분업 효과를 확인했다고 하지 않는다.

[W3C Web Audio 1.0 권고안](https://www.w3.org/TR/webaudio-1.0/#dom-audiobuffersourcenode-playbackrate)의 재생률과 `detune` 합성 규약을 09-26 확인했다. 웹에서 같은 데이터의 읽기 속도를 바꿀 수 있다는 비교 근거다. 길이 D/r는 일정한 양수 재생률·비반복 전체 재생 조건의 관계이며 칩 동작이 Web Audio와 같다는 주장은 하지 않는다.

[Microsoft WAVEFORMATEX](https://learn.microsoft.com/en-us/windows/win32/api/mmeapi/ns-mmeapi-waveformatex)의 `nChannels`, `nBlockAlign`, `nAvgBytesPerSec`도 같은 날 확인했다. PCM 바이트율은 저장 형식의 채널 수와 표본 크기로 정해지며 스피커 출력 구성으로 직접 정해지지 않는다.

## 분석에 추가한 내용

기존 `historical` 판정을 유지한다. 시퀀스와 샘플을 배타적 기종 구분으로 쓰지 않고 저장 공간·연주 자원의 선택으로 정리했다.

채널 소유자 표, 선점 후 곡 시계 유지, 4,000바이트 명령+200,000바이트 악기 예시는 자체 교육 설계다. 실제 Game Boy 드라이버의 복귀 정책과 수치가 아니다. 60초 PCM 크기는 주어진 형식의 산술값이며 압축 음원의 파일 크기로 읽으면 안 된다.

## 남은 연구

실제 역사적 구현을 보여 주려면 특정 작품·드라이버·칩 모델을 고정하고 채널 선점 코드를 조사해야 한다. 정확한 에뮬레이션을 목표로 하지 않는 초기 실험에서는 음원 배분, 음표/표본 표현, 속도와 길이 관계에 한정한다. 원작 음악은 현재 실험 자산으로 포함하지 않았다.
