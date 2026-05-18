import os
import re
import json
import time
import uuid
import threading
from datetime import datetime
from urllib.parse import urlparse
import httpx
from groq import Groq, RateLimitError
from app.database import get_session
from app.schemas.course import ContentItem, ContentsResponse

MODEL = "llama-3.1-8b-instant"

_client: Groq | None = None
_course_locks: dict[str, threading.Lock] = {}
_course_locks_mutex = threading.Lock()


def _get_course_lock(course_id: str) -> threading.Lock:
    with _course_locks_mutex:
        if course_id not in _course_locks:
            _course_locks[course_id] = threading.Lock()
        return _course_locks[course_id]


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
                   ct.type AS type, ct.like_count AS like_count, ct.dislike_count AS dislike_count,
                   ct.created_at AS created_at
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
                created_at=r["created_at"],
            )
            for r in records
        ]


def _save_and_return_contents(course_id: str, raw_items: list[dict]) -> list[ContentItem]:
    if not raw_items:
        return []
    now = datetime.utcnow().isoformat()
    items_with_ids = [
        {
            "content_id": str(uuid.uuid4()),
            "title": item["title"],
            "url": item["url"],
            "type": item["type"],
        }
        for item in raw_items
    ]
    with get_session() as session:
        session.run(
            """
            UNWIND $items AS item
            MATCH (c:Course {courseId: $course_id})
            CREATE (ct:Content {
                content_id: item.content_id,
                title: item.title,
                url: item.url,
                type: item.type,
                source: 'ai',
                like_count: 0,
                dislike_count: 0,
                created_at: $now,
                generated_at: $now
            })
            CREATE (c)-[:HAS_CONTENT]->(ct)
            """,
            course_id=course_id,
            items=items_with_ids,
            now=now,
        )
    return [
        ContentItem(
            content_id=item["content_id"],
            title=item["title"],
            url=item["url"],
            type=item["type"],
            source="ai",
            like_count=0,
            dislike_count=0,
            created_at=now,
        )
        for item in items_with_ids
    ]


_INVALID_URL_PATTERNS = re.compile(
    r"example\.|placeholder|sample\.|test\.|dummy|localhost|\.\.\.|\.\.\.|/\.\.\."
)
_YOUTUBE_PATTERN = re.compile(
    r"(youtube\.com/watch\?v=[\w\-]{11}|youtu\.be/[\w\-]{11})"
)


_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; CourseNest/1.0)"}
_DEAD_STATUSES = {404, 410, 451}


def _url_alive(item: dict, course_name: str = "", course_name_en: str = "") -> bool:
    url = item.get("url", "")
    type_ = item.get("type", "")
    try:
        if type_ == "youtube":
            r = httpx.get(
                f"https://www.youtube.com/oembed?url={url}&format=json",
                timeout=5, follow_redirects=True, headers=_HEADERS,
            )
            if r.status_code != 200:
                return False
            # 영문명 키워드(2자 이상)로 영상 제목 관련성 확인, 없으면 한국어명 사용
            video_title = r.json().get("title", "").lower()
            name_for_check = course_name_en or course_name
            keywords = [w for w in name_for_check.lower().split() if len(w) > 1]
            if keywords and not any(kw in video_title for kw in keywords):
                return False
            return True
        else:
            r = httpx.head(url, timeout=5, follow_redirects=True, headers=_HEADERS)
            if r.status_code == 405:
                r = httpx.get(url, timeout=5, follow_redirects=True, headers=_HEADERS)
            return r.status_code not in _DEAD_STATUSES
    except Exception:
        return False


def _is_valid_item(item: dict) -> bool:
    url = item.get("url", "")
    title = item.get("title", "")
    type_ = item.get("type", "")

    if not title or not url or type_ not in ("youtube", "blog"):
        return False

    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            return False
    except Exception:
        return False

    if _INVALID_URL_PATTERNS.search(url):
        return False

    if type_ == "youtube" and not _YOUTUBE_PATTERN.search(url):
        return False

    return True


def _call_ai(course_name: str, description: str | None, course_name_en: str = "") -> list[dict]:
    prompt = f"""다음 대학 교과목에 적합한 학습 콘텐츠를 추천해줘.

교과목명: {course_name}
개요: {description or "없음"}

규칙:
- youtube: 반드시 https://www.youtube.com/watch?v=XXXXXXXXXXX 형식 (11자리 ID), 실제 존재하는 영상만
- blog: 티스토리, velog, naver blog, medium, dev.to 등 실제 접근 가능한 기술 블로그 포스트
- 가상·예시·플레이스홀더 URL 절대 금지
- 한국어 학습자에게 유용한 자료 우선

아래 JSON 배열 형식으로만 응답해. 다른 텍스트 없이 JSON만:
[
  {{"title": "콘텐츠 제목", "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX", "type": "youtube"}},
  {{"title": "콘텐츠 제목", "url": "https://velog.io/@someone/post-title", "type": "blog"}}
]

type은 "youtube", "blog" 중 하나. 총 2~4개 추천."""

    for attempt in range(5):
        try:
            response = _get_client().chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                timeout=30,
            )
            break
        except RateLimitError as e:
            wait = 90
            match = re.search(r"try again in (\d+)m([\d.]+)s", str(e))
            if match:
                wait = int(match.group(1)) * 60 + float(match.group(2)) + 5
            print(f"[Rate limit] {int(wait)}초 대기 후 재시도...", flush=True)
            time.sleep(wait)
    else:
        return []
    raw = response.choices[0].message.content.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(items, list):
        return []
    format_ok = [item for item in items if _is_valid_item(item)]
    return [item for item in format_ok if _url_alive(item, course_name, course_name_en)]


def delete_all_ai_contents() -> int:
    with get_session() as session:
        count_result = session.run(
            "MATCH (ct:Content {source: 'ai'}) RETURN count(ct) AS cnt"
        )
        cnt = count_result.single()["cnt"]
        if cnt > 0:
            session.run("MATCH (ct:Content {source: 'ai'}) DETACH DELETE ct")
        return cnt


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
            "MATCH (c:Course {courseId: $course_id}) RETURN c.nameKr AS name, c.nameEn AS name_en, c.descKr AS description",
            course_id=course_id,
        )
        record = result.single()
        if not record:
            raise ValueError(f"course_id '{course_id}' 를 찾을 수 없습니다.")
        course_name = record["name"]
        course_name_en = record.get("name_en") or ""
        description = record.get("description")

    with _get_course_lock(course_id):
        cached = _fetch_cached_contents(course_id)
        if cached:
            return ContentsResponse(
                course_id=course_id,
                course_name=course_name,
                contents=cached,
                cached=True,
            )

        raw = _call_ai(course_name, description, course_name_en)
        contents = _save_and_return_contents(course_id, raw)

    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=contents,
        cached=False,
    )
