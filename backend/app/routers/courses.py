from fastapi import APIRouter, HTTPException
from app.schemas.course import DepartmentResponse, CourseResponse, CurriculumGraphResponse
from app.services import course_service

router = APIRouter(prefix="/api", tags=["Courses"])


@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments():
    """학과 목록 조회"""
    return course_service.get_departments()


@router.get("/curriculum/{department_name}", response_model=CurriculumGraphResponse)
def get_curriculum(department_name: str):
    """커리큘럼 그래프 조회 (React Flow용 nodes + edges)"""
    return course_service.get_curriculum_graph(department_name)


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str):
    """과목 상세 조회"""
    course = course_service.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과목을 찾을 수 없습니다.")
    return course
