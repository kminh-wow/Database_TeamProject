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
    "fd720272-659d-4146-be84-465ba9ab96ca",  # 로봇프로그래밍 - 입시 블로그
    "e5d1ae30-acb7-4b0c-b205-6973860f7e08",  # 프로그래밍기초2 - AI 영상
    "582f9d0b-6331-4ae4-b9d6-373057980f51",  # 프로그래밍기초2 - AI 로드맵
    "27fbce8d-b761-4ce3-918e-ba21411814d4",  # 딥러닝프로그래밍 - HongLab 로드맵
    "035e9a6c-0511-4f35-81fa-c51c00b3a678",  # 데이터베이스 - 컴활 자격증
]

REGEN_COURSE_NAMES = [
    "로봇프로그래밍",
    "프로그래밍기초2",
    "딥러닝프로그래밍",
    "데이터베이스",
]


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
        print(f"[{c['name']}] 생성 중...", end=" ", flush=True)
        try:
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
