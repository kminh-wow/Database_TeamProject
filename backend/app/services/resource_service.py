import uuid
from datetime import datetime
from app.database import get_session
from app.firebase import get_firestore
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
                description=r["ct"].get("description"),
                like_count=r["ct"].get("like_count", 0),
                dislike_count=r["ct"].get("dislike_count", 0),
            )
            for r in result
        ]


def create_resource(course_id: str, data: ResourceCreateRequest, uid: str) -> ResourceItem:
    """자료 등록 - Content 노드 생성 후 과목과 연결"""
    content_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    with get_session() as session:
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
                description: $description,
                source: 'user',
                created_by: $uid,
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
            description=data.description,
            uid=uid,
            created_at=now,
        )

    return ResourceItem(
        content_id=content_id,
        title=data.title,
        url=data.url,
        type=data.type,
        description=data.description,
        source="user",
        like_count=0,
        dislike_count=0,
    )


def delete_resource(content_id: str, uid: str) -> None:
    """자료 삭제 - 등록자 본인만 가능"""
    with get_session() as session:
        result = session.run(
            "MATCH (ct:Content {content_id: $content_id}) RETURN ct.created_by AS created_by",
            content_id=content_id,
        )
        record = result.single()
        if not record:
            raise ValueError(f"content_id '{content_id}' 를 찾을 수 없습니다.")
        if record["created_by"] != uid:
            raise PermissionError("본인이 등록한 자료만 삭제할 수 있습니다.")

        session.run(
            "MATCH (ct:Content {content_id: $content_id}) DETACH DELETE ct",
            content_id=content_id,
        )


def add_feedback(content_id: str, action: str, uid: str) -> FeedbackResponse:
    """좋아요 / 싫어요 - 사용자별 중복 방지, 반대 의견으로 변경 가능"""
    if action not in ("like", "dislike"):
        raise ValueError("action은 'like' 또는 'dislike' 이어야 합니다.")

    db = get_firestore()
    feedback_ref = db.collection("content_feedback").document(f"{uid}_{content_id}")
    existing = feedback_ref.get()
    prev_action = existing.to_dict().get("action") if existing.exists else None

    if prev_action == action:
        raise ValueError(f"이미 {action}를 눌렀습니다.")

    with get_session() as session:
        if prev_action:
            # 이전 반응 취소 후 새 반응 적용
            prev_field = "like_count" if prev_action == "like" else "dislike_count"
            new_field = "like_count" if action == "like" else "dislike_count"
            result = session.run(
                f"""
                MATCH (ct:Content {{content_id: $content_id}})
                SET ct.{prev_field} = coalesce(ct.{prev_field}, 0) - 1,
                    ct.{new_field} = coalesce(ct.{new_field}, 0) + 1
                RETURN ct.like_count AS like_count, ct.dislike_count AS dislike_count
                """,
                content_id=content_id,
            )
        else:
            new_field = "like_count" if action == "like" else "dislike_count"
            result = session.run(
                f"""
                MATCH (ct:Content {{content_id: $content_id}})
                SET ct.{new_field} = coalesce(ct.{new_field}, 0) + 1
                RETURN ct.like_count AS like_count, ct.dislike_count AS dislike_count
                """,
                content_id=content_id,
            )

        record = result.single()
        if not record:
            raise ValueError(f"content_id '{content_id}' 를 찾을 수 없습니다.")

    feedback_ref.set({"action": action, "updated_at": datetime.utcnow().isoformat()})

    return FeedbackResponse(
        content_id=content_id,
        like_count=record["like_count"],
        dislike_count=record["dislike_count"],
    )
