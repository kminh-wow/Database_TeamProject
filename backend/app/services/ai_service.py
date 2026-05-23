import os
import re
import html
import json
import time
import uuid
import threading
from datetime import datetime
import httpx
from groq import Groq, RateLimitError
from app.database import get_session
from app.schemas.course import ContentItem, ContentsResponse

MODEL = "llama-3.1-8b-instant"
_MIN_DURATION_SEC = 180  # 3분 미만 영상 제거

_client: Groq | None = None
_course_locks: dict[str, threading.Lock] = {}
_course_locks_mutex = threading.Lock()

# 화이트리스트 무시 - 절대 통과 불가
_HARD_SPAM = re.compile(
    r"자격증|합격|학원|국비|학점은행|독학사|수능|입시|수시|정시|입결"
    r"|고1|고2|고3|중학교|중학생|고등학생|초등학생"
    r"|과외|경시대회|과학고|영재고"
    r"|취준|취직|공무원|사교육|인강"
    r"|부트캠프|내일배움카드|내일배움|국가기간|무료수강|취업연계"
)
# 화이트리스트로 면제 가능
_SOFT_SPAM = re.compile(
    r"특강|캡스톤|오리엔테이션|방통대|편입|프로모션|할인|수강신청"
)


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


def _parse_duration_seconds(iso_duration: str) -> int:
    """ISO 8601 duration → 초 변환. PT4M30S → 270"""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return 0
    h = int(match.group(1) or 0)
    m = int(match.group(2) or 0)
    s = int(match.group(3) or 0)
    return h * 3600 + m * 60 + s


def _extract_keywords_ai(course_name: str, description: str | None) -> list[str]:
    """Groq로 과목 개요 분석 → YouTube 검색어 3개 추출 (CoT 방식)"""
    if not description:
        return []

    prompt = f"""[과목명]: {course_name}
[개요]: {description}

위 대학 전공 과목의 개요를 읽고, 학부생이 중간/기말고사를 대비하기 위해 찾아볼 법한 \
'순수 학술적 핵심 개념(이론, 알고리즘, 법칙 등)' 3가지만 추출해.

[절대 금지 규칙]
- '강의', '특강', '세미나', '캠페인', '프로젝트', '오리엔테이션', '수업' 같은 행위나 행사 관련 명사는 절대 포함하지 말 것.
- 반드시 학문적인 전문 용어(개념) 위주로 뽑을 것.
- 과목명 자체는 포함하지 말 것. 개념어만.

JSON 문자열 배열만 반환 (설명 없이):
["개념1", "개념2", "개념3"]"""

    for attempt in range(3):
        try:
            response = _get_client().chat.completions.create(
                model=MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
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
        except Exception as e:
            print(f"[키워드 추출 오류] {e}", flush=True)
            return []
    else:
        return []

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        keywords = json.loads(raw)
        if isinstance(keywords, list):
            return [k.strip() for k in keywords if isinstance(k, str) and k.strip()][:3]
    except json.JSONDecodeError:
        pass
    return []


def _youtube_get_videos_with_duration(video_ids: list[str], api_key: str) -> list[dict]:
    """videos.list로 duration 포함 상세 정보 조회 (1 unit)"""
    try:
        r = httpx.get(
            "https://www.googleapis.com/youtube/v3/videos",
            params={
                "part": "contentDetails,snippet",
                "id": ",".join(video_ids),
                "key": api_key,
            },
            timeout=10,
        )
        if r.status_code != 200:
            return []
        return r.json().get("items", [])
    except Exception:
        return []


def _youtube_search(query: str, api_key: str, max_results: int = 5) -> list[str]:
    """search.list → video_id 목록 반환 (100 units)"""
    try:
        r = httpx.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": max_results,
                "relevanceLanguage": "ko",
                "key": api_key,
            },
            timeout=10,
        )
        if r.status_code != 200:
            return []
        return [
            item["id"]["videoId"]
            for item in r.json().get("items", [])
            if item.get("id", {}).get("videoId")
        ]
    except Exception:
        return []


def _pick_videos_by_duration(items: list[dict], seen_ids: set, limit: int = 1) -> list[dict]:
    """duration >= 3분 필터 후 최대 limit개 반환"""
    result = []
    for item in items:
        video_id = item.get("id", "")
        if video_id in seen_ids:
            continue
        duration_str = item.get("contentDetails", {}).get("duration", "PT0S")
        if _parse_duration_seconds(duration_str) < _MIN_DURATION_SEC:
            continue
        title = item.get("snippet", {}).get("title", "")
        if video_id and title:
            result.append({
                "title": title,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "type": "youtube",
            })
        if len(result) >= limit:
            break
    return result


