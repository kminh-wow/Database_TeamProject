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
            RETURN ct.title AS title, ct.url AS url, ct.type AS type
            """,
            course_id=course_id,
        )
        records = list(result)
        if not records:
            return None
        return [ContentItem(title=r["title"], url=r["url"], type=r["type"]) for r in records]


def _save_contents_to_neo4j(course_id: str, contents: list[ContentItem]) -> None:
    now = datetime.utcnow().isoformat()
    with get_session() as session:
        for item in contents:
            session.run(
                """
                MATCH (c:Course {courseId: $course_id})
                MERGE (ct:Content {url: $url})
                ON CREATE SET ct.content_id = $content_id,
                              ct.source = 'ai',
                              ct.like_count = 0,
                              ct.dislike_count = 0,
                              ct.created_at = $now
                SET ct.title = $title, ct.type = $type, ct.generated_at = $now
                MERGE (c)-[:HAS_CONTENT]->(ct)
                """,
                course_id=course_id,
                content_id=str(uuid.uuid4()),
                url=item.url,
                title=item.title,
                type=item.type,
                now=now,
            )


def _call_ai(course_name: str, description: str | None) -> list[ContentItem]:
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

    data = json.loads(raw)
    return [ContentItem(**item) for item in data]


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

    contents = _call_ai(course_name, description)
    _save_contents_to_neo4j(course_id, contents)

    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=contents,
        cached=False,
    )
