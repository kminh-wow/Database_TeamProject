# CourseNest

전공 커리큘럼 기반 학습 자료 큐레이션 시스템.
숭실대학교 전 학과의 교과과정을 그래프로 시각화하고, AI 추천과 학생 크라우드소싱으로 과목별 학습 자료를 제공합니다.

---

## 배경 및 동기

대학생의 81.6%가 수강신청 전 선후수 파악에 어려움을 겪고, 54.1%는 전공 학습 자료를 아예 찾지 않는다는 설문 결과(n=38)에서 출발했습니다.

전공 커리큘럼에 특화된 학습 자료가 체계적으로 제공되지 않아, 학생들이 YouTube·구글 등에서 스스로 탐색하는 과정에서 시간을 낭비하고 허위 정보에 노출되는 것이 현실입니다. CourseNest는 커리큘럼 시각화와 자료 큐레이션을 한 곳에 모아 이 문제를 해결합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React, Vite, React Flow, Axios, Tailwind CSS |
| Backend | FastAPI, Python 3.13, uvicorn |
| Database | Neo4j Aura (Graph DB), Firebase Firestore |
| 인증 | Firebase Auth (이메일 인증 게이트) |
| AI 추천 | Groq (llama-3.1-8b) + YouTube Data API v3 + Naver Blog Search API |
| 배포 | AWS EC2 (백엔드), Nginx (정적 파일 서빙) |

---

## 주요 기능

**커리큘럼 그래프 시각화**
선수과목 트리를 학년별로 시각화하고, 전필/전선 색상 구분 및 커서 올린 과목의 선후수 관계를 하이라이트로 표시합니다.

**AI 추천 자료**
과목 개요를 AI가 분석해 핵심 키워드를 추출하고, YouTube 영상과 Naver 블로그 자료를 자동 수집·스팸 필터링해 제공합니다.

**학생 자료 등록 (크라우드소싱)**
학생이 직접 URL을 등록해 과목별 자료 풀을 지속적으로 확장할 수 있습니다.

**좋아요 / 싫어요 피드백**
자료마다 피드백을 누적해 신뢰도를 반영합니다. 싫어요가 3회 이상 쌓이면 자동으로 숨김 처리됩니다.

**추천순 / 조회순 정렬**
원하는 기준으로 자료를 정렬해 탐색할 수 있습니다.

**마이 스터디 페이지**
북마크 폴더에 자료를 저장하고, 즐겨찾기한 자료를 빠르게 재접근할 수 있습니다.

---

## 프로젝트 구조

```
Database_TeamProject/
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── api/
│   │       │   ├── client.ts        # axios 인스턴스 + 인터셉터
│   │       │   ├── curriculum.ts    # 학과/커리큘럼 API
│   │       │   ├── contents.ts      # AI 추천 콘텐츠 API
│   │       │   ├── resources.ts     # 유저 자료 API
│   │       │   └── folders.ts       # 북마크 폴더 API
│   │       ├── components/
│   │       │   ├── CourseModal.tsx   # 과목 클릭 모달 (AI추천/유저자료)
│   │       │   └── FolderSelectModal.tsx
│   │       ├── context/
│   │       │   └── AppContext.tsx    # Firebase 인증 + 전역 상태
│   │       ├── pages/
│   │       │   ├── Home.tsx          # 학과 선택
│   │       │   ├── CurriculumGraph.tsx  # 선후수 그래프
│   │       │   ├── Auth.tsx          # 로그인/회원가입
│   │       │   ├── SubmitResource.tsx   # 자료 공유
│   │       │   └── MyStudyRoom.tsx   # 폴더/즐겨찾기
│   │       ├── types/
│   │       │   └── index.ts          # 공통 타입 정의
│   │       └── routes.tsx
│   ├── public/
│   ├── package.json
│   └── .env
└── backend/
    ├── app/
    │   ├── main.py
    │   ├── database.py
    │   ├── dependencies.py
    │   ├── routers/
    │   │   ├── courses.py       # 커리큘럼/과목 API
    │   │   ├── contents.py      # AI 추천 콘텐츠 API
    │   │   ├── resources.py     # 유저 등록 자료 API
    │   │   ├── folders.py       # 북마크 폴더 API
    │   │   └── admin.py         # 관리자 API
    │   ├── services/
    │   │   ├── course_service.py
    │   │   ├── ai_service.py    # AI 추천 파이프라인
    │   │   └── resource_service.py
    │   └── schemas/
    ├── populate_contents.py     # AI 콘텐츠 일괄 생성 스크립트
    ├── populate_syllabus_contents.py  # 실라버스 기반 콘텐츠 생성
    ├── export_course_contents.py      # 과목×콘텐츠 현황 CSV 출력
    ├── requirements.txt
    └── .env
```
---

