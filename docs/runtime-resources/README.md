# 실행 자원과 데이터 표현

반복 생성, GPU 프로그램 준비, 지역 데이터 읽기, 저장 표현, 화면 표시는 서로 다른 비용이다. 같은 끊김이나 메모리 부족처럼 보여도 원인을 나누면 무엇을 재사용하고 무엇을 먼저 준비해야 하는지 드러난다. 입력 데이터와 실행 위치의 경계가 깨져 게임 동작이 달라지는 메모리 문제도 다룬다.

**상세 분석**은 원인·계산 예·해결 조건을, **리서치**는 공개 출처·영상 시각·근거 위치와 적용 한계를 담는다.

## 문제별 문서

| 문제 | 핵심 원인과 접근 | 상세 분석 | 리서치 |
| --- | --- | --- | --- |
| 짧게 쓰는 객체를 계속 만들고 버림 | 생성·정리의 반복을 수명 관리와 재사용으로 줄임 | [오브젝트 풀](object-pooling/analysis.md) | [공식 API와 상태 초기화](object-pooling/research.md) |
| 처음 보는 효과에서만 화면이 끊김 | 필요한 렌더링 조합의 준비 누락·늦은 완료를 분리 | [셰이더·PSO 준비](pipeline-preparation/analysis.md) | [Epic·WebGL 근거](pipeline-preparation/research.md) |
| 다음 지역에 도착했는데 데이터가 없음 | 읽기·준비 시간과 메모리 교체를 이동 경로에 맞춤 | [월드 스트리밍](world-streaming/analysis.md) | [Jak and Daxter 개발자 회고](world-streaming/research.md) |
| 같은 색·무늬를 반복 저장함 | 팔레트·타일 원본을 공유하고 위치에는 번호 저장 | [인덱스 재사용](indexed-reuse/analysis.md) | [영상·PNG·타일 자료](indexed-reuse/research.md) |
| 반복 테이블과 이미지를 작게 표현해야 함 | 공통값·예외 형식과 비트 평면·압축의 복원 조건 구별 | [게임 데이터 표현](compact-game-data/analysis.md) | [포켓몬 재구성 코드](compact-game-data/research.md) |
| 같은 줄에 몰린 객체가 사라짐 | 총개수와 줄별 후보 한도를 구분하고 누락 분배 | [스캔라인 제한](scanline-limits/analysis.md) | [역사적 모델과 미확인 사양](scanline-limits/research.md) |
| 작은 그림이 확대·이동 중 달라 보임 | 작화의 색·윤곽과 출력 격자·필터·스냅을 분리 | [픽셀 아트 표시](pixel-art-rendering/analysis.md) | [영상·작가 예제·Unity 설정](pixel-art-rendering/research.md) |
| 입력값이 예상하지 못한 게임 동작으로 이어짐 | 데이터 쓰기와 실행 위치 이동을 구분하고 범위를 검사 | [입력·메모리·실행 경계](input-execution-boundary/analysis.md) | [Triforce% 제작팀 설명](input-execution-boundary/research.md) |

팔레트와 타일은 공통 데이터를 번호로 참조하는 원리가 같아 통합했다. 포켓몬의 공통 레벨 테이블과 비트 평면 압축은 저장 표현이라는 주제 안에서 별도 절로 나눴다. 스캔라인 누락은 저장 중복과 다른 문제여서 독립 문서로 두었다.

## 해석할 때 유지할 구분

- 풀의 **최대 보관량·초기 내부 용량·실제 사전 생성 수**는 다르다. 재사용은 이전 수명의 작업까지 정리해야 한다.
- 준비 요청과 완료, 완료와 성공, 캐시 재방문과 최초 실행은 다르다. 웹 프로그램을 PSO 자체로 설명하지 않는다.
- 원시 배열·팔레트·타일 원본·파일·복원 버퍼·GPU 메모리의 계산 범위를 맞춘다. NES 배치·속성 1,024바이트를 전체 원화 용량으로 쓰거나 약 70배를 채택하지 않는다.
- 트레이너의 레벨·기술 예외와 여러 바이트 표현을 보존한다. 비트 평면 분리만으로 압축이 끝나는 것은 아니다.
- 역사적 회고·커뮤니티 재구성 코드·교육 모델·실행 측정을 구별한다. NESdev의 본문 접근 제한과 미실행 검증은 해당 리서치에 남겼다.

## 수집 항목과 공개 출처

| 수집 ID | 공개 출처 | 통합한 상세 문서 |
| --- | --- | --- |
| `object-pooling` | [Unity 풀 API 설명](https://docs.unity.com/en-us/engine/6000.0/manual/scripting/optimization/performance-optimizing-code-managed-memory/reusable-code) | [오브젝트 풀](object-pooling/analysis.md) |
| `shader-stutter` | [Epic 개발팀 기술 글](https://www.unrealengine.com/tech-blog/game-engines-and-shader-stuttering-unreal-engines-solution-to-the-problem) | [셰이더·PSO 준비](pipeline-preparation/analysis.md) |
| `jak-world-streaming` | [Andy Gavin 인터뷰](https://blog.playstation.com/archive/2017/08/24/extended-play-how-naughty-dog-went-from-crash-to-jak-daxter/) | [월드 스트리밍](world-streaming/analysis.md) |
| `retro-image-compression` | [이미지 용량 영상](https://www.youtube.com/watch?v=p0mH7UAwtXQ) | [인덱스 재사용](indexed-reuse/analysis.md) |
| `pokemon-red-engineering` | [포켓몬 레드 영상](https://www.youtube.com/watch?v=SBWvydtAqJ4) | [게임 데이터 표현](compact-game-data/analysis.md); 조우·음원 쟁점은 [리서치](compact-game-data/research.md)에 보존 |
| `retro-graphics` | [고전 그래픽 영상](https://www.youtube.com/watch?v=keREBAhYErY) | [인덱스 재사용](indexed-reuse/analysis.md), [스캔라인 제한](scanline-limits/analysis.md) |
| `pixel-art` | [픽셀 아트 영상](https://www.youtube.com/watch?v=Ce5YdbY4upM) | [픽셀 아트 표시](pixel-art-rendering/analysis.md) |
| `controller-code-execution` | [컨트롤러 입력과 코드 실행](https://www.youtube.com/shorts/uj6016N96JY) | [입력·메모리·실행 경계](input-execution-boundary/analysis.md) |

공개 영상의 구간별 주장과 수집 당시의 검토 범위는 각 리서치에 요약했다. 전체 영상 재생·원작 ROM/콘솔 실행·성능 실측을 완료한 문서가 아니다.
