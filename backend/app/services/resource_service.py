import uuid
from datetime import datetime
from app.database import get_session
from app.firebase import get_firestore
from app.schemas.course import ResourceItem, ResourceCreateRequest, FeedbackResponse


def get_resources(course_id: str) -> list[ResourceItem]:
    """과목의 사용자 자료 목록 조회 (좋아요 많은 순)"""
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            WHERE ct.source = 'user'
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
                source="user",
                description=r["ct"].get("description"),
                like_count=r["ct"].get("like_count", 0),
                dislike_count=r["ct"].get("dislike_count", 0),
                created_at=r["ct"].get("created_at"),
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
        created_at=now,
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

    # Firestore 트랜잭션으로 중복 투표 원자적 방지
    prev_action = None

    @firestore.transactional
    def _check_and_set(txn):
        nonlocal prev_action
        snapshot = feedback_ref.get(transaction=txn)
        prev = snapshot.to_dict().get("action") if snapshot.exists else None
        if prev == action:
            raise ValueError(f"이미 {action}를 눌렀습니다.")
        txn.set(feedback_ref, {"action": action, "updated_at": datetime.utcnow().isoformat()})
        prev_action = prev

    _check_and_set(db.transaction())

    with get_session() as session:
        if prev_action:
            result = session.run(
                """
                MATCH (ct:Content {content_id: $content_id})
                SET ct.like_count    = coalesce(ct.like_count, 0)    + $like_delta,
                    ct.dislike_count = coalesce(ct.dislike_count, 0) + $dislike_delta
                RETURN ct.like_count AS like_count, ct.dislike_count AS dislike_count
                """,
                content_id=content_id,
                like_delta=1 if action == "like" else -1,
                dislike_delta=1 if action == "dislike" else -1,
            )
        else:
            result = session.run(
                """
                MATCH (ct:Content {content_id: $content_id})
                SET ct.like_count    = coalesce(ct.like_count, 0)    + $like_delta,
                    ct.dislike_count = coalesce(ct.dislike_count, 0) + $dislike_delta
                RETURN ct.like_count AS like_count, ct.dislike_count AS dislike_count
                """,
                content_id=content_id,
                like_delta=1 if action == "like" else 0,
                dislike_delta=1 if action == "dislike" else 0,
            )

        record = result.single()
        if not record:
            raise ValueError(f"content_id '{content_id}' 를 찾을 수 없습니다.")

    return FeedbackResponse(
        content_id=content_id,
        like_count=record["like_count"],
        dislike_count=record["dislike_count"],
    )
