# 한입커리 (CourseNest)

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

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/departments` | 학과 목록 |
| GET | `/api/curriculum/{department_name}` | 커리큘럼 그래프 (React Flow) |
| GET | `/api/courses/{course_id}` | 과목 상세 |
| GET | `/api/courses/{course_id}/resources` | 학습 자료 목록 |
| POST | `/api/courses/{course_id}/resources` | 학습 자료 등록 |
| POST | `/api/resources/{content_id}/feedback` | 좋아요 / 싫어요 |

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
