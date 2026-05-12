from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import close_driver
from app.routers import courses, contents, resources
from app.dependencies import get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    close_driver()


app = FastAPI(
    title="CourseNest API",
    description="숭실대 커리큘럼 그래프 + AI 콘텐츠 추천",
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

auth_dep = [Depends(get_current_user)]

app.include_router(courses.router, dependencies=auth_dep)
app.include_router(contents.router, dependencies=auth_dep)
app.include_router(resources.router, dependencies=auth_dep)


@app.get("/", tags=["General"])
def root():
    return {"status": "ok", "service": "CourseNest API"}
