"""
새 파이프라인으로 전체 과목 콘텐츠 pre-populate.

파이프라인:
  1. Groq → 핵심 개념 3개 추출 (키워드)
  2. YouTube: 첫 번째 키워드로 search (100 units) + videos.list duration 필터 → 최대 2개
  3. Naver:   첫 번째 키워드로 검색, 스팸 필터 → 최대 3개

YouTube quota: ~101 units/과목 × 최대 DAILY_LIMIT과목 = ~9090 units/일 (10,000 limit 내)
→ 300과목 기준 약 3일에 완료

사용법:
  cd backend
  python populate_v2.py              # 기본 90과목/회
  python populate_v2.py --limit 50   # 50과목만
  python populate_v2.py --all        # 남은 전체 (quota 주의)
"""

import sys
import time
import argparse
from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, ".")
from app.database import get_session
from app.services.ai_service import generate_contents_for_course

DAILY_LIMIT = 90  # YouTube 10,000 units ÷ 101 units/과목 ≈ 99, 여유분 포함


def get_courses_without_content(limit: int | None = None) -> list[dict]:
    with get_session() as session:
        query = """
        MATCH (c:Course)
        WHERE NOT (c)-[:HAS_CONTENT]->(:Content {source: 'ai'})
        RETURN c.courseId AS course_id, c.nameKr AS name
        ORDER BY c.courseId
        """
        if limit:
            query += f" LIMIT {limit}"
        result = session.run(query)
        return [{"course_id": r["course_id"], "name": r["name"]} for r in result]


def main():
    parser = argparse.ArgumentParser(description="AI 콘텐츠 pre-populate (새 파이프라인)")
    parser.add_argument("--limit", type=int, default=DAILY_LIMIT, help="처리할 최대 과목 수")
    parser.add_argument("--all", action="store_true", help="남은 전체 과목 처리 (quota 주의)")
    args = parser.parse_args()

    limit = None if args.all else args.limit
    courses = get_courses_without_content(limit)

    if not courses:
        print("콘텐츠 없는 과목이 없습니다. 이미 완료된 상태입니다.")
        return

    total = len(courses)
    print(f"콘텐츠 없는 과목: {total}개 처리 시작")
    if not args.all:
        print(f"(오늘 처리: {total}개 / YouTube quota ~{total * 101} units)")

    success = 0
    fail = 0

    for i, course in enumerate(courses, 1):
        course_id = course["course_id"]
        name = course["name"]
        print(f"[{i}/{total}] {name} ({course_id}) ...", end=" ", flush=True)

        try:
            result = generate_contents_for_course(course_id, populate_mode=True)
            count = len(result.contents)
            if result.cached:
                print(f"이미 존재 (스킵)")
            elif count > 0:
                yt = sum(1 for c in result.contents if c.type == "youtube")
                blog = sum(1 for c in result.contents if c.type == "blog")
                print(f"완료 (YouTube {yt}개, Blog {blog}개)")
                success += 1
            else:
                print("콘텐츠 없음 (API 결과 없음)")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        # API rate limit 방지: 과목 사이 0.5초 대기
        if i < total:
            time.sleep(0.5)

    print(f"\n완료: 성공 {success}개 / 실패 {fail}개 / 전체 {total}개")
    if not args.all:
        remaining = total - success - fail
        if remaining > 0:
            print(f"남은 과목은 내일 다시 실행하세요.")


if __name__ == "__main__":
    main()
