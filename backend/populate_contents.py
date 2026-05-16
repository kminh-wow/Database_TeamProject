"""
전체 과목 AI 추천 콘텐츠 일괄 생성 스크립트.
backend/ 디렉토리에서 실행: python populate_contents.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import get_session
from app.services.ai_service import get_contents_for_course


def get_all_courses() -> list[tuple[str, str, str]]:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)-[:BELONGS_TO]->(d:Department)
            WHERE c.courseId IS NOT NULL
            WITH c.courseId AS course_id, c.nameKr AS name, c.grade AS grade, collect(d.name)[0] AS dept
            RETURN DISTINCT course_id, name, dept, grade
            ORDER BY dept, grade, name
            """
        )
        seen = set()
        rows = []
        for r in result:
            if r["course_id"] not in seen:
                seen.add(r["course_id"])
                rows.append((r["course_id"], r["name"], r["dept"]))
        return rows


def main():
    courses = get_all_courses()
    total = len(courses)
    print(f"총 {total}개 과목 대상\n")

    ok, skipped, failed = 0, 0, 0

    for i, (course_id, name, dept) in enumerate(courses, 1):
        print(f"[{i}/{total}] {dept} / {name} ({course_id}) ... ", end="", flush=True)

        for attempt in range(3):
            try:
                result = get_contents_for_course(course_id)
                if result.cached:
                    print(f"스킵 (이미 캐싱됨)")
                    skipped += 1
                else:
                    print(f"완료 ({len(result.contents)}개)")
                    ok += 1
                break
            except Exception as e:
                if attempt < 2:
                    print(f"재시도 {attempt + 1}... ", end="", flush=True)
                else:
                    print(f"실패 - {e}")
                    failed += 1

    print(f"\n완료: {ok}개 생성 / {skipped}개 스킵 / {failed}개 실패")


if __name__ == "__main__":
    main()
