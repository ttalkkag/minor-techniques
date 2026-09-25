# 인덱스 재사용의 수집 자료와 정정 기록

[상세 분석](analysis.md) · [그룹 요약](../README.md)

2026-09-23에는 `retro-image-compression`과 `retro-graphics` 모두 `qualified`로 검토됐다. 2026-09-25에는 관련 자막과 아래 웹 본문을 대조했다.

아래 2026-09-25 공개 자료 열람과 NESdev 접근 실패는 작성 단계의 기록이다. 이어진 교차검토에서는 번호 폭이 고유 타일 수를 수용해야 한다는 조건과 1,024바이트 단위를 보강했으며, 웹 명세를 다시 확인한 것으로 세지 않는다.

## 수집 항목과 공개 영상의 대응

| 수집 ID·공개 영상 | 분석 대상 구간 | 기록과 대조한 내용 |
| --- | --- | --- |
| `retro-image-compression` · [이미지 용량](https://www.youtube.com/watch?v=p0mH7UAwtXQ) | [00:16~00:25](https://www.youtube.com/watch?v=p0mH7UAwtXQ&t=16s), 00:25~00:32, [00:32~00:39](https://www.youtube.com/watch?v=p0mH7UAwtXQ&t=32s) | 색 번호·13색·4비트, 콘솔 전체로의 일반화, 팔레트 교체 |
| `retro-graphics` · [고전 그래픽](https://www.youtube.com/watch?v=keREBAhYErY) | [00:32~01:19](https://www.youtube.com/watch?v=keREBAhYErY&t=32s), [01:19~02:02](https://www.youtube.com/watch?v=keREBAhYErY&t=79s), [02:09~02:20](https://www.youtube.com/watch?v=keREBAhYErY&t=129s), 02:20~03:20 | 패턴·타일 번호, 팔레트·속성 합계, 약 70KB 비교, 스크롤·매퍼 설명 |

영상의 시각 근거는 과거 대표 화면 검토 범위다. 2026-09-25에는 관련 자막을 대조했다. 모든 이미지를 다시 수동 판독하거나 영상을 재생한 것은 아니다. 대표 위치인 이미지 영상 00:18·00:24·00:36과 고전 그래픽 02:00도 같은 과거 기록의 범위다.

## 출처별 판단

| 출처 | 확인 위치 | 근거와 채택 범위 |
| --- | --- | --- |
| [이미지 용량 원영상](https://www.youtube.com/shorts/p0mH7UAwtXQ) | 위 시간대에 해당하는 수집 자막·OCR | 13색→4비트와 팔레트 교체의 설명 대상. SNES 전체 모드 한도로 일반화하지 않음 |
| [고전 그래픽 원영상](https://www.youtube.com/watch?v=keREBAhYErY) | 01:02~02:20 자막 | 배치·속성 합계와 비교 수치의 쟁점 위치. 실제 콘솔 측정 자료 아님 |
| [W3C PNG 3](https://www.w3.org/TR/png-3/) | 11.2.1 `IHDR` 표 12, 11.2.2 `PLTE`, 11.3.1.1 `tRNS`, 9 `Filtering`, 10 `Compression`, 11.2.3 `IDAT` | 인덱스 깊이·팔레트·투명도·파일 압축을 구분하는 규범 자료. 2026-09-25 본문 확인 |
| [NESdev PPU nametables](https://www.nesdev.org/wiki/PPU_nametables) | 네임테이블 본문 목표 | 2026-09-23 검토는 본문 접근 실패. 2026-09-25에도 웹 열람이 Internal Error여서 새 확인 근거로 쓰지 않음 |
| [Godot TileMapLayer](https://docs.godotengine.org/en/stable/classes/class_tilemaplayer.html) | `Description`, `update_internals()` | 기존 조사에 있던 현대 타일맵 후보 확인. 공유 타일 사용과 변경 갱신은 별개이며 NES 동작 재현 증거가 아님 |
| [Khronos KTX](https://www.khronos.org/ktx/) | KTX 2.0·Basis Universal 소개, `Comparing KTX with Basis Universal to Image Formats` | 기존 조사에 있던 GPU 압축 포맷 변환 후보 확인. 이 프로젝트의 품질·속도 우위를 결정하지 않음 |

## 원자료에서 복원한 정정의 이유

**13색 예시:** 자막의 `팔레스트`는 같은 구간의 화면 OCR에 `팔레트`가 표시돼 있어 팔레트로 정리한다. OCR의 색 번호를 원본 픽셀 전체 판독 결과로 보지 않는다. 상세 수치 예시는 자작 16×16·13색 조건을 사용한다.

**16색 일반화:** 00:25 이후 자막은 슈퍼패미컴을 하나의 최대 16색 저장 방식처럼 요약한다. 기존 분석부터 이를 제한 팔레트 이미지의 모델로 좁혀 해석했다. PNG에서 4비트 인덱스가 유효하다는 근거는 SNES의 모든 그래픽 모드가 같다는 근거가 될 수 없다.

**1KB와 70배:** 영상이 1KB라고 부른 합계는 1,024바이트이며 배치·속성 데이터의 범위에 맞춰 보존한다. 전체 그림과의 비교에서 타일 원본이 빠진 문제와 `256×240×6/8=46,080` 산술 문제를 별도로 설명했다. 팔레트 비용만 덧붙이면 70배가 복구되는 것은 아니다.

**NESdev 검토 이력:** 2026-09-22의 후속 조사 기록은 당시 PPU 문서를 대조했다고 기록한다. 2026-09-23의 정식 검토는 재접근 실패로 더 좁은 범위를 남겼다. 수집 당시의 판단과 외부 명세의 현재 확인 상태는 구분한다. 재접근 실패를 정밀 사양의 새 확인 근거로 사용할 수 없다.

## 범위를 나눈 주제와 남은 질문

같은 고전 그래픽 영상의 스프라이트 누락은 메모리 중복과 원인이 달라 [스캔라인 제한](../scanline-limits/analysis.md)에 분리했다. Mode 7, 빌보드, GBA 모드와 DS 화면 출력은 여기의 간접 참조 수식으로 설명하지 않는다. 특히 DS ‘한 화면만 3D’의 절대적 불가능 주장은 캡처·교대 출력 명세를 확인하기 전 채택하지 않는다.

남은 조사는 SNES/NES 모드별 비트 평면·주소·매퍼 조건, 인덱스 파일의 실제 디코딩 형식, 색공간·투명도·필터에 의한 복원 차이, KTX 후보의 가장자리 품질이다. 파일·GPU 메모리 비교와 원작 콘솔 실행은 미실행이다.
