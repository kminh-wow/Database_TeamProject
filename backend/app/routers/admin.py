from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.dependencies import get_admin_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class AdminContentItem(BaseModel):
    content_id: str
    title: str
    url: str
    type: str
    source: str
    course_id: str
    course_name: str
    like_count: int
    dislike_count: int
    created_at: Optional[str] = None


@router.get("/contents", response_model=list[AdminContentItem])
def list_all_contents(_user=Depends(get_admin_user)):
    """전체 콘텐츠 목록 조회 (관리자 전용)"""
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)-[:HAS_CONTENT]->(ct:Content)
            RETURN ct.content_id AS content_id,
                   ct.title AS title,
                   ct.url AS url,
                   ct.type AS type,
                   ct.source AS source,
                   ct.like_count AS like_count,
                   ct.dislike_count AS dislike_count,
                   ct.created_at AS created_at,
                   c.courseId AS course_id,
                   c.nameKr AS course_name
            ORDER BY ct.created_at DESC
            """
        )
        return [
            AdminContentItem(
                content_id=r["content_id"],
                title=r["title"],
                url=r["url"],
                type=r["type"],
                source=r["source"] or "ai",
                course_id=r["course_id"],
                course_name=r["course_name"] or "",
                like_count=r["like_count"] or 0,
                dislike_count=r["dislike_count"] or 0,
                created_at=r["created_at"],
            )
            for r in result
        ]


@router.delete("/contents/{content_id}", status_code=200)
def delete_content(content_id: str, _user=Depends(get_admin_user)):
    """콘텐츠 단건 삭제 (관리자 전용)"""
    with get_session() as session:
        result = session.run(
            "MATCH (ct:Content {content_id: $content_id}) RETURN count(ct) AS cnt",
            content_id=content_id,
        )
        if result.single()["cnt"] == 0:
            raise HTTPException(status_code=404, detail="콘텐츠를 찾을 수 없습니다.")
        session.run(
            "MATCH (ct:Content {content_id: $content_id}) DETACH DELETE ct",
            content_id=content_id,
        )
    return {"deleted": content_id}
