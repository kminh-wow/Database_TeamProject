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
            MATCH (c:Course)-[:BELONGS_TO]->(dept:Department)
            OPTIONAL MATCH (c)-[:PREREQUISITE_OF]-(related)
            RETURN dept.name AS dept_name, c.courseId AS course_id,
                   c.nameKr AS name, c.descKr AS description,
                   c.grade AS year, count(related) AS rel_count
        """)
        rows = [dict(r) for r in result]

    # Python에서 그룹핑: (dept_name, year) 기준으로 rel_count 최대 과목 선택
    groups: dict[tuple, dict] = {}
    for r in rows:
        if r["year"] is None:
            continue
        key = (r["dept_name"], r["year"])
        if key not in groups or r["rel_count"] > groups[key]["rel_count"]:
            groups[key] = r

    return sorted(groups.values(), key=lambda x: (x["dept_name"], x["year"]))


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
    parser.add_argument("--limit", type=int, default=0, help="최대 처리 과목 수 (0=무제한)")
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

    if args.limit > 0:
        courses = courses[:args.limit]
        total = len(courses)
        print(f"(--limit {args.limit} 적용 → {total}개 처리)\n")

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
