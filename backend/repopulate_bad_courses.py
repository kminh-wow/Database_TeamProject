"""
이상한 콘텐츠가 들어간 과목 삭제 후 재생성.

사용법:
  python3 repopulate_bad_courses.py --csv strange_contents_found.csv
  python3 repopulate_bad_courses.py --csv strange_contents_found.csv --youtube  (YouTube 포함)
"""
import sys
import time
import argparse
import csv
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.services.ai_service import delete_cached_contents, generate_contents_for_course


def get_course_ids_from_csv(csv_path: str) -> list[str]:
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        ids = {row["course_id"] for row in reader if row.get("course_id")}
    return sorted(ids)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="이상한 콘텐츠 CSV 파일 경로")
    parser.add_argument("--youtube", action="store_true", help="YouTube도 포함 (기본: Naver only)")
    args = parser.parse_args()

    naver_only = not args.youtube
    course_ids = get_course_ids_from_csv(args.csv)
    total = len(course_ids)
    print(f"처리할 과목: {total}개 ({'YouTube+Naver' if not naver_only else 'Naver only'})")

    success = fail = 0
    for i, course_id in enumerate(course_ids, 1):
        print(f"[{i}/{total}] {course_id} ...", end=" ", flush=True)
        try:
            deleted = delete_cached_contents(course_id)
            result = generate_contents_for_course(course_id, populate_mode=True, naver_only=naver_only)
            count = len(result.contents)
            if count > 0:
                yt = sum(1 for c in result.contents if c.type == "youtube")
                blog = sum(1 for c in result.contents if c.type == "blog")
                print(f"삭제 {deleted}개 → 재생성 완료 (YouTube {yt}, Blog {blog})")
                success += 1
            else:
                print(f"삭제 {deleted}개 → 콘텐츠 없음 (스팸 필터 전부 걸림)")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        if i < total:
            time.sleep(0.5)

    print(f"\n완료: 성공 {success} / 실패 {fail} / 전체 {total}")


if __name__ == "__main__":
    main()
