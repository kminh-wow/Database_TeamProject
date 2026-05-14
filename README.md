# CourseNest

숭실대학교 IT학과 커리큘럼을 그래프로 시각화하고, 과목별 학습 자료를 추천하는 서비스

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React, Vite, React Flow, Axios, Tailwind CSS |
| Backend | FastAPI, Python 3.13, uvicorn |
| Database | Neo4j Aura (Graph DB) |
| AI | Anthropic Claude |
| 배포 | Firebase Hosting (FE), Firebase Auth |

---

## 프로젝트 구조

```
Database_TeamProject/
├── frontend/       # React 프론트엔드
└── backend/        # FastAPI 백엔드
    ├── app/
    │   ├── main.py
    │   ├── database.py
    │   ├── routers/
    │   ├── services/
    │   └── schemas/
    ├── requirements.txt
    └── .env.example
```

---

## 백엔드 실행

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# .env.example 복사 후 .env 작성
cp .env.example .env

uvicorn app.main:app --reload
```

API 문서 → `http://127.0.0.1:8000/docs`

---

## 주요 API

**Courses**

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/departments` | 학과 목록 |
| GET | `/api/curriculum/{department_name}` | 커리큘럼 그래프 (React Flow) |
| GET | `/api/courses` | 과목 검색 (`?search=키워드`) |
| GET | `/api/courses/{course_id}` | 과목 상세 |

**Resources** (인증 필요)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/courses/{course_id}/resources` | 학습 자료 목록 (좋아요 순) |
| POST | `/api/courses/{course_id}/resources` | 학습 자료 등록 |
| DELETE | `/api/resources/{content_id}` | 학습 자료 삭제 (등록자 본인) |
| POST | `/api/resources/{content_id}/feedback` | 좋아요 / 싫어요 |

**Contents (AI 추천)**

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/courses/{course_id}/contents` | AI 추천 콘텐츠 (캐시 우선) |
| DELETE | `/api/courses/{course_id}/contents` | AI 추천 캐시 초기화 |

**Folders** (인증 필요)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/folders` | 내 폴더 목록 |
| POST | `/api/folders` | 폴더 생성 |
| PATCH | `/api/folders/{folder_id}` | 폴더 이름 변경 |
| DELETE | `/api/folders/{folder_id}` | 폴더 삭제 |
| GET | `/api/folders/{folder_id}/items` | 폴더 내 자료 목록 |
| POST | `/api/folders/{folder_id}/items` | 폴더에 자료 추가 |
| DELETE | `/api/folders/{folder_id}/items/{content_id}` | 폴더에서 자료 제거 |

---

## 브랜치 전략

| 브랜치 | 용도 |
|--------|------|
| `main` | 최종 배포용 |
| `dev` | 통합 개발용 |
| `feature/be-xxx` | 백엔드 기능 개발 |
| `feature/fe-xxx` | 프론트 기능 개발 |

1. `main`, `dev` 직접 push ❌
2. 각자 `feature/` 브랜치에서 작업
3. 완료 → `dev` 로 PR → merge
4. 최종 → `main` 으로 merge

---

모르면 AI한테 물어봅시다 !!
