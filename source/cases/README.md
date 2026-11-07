# 제조 AI 활용 사례 찾기 (docs/cases)

공개 주소: https://salesguy11.github.io/worksai-deck/cases/

## 파일
- final.json: 고객용으로 다시 쓴 사례 데이터(고객사명·성과 수치 없음)
- template.html: 페이지 틀
- cover.jpg: 상단 배경(제안서 표지 배경 축소본)
- build.py: final.json + template.html → docs/cases/index.html

## 매월 갱신
1. 새 사례를 final.json에 추가한다(같은 필드, No는 이어서). 고객사명·수치 금지 규칙을 지킨다.
2. `python3 source/cases/build.py 2026.12.05` (인자 = 상단·하단에 표시할 업데이트 일자)
3. 화면 확인 후 커밋·푸시. 공개 페이지이므로 푸시 전 사람 승인.
