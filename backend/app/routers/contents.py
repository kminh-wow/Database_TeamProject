from fastapi import APIRouter, HTTPException, Depends
from app.schemas.course import ContentsResponse
from app.services import ai_service
from app.dependencies import get_admin_user

router = APIRouter(prefix="/api", tags=["Contents"])


@router.get("/courses/{course_id}/contents", response_model=ContentsResponse)
def get_contents(course_id: str):
    """과목별 콘텐츠 조회 (캐시 우선, 없으면 빈 결과 반환)"""
    try:
        return ai_service.get_contents_for_course(course_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"콘텐츠 추천 오류: {str(e)}")


@router.delete("/contents/all", status_code=200)
def reset_all_ai_contents(_user=Depends(get_admin_user)):
    """전체 AI 추천 콘텐츠 캐시 일괄 초기화 (관리자 전용)"""
    deleted = ai_service.delete_all_ai_contents()
    return {"deleted": deleted}


@router.delete("/courses/{course_id}/contents", status_code=200)
def reset_ai_contents(course_id: str, _user=Depends(get_admin_user)):
    """AI 추천 콘텐츠 캐시 초기화 (관리자 전용)"""
    deleted = ai_service.delete_cached_contents(course_id)
    return {"course_id": course_id, "deleted": deleted}