## 백엔드 실행

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 작성 (아래 환경변수 섹션 참고)
uvicorn app.main:app --reload
```

API 문서 → `http://127.0.0.1:8000/docs`

---

## 프론트엔드 실행

```bash
cd frontend
npm install

# .env 작성 (아래 환경변수 섹션 참고)
npm run dev
```

---

## 백엔드 환경변수 (.env)

```
NEO4J_URI=neo4j+ssc://...
NEO4J_USERNAME=...
NEO4J_PASSWORD=...
NEO4J_DATABASE=...

GROQ_API_KEY=...
YOUTUBE_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

ADMIN_UID=...   # Firebase UID (관리자 계정)
```

---

## 프론트엔드 환경변수 (.env)

```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=coursenest-85bb4.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=coursenest-85bb4
```

---

## 주요 API

**Courses**

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/departments` | 학과 목록 |
| GET | `/api/curriculum/{department_name}` | 커리큘럼 그래프 (React Flow) |
| GET | `/api/courses` | 과목 검색 (`?search=키워드`) |
| GET | `/api/courses/{course_id}` | 과목 상세 |

**Contents (AI 추천)**

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/courses/{course_id}/contents` | AI 추천 콘텐츠 조회 | - |
| DELETE | `/api/courses/{course_id}/contents` | 과목 AI 캐시 초기화 | 관리자 |
| DELETE | `/api/contents/all` | 전체 AI 캐시 초기화 | 관리자 |

**Resources** (유저 등록 자료)

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/courses/{course_id}/resources` | 자료 목록 (좋아요 순) | - |
| POST | `/api/courses/{course_id}/resources` | 자료 등록 | 필요 |
| DELETE | `/api/resources/{content_id}` | 자료 삭제 (등록자 본인) | 필요 |
| POST | `/api/resources/{content_id}/feedback` | 좋아요 / 싫어요 | 필요 |

**Folders** (북마크)

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/folders` | 내 폴더 목록 | 필요 |
| POST | `/api/folders` | 폴더 생성 | 필요 |
| PATCH | `/api/folders/{folder_id}` | 폴더 이름 변경 | 필요 |
| DELETE | `/api/folders/{folder_id}` | 폴더 삭제 | 필요 |
| GET | `/api/folders/{folder_id}/items` | 폴더 내 자료 목록 | 필요 |
| POST | `/api/folders/{folder_id}/items` | 폴더에 자료 추가 | 필요 |
| DELETE | `/api/folders/{folder_id}/items/{content_id}` | 폴더에서 자료 제거 | 필요 |

**Admin** (관리자 전용)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/contents` | 전체 콘텐츠 목록 (`?skip=0&limit=500`) |
| DELETE | `/api/admin/contents/{content_id}` | 콘텐츠 단건 삭제 |
| DELETE | `/api/admin/contents/bulk` | 콘텐츠 일괄 삭제 |

---

## AI 콘텐츠 파이프라인

```
Groq (llama-3.1-8b)
  └─ 과목 개요 분석 → 핵심 개념 3개 추출 (검색어)
        ↓
