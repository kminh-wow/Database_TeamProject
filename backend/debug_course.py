"""특정 과목의 실라버스, Groq 키워드, YouTube 검색 결과 진단."""
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session
from app.services.ai_service import (
    _extract_keywords_ai, _youtube_search, _youtube_get_videos_with_duration,
    _pick_videos_by_duration, _parse_duration_seconds
)
import os

COURSE_NAME = "프로그래밍기초2"

with get_session() as session:
    r = session.run("""
        MATCH (c:Course {nameKr: $name})
        RETURN c.courseId AS cid, c.descKr AS desc, c.syllabusKr AS syllabus
        LIMIT 1
    """, name=COURSE_NAME)
    row = r.single()

print(f"=== 실라버스 ===")
print(row["syllabus"][:800] if row["syllabus"] else "(없음)")

print(f"\n=== Groq 키워드 추출 ===")
keywords = _extract_keywords_ai(COURSE_NAME, row["desc"], syllabus=row["syllabus"])
print(keywords)

api_key = os.getenv("YOUTUBE_API_KEY", "")
query = f"{COURSE_NAME} {keywords[0]}" if keywords else COURSE_NAME
print(f"\n=== YouTube 검색 쿼리: '{query}' ===")
video_ids = _youtube_search(query, api_key, max_results=10)
print(f"검색 결과 video_ids: {len(video_ids)}개")

if video_ids:
    items = _youtube_get_videos_with_duration(video_ids, api_key)
    print(f"\n=== 영상 목록 (duration 포함) ===")
    for item in items:
        title = item.get("snippet", {}).get("title", "")
        dur = item.get("contentDetails", {}).get("duration", "PT0S")
        secs = _parse_duration_seconds(dur)
        kw_match = any(kw in title for kw in keywords if len(kw) >= 2) if keywords else True
        print(f"  [{secs}s] kw={kw_match} | {title}")
