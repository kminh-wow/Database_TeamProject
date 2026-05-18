"""
블로그 콘텐츠가 없는 과목에 네이버 블로그 검색 결과를 추가하는 스크립트.
backend/ 디렉토리에서 실행: python populate_naver_blogs.py
"""
import sys
import os
import time

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import get_session
from app.services.ai_service import _fetch_naver_blogs, _save_and_return_contents


def get_courses_without_blog() -> list[tuple[str, str, str]]:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)-[:BELONGS_TO]->(d:Department)
            WHERE c.courseId IS NOT NULL
              AND NOT (c)-[:HAS_CONTENT]->(:Content {source: 'ai', type: 'blog'})
            WITH c.courseId AS course_id, c.nameKr AS name, c.nameEn AS name_en,
                 c.grade AS grade, collect(d.name)[0] AS dept
            RETURN DISTINCT course_id, name, name_en, dept, grade
            ORDER BY dept, grade, name
            """
        )
        return [(r["course_id"], r["name"] or "", r["name_en"] or "") for r in result]


def main():
    courses = get_courses_without_blog()
    total = len(courses)
    print(f"블로그 없는 과목: {total}개", flush=True)

    ok = 0
    empty = 0

    for i, (course_id, name, name_en) in enumerate(courses, 1):
        items = _fetch_naver_blogs(name, name_en)
        if items:
            _save_and_return_contents(course_id, items)
            print(f"[{i}/{total}] ✓ {name} ({len(items)}개)", flush=True)
            ok += 1
        else:
            print(f"[{i}/{total}] - {name} (결과 없음)", flush=True)
            empty += 1
        time.sleep(0.2)  # 네이버 API 과부하 방지

    print(f"\n완료: {ok}개 성공 / {empty}개 결과없음", flush=True)


if __name__ == "__main__":
    main()
