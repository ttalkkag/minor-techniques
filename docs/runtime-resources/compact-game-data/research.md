# 게임 데이터 표현: 원자료와 주장 검토

[상세 분석](analysis.md) · [주제 요약](../README.md)

수집 ID는 `pokemon-red-engineering`이다. 기존 조사 결론과 미완료 검증을 구분하고, 트레이너 테이블과 이미지 압축의 근거를 별도로 연결했다.

2026-09-25 작성 단계의 자료 대조에 이어 교차검토를 수행했다. 교차검토에서는 고정 리비전의 슬롯 가중치·조우 선택 코드와 압축 도구를 다시 열어, 슬롯 선택 뒤 스프레이 조건에 의한 후보 거부와 다섯 압축 후보를 확인했다. 아래 표의 최초 수집·작성 단계와 이 추가 코드 열람은 별개의 기록이다.

## 조사 시점과 읽은 자료

| 시점 | 자료 | 해당 기록이 의미하는 범위 |
| --- | --- | --- |
| 2026-09-22 | 초기 후속 조사 기록 | 트레이너 예외와 압축 모드를 보완하고 자작 이미지 실험을 미실행 과제로 남김 |
| 2026-09-25 | 이 문서 | 영상 자막과 공개 코드·문서 본문을 대조. 설명용 바이트 계산을 확인 |

영상 근거는 자동 자막·OCR와 과거 대표 화면 대조 범위다. 영상 전체 재생·모든 프레임 정밀 판독은 새로 수행하지 않았다. 아래 공개 영상 구간과 고정 리비전 코드가 개별 주장의 근거다.

웹은 작성자가 관리하는 공개 저장소 본문을 열람했다. pret의 현재 참조 리비전은 `d2704a63c26f9ba046ade877445216b3de0519a4`, Pan Docs는 `0edc96012625b16d275674fea4f36aa6b0bb1d45`로 고정했다. pret는 커뮤니티 Red/Blue 재구성 코드이며 Nintendo·Game Freak의 원본 개발 저장소가 아니다. Pan Docs 역시 커뮤니티 하드웨어 문서다. 두 자료의 작성 주체와 입증 범위를 구별한다.

## 원영상의 주장 위치

