"""
syllabusKr 있는 과목만 대상으로 강의계획서 기반 콘텐츠 생성.
생성된 콘텐츠는 source='ai_syllabus' 로 구분.

사용법:
  python populate_syllabus_contents.py --dry-run
  python populate_syllabus_contents.py
  python populate_syllabus_contents.py --limit 10
"""
import sys
import time
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session
from app.services.ai_service import (
    _extract_keywords_ai,
    _fetch_youtube_videos,
    _fetch_naver_blogs,
    _save_and_return_contents,
)


def get_syllabus_courses() -> list[dict]:
    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)
            WHERE c.syllabusKr IS NOT NULL
            RETURN c.courseId AS course_id, c.nameKr AS name,
                   c.descKr AS description, c.syllabusKr AS syllabus,
                   c.grade AS grade, c.semester AS semester
            ORDER BY c.grade, c.semester, c.nameKr
        """)
        return [dict(r) for r in result]


def has_syllabus_content(course_id: str) -> bool:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            WHERE ct.source = 'ai_syllabus'
            RETURN count(ct) AS cnt
            """,
            course_id=course_id,
        )
        return result.single()["cnt"] > 0


def generate_syllabus_contents(course_id: str, course_name: str, description: str | None, syllabus: str) -> int:
    keywords = _extract_keywords_ai(course_name, description, syllabus=syllabus)
    raw = _fetch_youtube_videos(course_name, keywords, populate_mode=True)
    raw += _fetch_naver_blogs(course_name, keywords)
    if not raw:
        return 0
    saved = _save_and_return_contents(course_id, raw, source="ai_syllabus")
    return len(saved)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="대상 과목 목록만 출력")
    parser.add_argument("--limit", type=int, default=0, help="최대 처리 과목 수 (0=무제한)")
    args = parser.parse_args()

    courses = get_syllabus_courses()
    total = len(courses)
    print(f"syllabusKr 있는 과목: {total}개\n")

    if args.dry_run:
        cur_grade = None
        for c in courses:
            if c["grade"] != cur_grade:
                cur_grade = c["grade"]
                print(f"\n[{cur_grade}학년]")
            print(f"  {c['semester']} {c['name']} ({c['course_id']})")
        return

    if args.limit > 0:
        courses = courses[:args.limit]
        total = len(courses)
        print(f"(--limit {args.limit} 적용 → {total}개 처리)\n")

    success = skip = fail = 0
    for i, c in enumerate(courses, 1):
        cid = c["course_id"]
        name = c["name"]
        print(f"[{i}/{total}] {name} ({cid}) ...", end=" ", flush=True)

        if has_syllabus_content(cid):
            print("SKIP (ai_syllabus 이미 있음)")
            skip += 1
            continue

        try:
            count = generate_syllabus_contents(cid, name, c.get("description"), c["syllabus"])
            if count > 0:
                print(f"ai_syllabus {count}개 추가")
                success += 1
            else:
                print("콘텐츠 없음")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        if i < total:
            time.sleep(0.3)

    print(f"\n완료: 성공 {success} / 스킵 {skip} / 실패 {fail} / 전체 {total}")


if __name__ == "__main__":
    main()
