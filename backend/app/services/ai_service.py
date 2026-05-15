import os
import json
import uuid
from datetime import datetime
from groq import Groq
from app.database import get_session
from app.schemas.course import ContentItem, ContentsResponse

MODEL = "llama-3.3-70b-versatile"

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


def _fetch_cached_contents(course_id: str) -> list[ContentItem] | None:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            WHERE ct.source = 'ai'
            RETURN ct.content_id AS content_id, ct.title AS title, ct.url AS url,
                   ct.type AS type, ct.like_count AS like_count, ct.dislike_count AS dislike_count
            """,
            course_id=course_id,
        )
        records = list(result)
        if not records:
            return None
        return [
            ContentItem(
                content_id=r["content_id"],
                title=r["title"],
                url=r["url"],
                type=r["type"],
                source="ai",
                like_count=r["like_count"] or 0,
                dislike_count=r["dislike_count"] or 0,
            )
            for r in records
        ]


def _save_and_return_contents(course_id: str, raw_items: list[dict]) -> list[ContentItem]:
    now = datetime.utcnow().isoformat()
    saved: list[ContentItem] = []
    with get_session() as session:
        for item in raw_items:
            content_id = str(uuid.uuid4())
            session.run(
                """
                MATCH (c:Course {courseId: $course_id})
                CREATE (ct:Content {
                    content_id: $content_id,
                    title: $title,
                    url: $url,
                    type: $type,
                    source: 'ai',
                    like_count: 0,
                    dislike_count: 0,
                    created_at: $now,
                    generated_at: $now
                })
                CREATE (c)-[:HAS_CONTENT]->(ct)
                """,
                course_id=course_id,
                content_id=content_id,
                title=item["title"],
                url=item["url"],
                type=item["type"],
                now=now,
            )
            saved.append(ContentItem(
                content_id=content_id,
                title=item["title"],
                url=item["url"],
                type=item["type"],
                source="ai",
                like_count=0,
                dislike_count=0,
            ))
    return saved


def _call_ai(course_name: str, description: str | None) -> list[dict]:
    prompt = f"""다음 대학 교과목에 적합한 학습 콘텐츠를 추천해줘.

교과목명: {course_name}
개요: {description or "없음"}

아래 JSON 배열 형식으로만 응답해. 다른 텍스트 없이 JSON만:
[
  {{"title": "콘텐츠 제목", "url": "https://...", "type": "youtube"}},
  {{"title": "콘텐츠 제목", "url": "https://...", "type": "blog"}},
  {{"title": "콘텐츠 제목", "url": "https://...", "type": "pdf"}}
]

type은 "youtube", "blog", "pdf" 중 하나. 총 3~5개 추천."""

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    return json.loads(raw)


def delete_cached_contents(course_id: str) -> int:
    with get_session() as session:
        count_result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content {source: 'ai'})
            RETURN count(ct) AS cnt
            """,
            course_id=course_id,
        )
        cnt = count_result.single()["cnt"]
        if cnt > 0:
            session.run(
                """
                MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content {source: 'ai'})
                DETACH DELETE ct
                """,
                course_id=course_id,
            )
        return cnt


def get_contents_for_course(course_id: str) -> ContentsResponse:
    with get_session() as session:
        result = session.run(
            "MATCH (c:Course {courseId: $course_id}) RETURN c.nameKr AS name, c.descKr AS description",
            course_id=course_id,
        )
        record = result.single()
        if not record:
            raise ValueError(f"course_id '{course_id}' 를 찾을 수 없습니다.")
        course_name = record["name"]
        description = record.get("description")

    cached = _fetch_cached_contents(course_id)
    if cached:
        return ContentsResponse(
            course_id=course_id,
            course_name=course_name,
            contents=cached,
            cached=True,
        )

    raw = _call_ai(course_name, description)
    contents = _save_and_return_contents(course_id, raw)

    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=contents,
        cached=False,
    )
