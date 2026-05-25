"""
spam_list.txt의 URL 기준으로 DB 콘텐츠 삭제 후 해당 과목 재생성.
사용법:
  python delete_spam_list.py --dry-run   # 삭제될 항목만 확인
  python delete_spam_list.py             # 삭제 + 재생성
"""
import re
import sys
import time
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session
from app.services.ai_service import delete_cached_contents, generate_contents_for_course


def parse_spam_list(path: str) -> tuple[list[str], list[str]]:
    """(urls, course_ids) 반환"""
    with open(path, encoding="utf-8") as f:
        text = f.read()
    urls = [u[1:-1] for u in re.findall(r'\(https?://[^\)]+\)', text)]
    course_ids = re.findall(r'\[(\w+)\]', text)
    return urls, course_ids


def delete_by_urls(urls: list[str]) -> int:
    with get_session() as session:
        result = session.run(
            "UNWIND $urls AS u MATCH (ct:Content {url: u}) DETACH DELETE ct RETURN count(ct) AS cnt",
            urls=urls,
        )
        return result.single()["cnt"]


def get_courses_info(course_ids: list[str]) -> list[dict]:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)
            WHERE c.courseId IN $ids
            RETURN DISTINCT c.courseId AS course_id, c.nameKr AS name
            ORDER BY c.nameKr
            """,
            ids=course_ids,
        )
        return [dict(r) for r in result]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--file", default="spam_list.txt")
    args = parser.parse_args()

    urls, course_ids = parse_spam_list(args.file)
    unique_course_ids = list(set(course_ids))
    print(f"삭제 대상: {len(urls)}개 URL, {len(unique_course_ids)}개 과목\n")

    if args.dry_run:
        print("(--dry-run: 실제 삭제 안 함)")
        return

    # 1. URL 기준 삭제
    print(f"URL 기준 삭제 중...", flush=True)
    deleted = delete_by_urls(urls)
    print(f"삭제 완료: {deleted}개\n")

    # 2. 해당 과목 재생성
    courses = get_courses_info(unique_course_ids)
    total = len(courses)
    print(f"재생성 대상: {total}개 과목\n")

    success = fail = 0
    for i, c in enumerate(courses, 1):
        cid = c["course_id"]
        name = c["name"]
        print(f"[{i}/{total}] {name} ({cid}) ...", end=" ", flush=True)
        try:
            result = generate_contents_for_course(cid, populate_mode=True, naver_only=True)
            count = len(result.contents)
            if count > 0:
                blog = sum(1 for ct in result.contents if ct.type == "blog")
                yt = sum(1 for ct in result.contents if ct.type == "youtube")
                print(f"완료 (blog {blog}, youtube {yt})")
                success += 1
            else:
                print("콘텐츠 없음")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        if i < total:
            time.sleep(0.3)

    print(f"\n완료: 성공 {success} / 실패 {fail} / 전체 {total}")


if __name__ == "__main__":
    main()
