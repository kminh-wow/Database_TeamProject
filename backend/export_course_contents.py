"""
전체 과목 × 콘텐츠 매핑 CSV 출력.
사용법: python export_course_contents.py [--out result.csv]
"""
import sys
import csv
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="course_contents_map.csv")
    args = parser.parse_args()

    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)
            OPTIONAL MATCH (c)-[:HAS_CONTENT]->(ct:Content)
            RETURN c.courseId AS course_id,
                   c.nameKr AS name,
                   c.grade AS grade,
                   c.semester AS semester,
                   ct.content_id AS content_id,
                   ct.title AS title,
                   ct.type AS type,
                   ct.source AS source,
                   ct.url AS url
            ORDER BY c.grade, c.semester, c.nameKr
        """)
        rows = [dict(r) for r in result]

    with open(args.out, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["course_id", "name", "grade", "semester", "content_id", "title", "type", "source", "url"])
        writer.writeheader()
        writer.writerows(rows)

    # 콘솔 요약
    courses = {}
    for r in rows:
        cid = r["course_id"]
        if cid not in courses:
            courses[cid] = {"name": r["name"], "grade": r["grade"], "semester": r["semester"], "ai": 0, "ai_syllabus": 0, "user": 0, "total": 0}
        if r["content_id"]:
            src = r["source"] or "ai"
            courses[cid][src] = courses[cid].get(src, 0) + 1
            courses[cid]["total"] += 1

    no_content = [v for v in courses.values() if v["total"] == 0]
    print(f"전체 과목: {len(courses)}개")
    print(f"콘텐츠 있음: {len(courses) - len(no_content)}개")
    print(f"콘텐츠 없음: {len(no_content)}개")
    if no_content:
        print("\n[콘텐츠 없는 과목]")
        for c in no_content:
            print(f"  {c['grade']}학년 {c['semester']} {c['name']}")
    print(f"\nCSV 저장: {args.out}")

if __name__ == "__main__":
    main()
