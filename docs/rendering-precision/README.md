# 렌더링 정밀도와 평면 투영

텍스처의 무늬, 정점의 위치, 표면의 앞뒤 판정은 서로 다른 단계에서 계산된다. 비슷하게 흔들리는 화면이라도 오차가 생긴 단계에 맞춰 해결해야 한다. Mode 7은 정밀도 오류의 해결책이 아니라 평면으로 원근감을 만드는 별도 표현 기법이다.

아래 분석의 수치 예제는 설명용 계산이며 콘솔 실기·GPU 성능 측정과 구분한다.

| 문제 | 핵심 원인과 대응 | 상세 분석 | 리서치 |
| --- | --- | --- | --- |
| 비스듬한 바닥의 무늬가 휜다 | 화면의 선형 UV 보간을 원근 보정하거나 3D 면을 분할한다 | [텍스처 보간](texture-interpolation/analysis.md) | [Sony 문서와 해석](texture-interpolation/research.md) |
| 천천히 움직이는 윤곽이 뛴다 | 투영 좌표의 소수 부분을 잃는 양자화를 분리한다 | [화면 정점 정밀도](screen-coordinate-precision/analysis.md) | [GTE 명세와 교정](screen-coordinate-precision/research.md) |
| 겹친 표면의 앞뒤가 섞인다 | 깊이 매핑·저장 포맷·비교 규칙을 함께 조정한다 | [깊이 버퍼](depth-buffer/analysis.md) | [Reversed-Z와 API 조건](depth-buffer/research.md) |
| 원점에서 멀어지면 작은 이동이 사라진다 | 반올림 전에 작은 좌표로 바꾸거나 필요한 계산의 정밀도를 유지한다 | [큰 월드 좌표](large-world-coordinates/analysis.md) | [엔진 설계와 수치 근거](large-world-coordinates/research.md) |
| 평면 지도에 도로의 원근감을 주고 싶다 | 행마다 원본 지도를 읽는 위치와 간격을 다르게 계산한다 | [Mode 7과 바닥 투영](mode7-projection/analysis.md) | [영상·구현·개발자 회고](mode7-projection/research.md) |

## 원자료 대응

| 수집 ID | 상세 문서에서 다루는 범위 |
| --- | --- |
| `ps1-texture-warping` | 텍스처 보간과 화면 정점 정밀도. 같은 하드웨어 사례지만 원인이 달라 분리 |
| `depth-precision` | 깊이 버퍼와 Reversed-Z |
| `floating-origin` | 카메라 상대 렌더링·원점 이동·고정밀도 계산의 선택 |
| `mode7-graphics` | 평면 변환, 주사선별 투영, 역사 사례의 확인 범위 |

외부 출처의 정확한 위치와 채택 판단은 각 리서치에 있다.
