import uuid
from datetime import datetime
from app.database import get_session
from app.schemas.course import ResourceItem, ResourceCreateRequest, FeedbackResponse


def get_resources(course_id: str) -> list[ResourceItem]:
    """과목의 자료 목록 조회 (좋아요 많은 순)"""
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            RETURN ct
            ORDER BY ct.like_count DESC
            """,
            course_id=course_id,
        )
        return [
            ResourceItem(
                content_id=r["ct"]["content_id"],
                title=r["ct"]["title"],
                url=r["ct"]["url"],
                type=r["ct"]["type"],
                source=r["ct"].get("source", "user"),
                like_count=r["ct"].get("like_count", 0),
                dislike_count=r["ct"].get("dislike_count", 0),
            )
            for r in result
        ]


def create_resource(course_id: str, data: ResourceCreateRequest) -> ResourceItem:
    """자료 등록 - Content 노드 생성 후 과목과 연결"""
    content_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    with get_session() as session:
        # 과목 존재 확인
        check = session.run(
            "MATCH (c:Course {courseId: $course_id}) RETURN c",
            course_id=course_id,
        )
        if not check.single():
            raise ValueError(f"course_id '{course_id}' 를 찾을 수 없습니다.")

        session.run(
            """
            MATCH (c:Course {courseId: $course_id})
            CREATE (ct:Content {
                content_id: $content_id,
                title: $title,
                url: $url,
                type: $type,
                source: 'user',
                like_count: 0,
                dislike_count: 0,
                created_at: $created_at
            })
            CREATE (c)-[:HAS_CONTENT]->(ct)
            """,
            course_id=course_id,
            content_id=content_id,
            title=data.title,
            url=data.url,
            type=data.type,
            created_at=now,
        )

    return ResourceItem(
        content_id=content_id,
        title=data.title,
        url=data.url,
        type=data.type,
        source="user",
        like_count=0,
        dislike_count=0,
    )


def add_feedback(content_id: str, action: str) -> FeedbackResponse:
    """좋아요 / 싫어요 카운트 업데이트"""
    if action not in ("like", "dislike"):
        raise ValueError("action은 'like' 또는 'dislike' 이어야 합니다.")

    field = "like_count" if action == "like" else "dislike_count"

    with get_session() as session:
        result = session.run(
            f"""
            MATCH (ct:Content {{content_id: $content_id}})
            SET ct.{field} = coalesce(ct.{field}, 0) + 1
            RETURN ct.like_count AS like_count, ct.dislike_count AS dislike_count
            """,
            content_id=content_id,
        )
        record = result.single()
        if not record:
            raise ValueError(f"content_id '{content_id}' 를 찾을 수 없습니다.")

        return FeedbackResponse(
            content_id=content_id,
            like_count=record["like_count"],
            dislike_count=record["dislike_count"],
        )
