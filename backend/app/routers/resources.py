from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.schemas.course import (
    ResourceCreateRequest,
    ResourcesResponse,
    FeedbackRequest,
    FeedbackResponse,
)
from app.services import resource_service

router = APIRouter(prefix="/api", tags=["Resources"])


@router.get("/courses/{course_id}/resources", response_model=ResourcesResponse)
def get_resources(course_id: str):
    """과목 자료 목록 조회 (좋아요 많은 순)"""
    resources = resource_service.get_resources(course_id)
    return ResourcesResponse(course_id=course_id, resources=resources)


@router.post("/courses/{course_id}/resources", response_model=None, status_code=201)
def create_resource(course_id: str, body: ResourceCreateRequest, user=Depends(get_current_user)):
    """자료 등록"""
    try:
        return resource_service.create_resource(course_id, body, user["uid"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/resources/{content_id}", status_code=204)
def delete_resource(content_id: str, user=Depends(get_current_user)):
    """자료 삭제 (등록자 본인만 가능)"""
    try:
        resource_service.delete_resource(content_id, user["uid"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/resources/{content_id}/feedback", response_model=FeedbackResponse)
def add_feedback(content_id: str, body: FeedbackRequest):
    """좋아요 / 싫어요"""
    try:
        return resource_service.add_feedback(content_id, body.action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
