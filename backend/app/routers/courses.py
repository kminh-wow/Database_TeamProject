from fastapi import APIRouter, HTTPException, Query
from app.schemas.course import DepartmentResponse, CourseResponse, CurriculumGraphResponse
from app.services import course_service

router = APIRouter(prefix="/api", tags=["Courses"])


@router.get("/departments", response_model=list[DepartmentResponse])
def list_departments():
    """학과 목록 조회"""
    try:
        return course_service.get_departments()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"학과 목록 조회 오류: {str(e)}")


@router.get("/courses", response_model=list[CourseResponse])
def search_courses(search: str = Query(..., min_length=1, description="검색 키워드")):
    """과목 이름으로 검색 (국문/영문)"""
    return course_service.search_courses(search)


@router.get("/curriculum/{department_name}", response_model=CurriculumGraphResponse)
def get_curriculum(department_name: str):
    """커리큘럼 그래프 조회 (React Flow용 nodes + edges)"""
    result = course_service.get_curriculum_graph(department_name)
    if not result.nodes:
        raise HTTPException(status_code=404, detail="학과를 찾을 수 없습니다.")
    return result


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: str):
    """과목 상세 조회"""
    course = course_service.get_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="과목을 찾을 수 없습니다.")
    return course
