"""
각 학과 × 학년 대표 과목 (선후수 관계 가장 많은 과목) 에만 YouTube 콘텐츠 추가.
기존 Naver 콘텐츠는 건드리지 않음.

사용법:
  python3 populate_youtube_reps.py --dry-run   # 대상 과목 목록만 출력
  python3 populate_youtube_reps.py             # 실제 실행
"""
import sys
import time
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session
from app.services.ai_service import _extract_keywords_ai, _fetch_youtube_videos, _save_and_return_contents


def get_rep_courses() -> list[dict]:
    """각 학과 × 학년에서 선후수 관계 가장 많은 과목 1개씩 선택"""
    with get_session() as session:
        result = session.run("""
            MATCH (dept:Department)<-[:BELONGS_TO]-(c:Course)
            WHERE c.year IS NOT NULL
            OPTIONAL MATCH (c)-[:PREREQUISITE_OF]-(related)
            WITH dept.name AS dept_name, c.year AS year, c, count(related) AS rel_count
            ORDER BY dept_name, year, rel_count DESC
            WITH dept_name, year, collect({
                course_id: c.courseId,
                name: c.nameKr,
                description: c.descKr,
                rel_count: rel_count
            })[0] AS top
            RETURN dept_name, year, top.course_id AS course_id, top.name AS name,
                   top.description AS description, top.rel_count AS rel_count
            ORDER BY dept_name, year
        """)
        return [dict(r) for r in result]


def has_youtube_content(course_id: str) -> bool:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})-[:HAS_CONTENT]->(ct:Content)
            WHERE ct.type = 'youtube'
            RETURN count(ct) AS cnt
            """,
            course_id=course_id,
        )
        return result.single()["cnt"] > 0


def add_youtube_only(course_id: str, course_name: str, description: str | None) -> int:
    keywords = _extract_keywords_ai(course_name, description)
    videos = _fetch_youtube_videos(course_name, keywords, populate_mode=True)
    if not videos:
        return 0
    saved = _save_and_return_contents(course_id, videos)
    return len(saved)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="대상 과목 목록만 출력")
    args = parser.parse_args()

    courses = get_rep_courses()
    total = len(courses)
    print(f"대표 과목: {total}개\n")

    if args.dry_run:
        cur_dept = None
        for c in courses:
            if c["dept_name"] != cur_dept:
                cur_dept = c["dept_name"]
                print(f"\n[{cur_dept}]")
            print(f"  {c['year']}학년: {c['name']} ({c['course_id']}) - 선후수 {c['rel_count']}개")
        return

    success = skip = fail = 0
    for i, c in enumerate(courses, 1):
        cid = c["course_id"]
        name = c["name"]
        print(f"[{i}/{total}] {name} ({cid}) ...", end=" ", flush=True)

        if has_youtube_content(cid):
            print("SKIP (YouTube 이미 있음)")
            skip += 1
            continue

        try:
            count = add_youtube_only(cid, name, c.get("description"))
            if count > 0:
                print(f"YouTube {count}개 추가")
                success += 1
            else:
                print("콘텐츠 없음 (필터 또는 API 오류)")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        if i < total:
            time.sleep(0.3)

    print(f"\n완료: 성공 {success} / 스킵 {skip} / 실패 {fail} / 전체 {total}")


if __name__ == "__main__":
    main()
