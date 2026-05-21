"""
현재 DB에 저장된 과목-AI콘텐츠 매핑 전체 출력.
사용법: python3 export_contents.py > contents_map.txt
        python3 export_contents.py --csv  (CSV 형식)
"""
import sys
import argparse
import io
from dotenv import load_dotenv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()
sys.path.insert(0, ".")
from app.database import get_session


def export(csv_mode: bool = False):
    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)-[:HAS_CONTENT]->(ct:Content {source: 'ai'})
            RETURN c.nameKr AS course_name, c.courseId AS course_id,
                   ct.title AS title, ct.url AS url, ct.type AS type,
                   ct.created_at AS created_at
            ORDER BY c.nameKr, ct.type
        """)
        rows = list(result)

    if not rows:
        print("콘텐츠 없음")
        return

    if csv_mode:
        print("course_id,course_name,type,title,url,created_at")
        for r in rows:
            title = r["title"].replace('"', '""')
            print(f'{r["course_id"]},"{r["course_name"]}",{r["type"]},"{title}",{r["url"]},{r["created_at"] or ""}')
        return

    # 과목별 그룹핑
    current = None
    for r in rows:
        if r["course_name"] != current:
            current = r["course_name"]
            print(f'\n[{r["course_id"]}] {r["course_name"]}')
        icon = "▶" if r["type"] == "youtube" else "📝"
        print(f'  {icon} [{r["type"]}] {r["title"]}')
        print(f'       {r["url"]}')

    total_courses = len({r["course_id"] for r in rows})
    total_contents = len(rows)
    print(f'\n총 {total_courses}개 과목 / {total_contents}개 콘텐츠')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", action="store_true", help="CSV 형식으로 출력")
    args = parser.parse_args()
    export(csv_mode=args.csv)
