"""
불일치 ai_syllabus 콘텐츠 삭제 후 해당 과목 재생성.
"""
import sys
import time
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, ".")

from app.database import get_session
from populate_syllabus_contents import generate_syllabus_contents

DELETE_IDS = [
    # 프로그래밍기초2 - 입시/무관 블로그 (2세트 중복)
    "2d6c57e1-0b48-43c1-ae35-ad17d44117f1",
    "aecf95a1-8ae1-49fe-ba64-7442ff437537",
    "b38e79b2-1745-4030-b33c-40f550f0f2bb",
    "eeb76218-2d72-4b4a-9aa0-e8aa0af1ea7e",
    "fe3dede7-28a5-43fe-b91c-ce50c718f23b",
    "df80ae84-b1f5-40b7-9256-5eef98f6f5e4",
    # 딥러닝프로그래밍 - 도서뉴스/OpenCV 블로그
    "91bfa7f7-1abf-40db-a8b3-81b0e4c0d043",
    "1e06ef0b-bf7b-47ff-b157-3a50a12cc7c5",
    "85c94ef3-9408-4f21-a1c8-89a3e13775c7",
]

# 네이버 결과가 나쁜 과목은 YouTube only
REGEN_YOUTUBE_ONLY = ["프로그래밍기초2", "딥러닝프로그래밍"]
REGEN_COURSE_NAMES = ["프로그래밍기초2", "딥러닝프로그래밍"]


def delete_contents(ids: list[str]) -> int:
    with get_session() as session:
        result = session.run("""
            MATCH (ct:Content)
            WHERE ct.content_id IN $ids
            DETACH DELETE ct
            RETURN count(ct) AS cnt
        """, ids=ids)
        return result.single()["cnt"]


def get_courses(names: list[str]) -> list[dict]:
    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)
            WHERE c.nameKr IN $names AND c.syllabusKr IS NOT NULL
            RETURN c.courseId AS course_id, c.nameKr AS name,
                   c.descKr AS description, c.syllabusKr AS syllabus
            ORDER BY c.nameKr
        """, names=names)
        return [dict(r) for r in result]


def main():
    print(f"삭제: {len(DELETE_IDS)}개 콘텐츠...", flush=True)
    deleted = delete_contents(DELETE_IDS)
    print(f"삭제 완료: {deleted}개\n")

    courses = get_courses(REGEN_COURSE_NAMES)
    print(f"재생성 대상: {len(courses)}개 과목\n")

    for c in courses:
        youtube_only = c["name"] in REGEN_YOUTUBE_ONLY
        tag = " (YouTube only)" if youtube_only else ""
        print(f"[{c['name']}]{tag} 생성 중...", end=" ", flush=True)
        try:
            if youtube_only:
                from app.services.ai_service import (
                    _extract_keywords_ai, _fetch_youtube_videos, _save_and_return_contents
                )
                keywords = _extract_keywords_ai(c["name"], c.get("description"), syllabus=c["syllabus"])
                raw = _fetch_youtube_videos(c["name"], keywords, populate_mode=True)
                from app.database import get_session as _gs
                saved = _save_and_return_contents(c["course_id"], raw, source="ai_syllabus")
                count = len(saved)
            else:
                count = generate_syllabus_contents(
                    c["course_id"], c["name"], c.get("description"), c["syllabus"]
                )
            print(f"ai_syllabus {count}개 추가")
        except Exception as e:
            print(f"오류: {e}")
        time.sleep(0.5)

    print("\n완료")


if __name__ == "__main__":
    main()
