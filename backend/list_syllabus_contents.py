"""ai_syllabus 콘텐츠 전체 목록 출력."""
import sys
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session

with get_session() as session:
    result = session.run("""
        MATCH (c:Course)-[:HAS_CONTENT]->(ct:Content {source: 'ai_syllabus'})
        RETURN c.nameKr AS course, ct.content_id AS cid,
               ct.type AS type, ct.title AS title
        ORDER BY c.nameKr, ct.type
    """)
    rows = [dict(r) for r in result]

cur_course = None
for r in rows:
    if r["course"] != cur_course:
        cur_course = r["course"]
        print(f"\n[{cur_course}]")
    print(f"  {r['cid']}  [{r['type']}] {r['title']}")

print(f"\n총 {len(rows)}개")
