import os
import json
from datetime import datetime
import anthropic
from app.database import get_session
from app.schemas.course import ContentItem, ContentsResponse

MODEL = "claude-sonnet-4-6"

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def _fetch_cached_contents(course_id: str) -> list[ContentItem] | None:
    """Neo4j에 캐싱된 Content 노드가 있으면 반환, 없으면 None"""
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            RETURN ct.title AS title, ct.url AS url, ct.type AS type
            """,
            course_id=course_id,
        )
        records = list(result)
        if not records:
            return None
        return [ContentItem(title=r["title"], url=r["url"], type=r["type"]) for r in records]


def _save_contents_to_neo4j(course_id: str, contents: list[ContentItem]) -> None:
    """AI가 생성한 콘텐츠를 Neo4j Content 노드로 저장"""
    now = datetime.utcnow().isoformat()
    with get_session() as session:
        for item in contents:
            session.run(
                """
                MATCH (c:Course {courseId: $course_id})
                MERGE (ct:Content {url: $url})
                SET ct.title = $title, ct.type = $type, ct.generated_at = $generated_at
                MERGE (c)-[:HAS_CONTENT]->(ct)
                """,
                course_id=course_id,
                url=item.url,
                title=item.title,
                type=item.type,
                generated_at=now,
            )


def _call_ai(course_name: str, description: str | None) -> list[ContentItem]:
    """Claude API로 학습 콘텐츠 추천 요청"""
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

    message = _get_client().messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()
    # JSON 파싱
    data = json.loads(raw)
    return [ContentItem(**item) for item in data]


def get_contents_for_course(course_id: str) -> ContentsResponse:
    """캐시 확인 → 없으면 AI 호출 → Neo4j 저장 → 반환"""
    # 과목 정보 조회
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

    # 캐시 확인
    cached = _fetch_cached_contents(course_id)
    if cached:
        return ContentsResponse(
            course_id=course_id,
            course_name=course_name,
            contents=cached,
            cached=True,
        )

    # AI 호출
    contents = _call_ai(course_name, description)

    # Neo4j에 저장
    _save_contents_to_neo4j(course_id, contents)

    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=contents,
        cached=False,
    )
