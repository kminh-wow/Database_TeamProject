from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import close_driver
from app.routers import courses, contents


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_driver()


app = FastAPI(
    title="한입커리 API",
    description="숭실대 IT학과 커리큘럼 그래프 + AI 콘텐츠 추천",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(contents.router)


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "한입커리 API"}