원영상은 [고물 하드웨어에 포켓몬스터 레드를 녹여낸 기술](https://www.youtube.com/watch?v=SBWvydtAqJ4)이며 수집 정보상 2024-06-30 게시, 7분 32초다. 아래 시각은 기존 대표 화면·자동 자막 분석에서 식별한 구간이다. 오인식된 단어를 기술 용어의 확정 근거로 사용하지 않는다.

| 영상 구간 | 수집된 내용 | 이번 문서에서의 처리 |
| --- | --- | --- |
| 00:32–00:38 | 게임팩 용량과 이미지 크기 비교 | 지역판·덤프·단위가 불명확하므로 용량 수치 미채택 |
| 01:22–01:38 | 8비트 값 범위와 데이터 저장 | CPU 전체 표현 능력으로 일반화한 설명 교정 |
| 01:40–02:12 | 10개 조우 슬롯, 달맞이산 주뱃 빈도 | 슬롯 합산 원리 채택, 층·조건을 뺀 확률은 보류 |
| 02:15–02:57 | 공통 레벨과 개별 레벨, 40비트·64비트 | 형식 구분과 종료값을 포함한 3마리 예로 재구성 |
| 02:57–03:38 | 기술 목록의 자동 결정 | 특수 기술 덮어쓰기 예외를 함께 기록 |
| 03:41–05:07 | 음원 채널, 악보와 울음소리 재사용 | 명령열 저장은 확인, 곡 수·용량·울음소리 수는 미확인 |
| 05:07–05:36 | 4색과 타일 재사용, 타일 수 | 타일 원리 채택, 128개를 기기 전체 한도로 해석하지 않음 |
| 05:36–07:04 | 비트 평면·변환·반복 길이 부호화 | 표현 변경과 압축을 분리하고 실제 도구의 여러 모드 보완 |

기존 대표 장면 연결은 [02:40 데이터 비교](https://www.youtube.com/watch?v=SBWvydtAqJ4&t=160s), [06:00 비트 평면](https://www.youtube.com/watch?v=SBWvydtAqJ4&t=360s), [06:40 부호화](https://www.youtube.com/watch?v=SBWvydtAqJ4&t=400s)다. 자료 위치를 복구한 것이며 이번에 그 프레임을 추가 판독했다는 의미는 아니다.

## 트레이너 테이블: 출처별 확인

### R1. `ReadTrainer`의 읽기 경로

[pret: read_trainer_party.asm](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/engine/battle/read_trainer_party.asm)의 `.IterateTrainer`, `.LoopTrainerData`, `.SpecialTrainer`를 대조했다. `$FF` 판별, 공통 레벨 또는 개별 레벨·종 입력, 0 종료가 확인 지점이다. `.AddLoneMove`, `.GiveTeamMoves`, `.ChampionRival`은 기술 예외의 근거다. `.FinishUp`·`.LastLoop`의 `wAmountMoneyWon`과 `AddBCDPredef`는 여러 바이트 금액 처리를 보여 준다.

따라서 8비트 레지스터 하나의 범위와 CPU가 프로그램 전체에서 표현할 수 있는 수의 범위를 같게 취급하지 않는다. 영상의 레벨 저장 비교는 조건부로 채택하되 모든 트레이너가 같은 레벨·자동 기술만 쓴다는 일반화는 채택하지 않는다. 재구성 코드로 모든 지역판의 세부 동작이나 당시 최적화 의도를 증명할 수는 없다.

### R2. 기술 예외 테이블

[pret: special_moves.asm](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/data/trainers/special_moves.asm)의 `LoneMoves`는 대상 파티 위치와 기술을 묶는다. `TeamMoves`는 트레이너 클래스와 기술의 표다. 전자는 `wLoneAttackNo` 설정이 필요하며 후자와 별도 경로다. R1의 `.GiveTeamMoves`는 다섯 번째 파티원의 기술 위치에 쓴다. 테이블 이름만으로 팀 전원에게 적용된다고 해석하지 않았다.

이 예외 때문에 레벨이 같다는 사실만 확인하고 실제 특수 레코드를 일반 레코드로 바꾸는 변환은 허용할 수 없다. [상세 분석](analysis.md)의 5바이트·8바이트 비교는 레벨·종의 교육용 계산이다. 원 게임 전체를 재직렬화하여 절감한 결과가 아니다.

## 비트 평면과 압축: 출처별 확인

### R3. Pan Docs의 타일 형식

[Tile_Data.md의 Data format](https://github.com/gbdev/pandocs/blob/0edc96012625b16d275674fea4f36aa6b0bb1d45/src/Tile_Data.md#data-format)에서 8×8, 2비트 색 번호, 행별 두 바이트와 비트 순서를 확인했다. 앞부분의 주소 방식은 128타일짜리 블록 세 개와 배경·오브젝트의 선택 범위를 구분한다. 따라서 영상의 128개를 전체 타일 데이터 저장 한도로 옮기지 않는다. 이 문서는 VRAM 표현의 근거이며 ROM 압축 포맷이나 특정 마을의 고유 타일 수를 설명하지 않는다.

프로젝트의 문서 호스팅 주소 `gbdev.io/pandocs/Tile_Data.html`은 작성 단계 열람에서 오류가 나 저장소 원문으로 확인했다. 접근 실패를 명세 확인 실패와 혼동하지 않도록 실제로 읽은 경로를 남긴다.

### R4. pret의 압축 도구

[pkmncompress.c](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/tools/pkmncompress.c)의 확인 위치는 다음과 같다.

| 위치 | 추적한 역할 |
| --- | --- |
| `get_width()` | 입력 크기에서 정사각형 타일 폭을 판정 |
| `compress()`·`transpose_tiles()` | 배열 재배치, 두 평면 추출, 후보 크기 비교 |
| `interpret_compress()` | 평면 순서, XOR 여부, 변환 여부와 출력 구성 |
| `compress_plane()` | `gray_codes` 표와 이전 비트 상태를 이용한 변환 |
| `rle_encode_number()`·`write_data_packet()` | 0인 묶음의 길이와 나머지 묶음 출력 |
| `fill_plane()`·`uncompress_plane()`·`uncompress()` | 부호 해석, 역변환, 평면 결합과 타일 순서 복원 |

`compress()`의 모드 0·1·2와 순서 0·1 조합 중 `(0,0)`은 건너뛴다. 읽은 구현은 다섯 후보를 비교한다. `interpret_compress()`에서 모드 0은 평면 간 XOR를 생략하고, 모드 1은 두 번째 평면의 변환을 생략한다. 모드 2는 XOR와 두 평면 변환을 사용한다. 이를 근거로 단일 RLE가 원작의 전부라는 해석을 기각했다.

본문 열람으로 경로는 확인했지만 도구를 컴파일하거나 `.pic` 파일을 압축·해제하지 않았다. 출력 크기, 복원 속도, 모드별 승률은 측정 결과가 없다. 상세 분석의 RLE는 길이·값을 바이트로 쓰는 자작 비교 모델이며 이 도구의 2비트 묶음 부호와 다르다.

## 같은 영상에 있던 별도 쟁점 복구

### 조우 확률

2026-09-23 요약에는 슬롯 확률의 합이라는 결론만 있었다. 이번에는 [WildMonEncounterSlotChances](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/data/wild/probabilities.asm)와 [MtMoon1FWildMons](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/data/wild/maps/MtMoon1F.asm)를 읽어 근거를 보강했다. 슬롯 가중치는 `51,51,39,25,25,25,13,13,11,3`이고 합은 256이다. 1층의 주뱃이 들어 있는 슬롯을 합하면 `202/256=78.90625%`다. 이는 균등한 8비트 추첨을 가정한 슬롯 표 계산으로 직접 합산했으며 실제 조우 표본을 측정하지 않았다.

영상 자막의 78%를 달맞이산 전체의 확정값으로 옮기지 않는다. [B1F](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/data/wild/maps/MtMoonB1F.asm), [B2F](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/data/wild/maps/MtMoonB2F.asm)는 배치가 다르며, 실제 이동 중 조우 확률에는 조우 발생·억제 조건도 들어간다. 이번에는 층별 테이블과 [LoadWildData](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/engine/overworld/wild_mons.asm)까지 읽었다. 추가 교차검토에서는 [TryDoWildEncounter](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/engine/battle/wild_encounters.asm)의 `.CanEncounter`, `.determineEncounterSlot`, `.gotWildEncounterType` 뒤 조건도 읽었다. 이 경로는 조우 발생을 먼저 정하고 슬롯을 고른 뒤 스프레이와 선두 레벨에 따라 선택한 후보를 거부할 수 있다. 따라서 78.90625%는 균등 슬롯 추첨 단계의 종 구성 계산이며 실제 발생한 모든 전투 중 주뱃 비율을 보장하지 않는다. 난수 분포·전체 실행 경로 검증은 남아 있다. 이 주제는 공통 레벨 압축과 별도다.

### 음악과 울음소리

[Music_TitleScreen_Ch1](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/audio/music/titlescreen.asm) 앞부분의 음표·옥타브·음색 설정과 반복 호출 명령을 확인했다. [음악 헤더](https://github.com/pret/pokered/blob/d2704a63c26f9ba046ade877445216b3de0519a4/audio/headers/musicheaders1.asm)에는 곡별 채널과 명령열 연결이 있다. 따라서 곡을 제어 명령으로 표현한다는 설명은 채택한다. 모든 음악이 네 채널을 항상 점유한다는 해석은 하지 않는다.

[Pan Docs Audio의 Architecture](https://github.com/gbdev/pandocs/blob/0edc96012625b16d275674fea4f36aa6b0bb1d45/src/Audio.md#architecture)는 펄스 채널 둘, 사용자 파형 채널, 잡음 채널을 설명한다. 소리 전체를 장시간 PCM으로 저장하는 것과 짧은 파형 데이터를 두는 것은 다르므로, 파형 데이터가 전혀 없다는 표현은 쓰지 않는다. 작성 단계에서 호스팅 본문이 403이어서 공개 저장소 원문을 읽었다.

타이틀 음악 19.9MB, 45곡, 기본 울음소리 38종, 높낮이 변경만으로 모든 울음소리를 구성한다는 세부 수치는 보류한다. 비교 음원의 샘플레이트·길이·채널 수와 실제 저장 명령 크기, 울음소리 테이블·엔진 경로를 대조하지 않았기 때문이다. 음악 청취, 음원 생성과 용량 측정도 미실행이다.

## 교정 사항과 남은 질문

| 쟁점 | 현재 판단 | 추가로 필요한 근거 |
| --- | --- | --- |
| 40비트 대 64비트 | 구분자 포함 3마리 예에서 성립 | 전체 데이터 절감은 실제 대상·헤더·예외 총량 필요 |
| 8비트 CPU는 255까지만 처리 | 부정확한 일반화 | 기기 전체 사양 수치를 넣을 경우 CPU 명세 별도 검토 |
| 비트 평면 분리 자체가 압축 | 정보량과 배치 변경 혼동 | 자작 이미지로 변환별 크기·복원 전수 비교 |
| 흰색이 많으면 반드시 작음 | 색 인덱스·변환·부호 비용을 생략 | 동일 포맷에서 단색·잡음·그림 및 헤더 포함 비교 |
| 단순 RLE가 원 압축 전체 | 재구성 도구와 불일치 | 정확 재현이 필요하면 고정 리비전 도구의 왕복 실행 |
| 범용 압축으로 현대 포맷 교체 | 기존 후속 조사의 비교 후보 유지 | 대상 장치, 저장·해제·GPU 업로드 비용을 따로 측정 |

기존 조사에서 제안한 LZ4·Zstandard는 후속 비교 후보라는 맥락만 보존한다. 이번에는 두 프로젝트의 현재 기능·성능을 조사하지 않았으므로 추천 순위나 수치 근거로 사용하지 않는다. 이 문서에서 완료한 것은 자료 대조와 설명 예의 산술 확인이며 실제 원작 구현·성능 검증은 남아 있다.