YouTube Data API
  └─ 키워드별 검색 → duration 3분 이상 필터
Naver Blog Search API
  └─ 첫 번째 키워드 검색 → 스팸 필터 (국비/학원 등)
        ↓
Neo4j에 Content 노드로 캐싱
```

**Pre-populate 스크립트**

```bash
cd backend
source venv/bin/activate

# 전체 과목 AI 콘텐츠 일괄 생성 (캐싱된 과목은 자동 스킵)
python3 populate_contents.py

# 실라버스(강의계획서) 기반 콘텐츠 생성
python3 populate_syllabus_contents.py

# 현재 DB 콘텐츠 현황 CSV 출력
python3 export_course_contents.py
```

---

## 프론트엔드 페이지 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | 단과대학·학과 선택 |
| `/curriculum/:dept` | CurriculumGraph | 선후수 그래프 시각화 (React Flow) |
| `/auth` | Auth | 로그인·회원가입 |
| `/submit-resource` | SubmitResource | 학습 자료 공유 |
| `/study-room` | MyStudyRoom | 폴더·즐겨찾기 관리 |

---

## 팀원 역할

**강인선**
- UI 프로토타입 제작
- 프로토타입 기반 프론트엔드 전체 구현 (React + TypeScript)
- Firebase Authentication 연동 및 전역 상태 관리
- 백엔드 API 연동
- React Flow 커리큘럼 그래프 구현
- 폴더·즐겨찾기 기능 구현 (MyStudyRoom)
- 발표자료 제작

**Mariam**
- UI 디자인 참여
- 프론트엔드 개발 보조
- 발표자료 제작 참여

**강승원**
- DB 설계
- 강의계획서 등 관련 자료 탐색 및 수집
- 백엔드 개발 보조
- AI 추천 콘텐츠 품질 검수 및 데이터 확인

**김민혁**
- 백엔드 전체 구조 설계 및 구현 (FastAPI + Neo4j + Firebase)
- AI 콘텐츠 추천 파이프라인 구현 (Groq 키워드 추출 → YouTube + Naver 검색 → 스팸 필터링 → Neo4j 캐싱)
- 실라버스 기반 콘텐츠 생성 파이프라인 구현
- 유저 자료 등록·피드백(좋아요/싫어요) API 구현
- 북마크 폴더 API 구현 (Firebase Firestore)
- 관리자 API 구현 (콘텐츠 관리)
- AWS EC2 배포 환경 구성 (Nginx + systemd)
- 싫어요 누적 기반 콘텐츠 자동 숨김 구현

---

## 기대 효과

- **학업 성취도** — 맞춤형 자료 추천 시 전통적 방식 대비 시험 점수 15%↑ *(Chen, David Publishing, 2025)*
- **학습 효율성** — 커리큘럼 기반 맞춤 추천으로 코스 완료 속도 25%↑, 학습 유지율 30%↑ *(Du, SPIE, 2025)*
- **자기주도학습 지원** — Knowles SDL 모델의 "학습 자원 확인" 단계를 시스템이 대신함으로써 수강신청·시험준비·선수지식 보충에 즉시 활용 가능
- **확장 가능성** — 기초 과목(HTML·CSS·JS 등) 노드는 특정 학교에 종속되지 않아 타 대학·사이버대학으로 확장 적용 가능

---

## 배포 (EC2)

서버: `3.211.106.173` (AWS EC2 t3.micro, Ubuntu 24.04)

```bash
# EC2 접속: AWS 콘솔 → EC2 Instance Connect

cd ~/Database_TeamProject
git pull origin main

# 프론트 빌드 (변경 시)
cd frontend && npm run build
sudo cp -r dist/* /var/www/coursenest/
cd ..

# 백엔드 재시작
sudo systemctl restart coursenest
sudo systemctl status coursenest
```

