"""
ai_syllabus 콘텐츠 중 과목 실라버스와 맞지 않는 항목 탐지 (Groq 판정).
사용법: python check_mismatch.py [--delete]
"""
import sys
import json
import time
import argparse
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from groq import Groq
from app.database import get_session

MODEL = "llama-3.1-8b-instant"


def get_syllabus_courses_with_content() -> list[dict]:
    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)-[:HAS_CONTENT]->(ct:Content {source: 'ai_syllabus'})
            RETURN DISTINCT c.courseId AS course_id, c.nameKr AS name,
                   c.syllabusKr AS syllabus, c.descKr AS description,
                   collect({content_id: ct.content_id, title: ct.title, type: ct.type}) AS contents
        """)
        return [dict(r) for r in result]


def ask_groq_mismatch(client: Groq, course_name: str, syllabus: str | None, description: str | None, titles: list[str]) -> list[int]:
    """관련 없는 콘텐츠 인덱스 목록 반환 (0-based)."""
    context = ""
    if syllabus:
        context += f"[강의계획서]: {syllabus[:1500]}\n"
    if description:
        context += f"[과목개요]: {description[:300]}\n"

    numbered = "\n".join(f"{i}. {t}" for i, t in enumerate(titles))
    prompt = f"""[과목명]: {course_name}
{context}
아래 콘텐츠 제목 목록 중, 위 과목과 전혀 관련 없는 항목의 번호만 JSON 배열로 반환해.
관련 없다는 기준: 과목에서 배우는 내용과 완전히 다른 주제 (예: 프로그래밍기초2 과목에 인공지능/딥러닝 강의).
약간 애매하면 포함하지 마.

[콘텐츠 목록]:
{numbered}

JSON 정수 배열만 반환 (예: [0, 3]). 모두 관련 있으면 []:"""

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=100,
        )
        text = resp.choices[0].message.content.strip()
        # JSON 배열 추출
        start = text.find("[")
        end = text.rfind("]") + 1
        if start == -1:
            return []
        return json.loads(text[start:end])
    except Exception as e:
        print(f"  Groq 오류: {e}")
        return []


def delete_contents(content_ids: list[str]) -> int:
    with get_session() as session:
        result = session.run("""
            MATCH (ct:Content)
            WHERE ct.content_id IN $ids
            DETACH DELETE ct
            RETURN count(ct) AS deleted
        """, ids=content_ids)
        return result.single()["deleted"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delete", action="store_true", help="불일치 항목 삭제")
    args = parser.parse_args()

    import os
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    print("ai_syllabus 과목 로딩...", flush=True)
    courses = get_syllabus_courses_with_content()
    print(f"{len(courses)}개 과목, 총 {sum(len(c['contents']) for c in courses)}개 콘텐츠\n")

    mismatch_ids = []
    total_flagged = 0

    for c in courses:
        name = c["name"]
        contents = c["contents"]
        titles = [ct["title"] for ct in contents]

        print(f"[{name}] {len(titles)}개 판정 중...", end=" ", flush=True)
        bad_indices = ask_groq_mismatch(client, name, c["syllabus"], c["description"], titles)

        if bad_indices:
            print(f"❌ {len(bad_indices)}개 불일치")
            for i in bad_indices:
                if 0 <= i < len(contents):
                    ct = contents[i]
                    print(f"  [{ct['type']}] {ct['title']}")
                    mismatch_ids.append(ct["content_id"])
                    total_flagged += 1
        else:
            print("✅ 이상 없음")

        time.sleep(0.3)

    print(f"\n총 불일치: {total_flagged}개")

    if args.delete and mismatch_ids:
        print(f"\n{len(mismatch_ids)}개 삭제 중...", flush=True)
        deleted = delete_contents(mismatch_ids)
        print(f"삭제 완료: {deleted}개")
    elif mismatch_ids and not args.delete:
        print("(삭제하려면 --delete 옵션 추가)")


if __name__ == "__main__":
    main()
