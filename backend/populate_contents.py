"""
학과별 첫 번째 과목에 AI 추천 콘텐츠를 미리 생성해두는 스크립트.
backend/ 디렉토리에서 실행: python populate_contents.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import get_session
from app.services.ai_service import get_contents_for_course


def get_one_course_per_department() -> list[tuple[str, str]]:
    """각 학과의 첫 번째 과목 (course_id, department) 반환"""
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)-[:BELONGS_TO]->(d:Department)
            WITH d.name AS dept, collect(c.courseId)[0] AS course_id
            RETURN dept, course_id
            ORDER BY dept
            """
        )
        return [(r["dept"], r["course_id"]) for r in result]


def main():
    courses = get_one_course_per_department()
    print(f"총 {len(courses)}개 학과 대상\n")

    for dept, course_id in courses:
        print(f"[{dept}] course_id={course_id} ... ", end="", flush=True)
        for attempt in range(3):
            try:
                result = get_contents_for_course(course_id)
                if result.cached:
                    print(f"이미 캐싱됨 ({result.course_name})")
                else:
                    print(f"완료 ({result.course_name}, {len(result.contents)}개)")
                break
            except Exception as e:
                if attempt < 2:
                    print(f"재시도 {attempt+1}... ", end="", flush=True)
                else:
                    print(f"실패 - {e}")


if __name__ == "__main__":
    main()