def _fetch_youtube_videos(course_name: str, keywords: list[str] = [], populate_mode: bool = False) -> list[dict]:
    """
    populate_mode=True : YouTube 1회 호출 (100 units), 최대 2개
    populate_mode=False: YouTube 3회 호출 (300 units), 키워드별 1개씩
    """
    api_key = os.getenv("YOUTUBE_API_KEY", "")
    if not api_key:
        return []

    fallback_queries = [
        f"{course_name} 개념 정리",
        f"{course_name} 튜토리얼",
        f"{course_name} 설명",
    ]
    # Groq 키워드는 순수 개념어 → 과목명 앞에 붙여서 검색
    queries = [f"{course_name} {kw}" for kw in keywords] if keywords else fallback_queries

    if populate_mode:
        video_ids = _youtube_search(queries[0], api_key, max_results=5)
        if not video_ids:
            return []
        items = _youtube_get_videos_with_duration(video_ids, api_key)
        return _pick_videos_by_duration(items, set(), limit=2)
    else:
        result = []
        seen_ids: set[str] = set()
        for q in queries[:3]:
            video_ids = _youtube_search(q, api_key, max_results=5)
            if not video_ids:
                continue
            items = _youtube_get_videos_with_duration(
                [vid for vid in video_ids if vid not in seen_ids], api_key
            )
            picked = _pick_videos_by_duration(items, seen_ids, limit=1)
            for v in picked:
                seen_ids.add(v["url"].split("v=")[-1])
                result.append(v)
        return result


def _fetch_naver_blogs(course_name: str, keywords: list[str] = []) -> list[dict]:
    client_id = os.getenv("NAVER_CLIENT_ID", "")
    client_secret = os.getenv("NAVER_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        return []

    # 과목명 + 첫 번째 개념어 조합으로 검색 (순수 개념어만 검색하면 너무 일반적)
    query = f"{course_name} {keywords[0]}" if keywords else f"{course_name} 개념"

    try:
        r = httpx.get(
            "https://openapi.naver.com/v1/search/blog",
            params={"query": query, "display": 8, "sort": "sim"},
            headers={"X-Naver-Client-Id": client_id, "X-Naver-Client-Secret": client_secret},
            timeout=10,
        )
        if r.status_code != 200:
            return []
        result = []
        for item in r.json().get("items", []):
            title = re.sub(r"<[^>]+>", "", html.unescape(item.get("title", "")))
            desc = re.sub(r"<[^>]+>", "", html.unescape(item.get("description", "")))
            link = item.get("link", "")
            if not title or not link:
                continue
            # 화이트리스트: Groq 개념 키워드가 title/desc에 있으면 스팸 필터 면제
            text = title + " " + desc
            whitelisted = keywords and any(kw in text for kw in keywords if len(kw) >= 5)
            if _HARD_SPAM.search(text):
                continue
            if not whitelisted and _SOFT_SPAM.search(text):
                continue
            result.append({"title": title, "url": link, "type": "blog"})
            if len(result) >= 3:
                break
        return result
    except Exception:
        return []


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
    """캐시된 콘텐츠 반환. 없으면 빈 결과 (on-demand 생성 없음 - populate 스크립트 사용)."""
    with get_session() as session:
        result = session.run(
            "MATCH (c:Course {courseId: $course_id}) RETURN c.nameKr AS name",
            course_id=course_id,
        )
        record = result.single()
        if not record:
            raise ValueError(f"course_id '{course_id}' 를 찾을 수 없습니다.")
        course_name = record["name"]

    cached = _fetch_cached_contents(course_id)
    if cached:
        return ContentsResponse(
            course_id=course_id,
            course_name=course_name,
            contents=cached,
            cached=True,
        )
    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=[],
        cached=False,
    )


def generate_contents_for_course(
    course_id: str,
    populate_mode: bool = True,
    naver_only: bool = False,
) -> ContentsResponse:
    """populate 스크립트 전용: 새 파이프라인으로 콘텐츠 생성 및 캐싱.

    naver_only=True: YouTube 생략, Naver만 (Phase 1 - 전체 빠르게 채우기)
    naver_only=False: YouTube + Naver 모두 (Phase 2 - 품질 완성)
    """
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

    with _get_course_lock(course_id):
        cached = _fetch_cached_contents(course_id)
        if cached:
            return ContentsResponse(
                course_id=course_id,
                course_name=course_name,
                contents=cached,
                cached=True,
            )

        keywords = _extract_keywords_ai(course_name, description)
        raw = [] if naver_only else _fetch_youtube_videos(course_name, keywords, populate_mode=populate_mode)
        raw += _fetch_naver_blogs(course_name, keywords)
        contents = _save_and_return_contents(course_id, raw)

    return ContentsResponse(
        course_id=course_id,
        course_name=course_name,
        contents=contents,
        cached=False,
    )
