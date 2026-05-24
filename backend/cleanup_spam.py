"""
DB에 저장된 AI 콘텐츠 중 스팸 키워드가 포함된 과목을 찾아서 삭제 후 재생성.
사용법: python3 cleanup_spam.py [--dry-run] [--youtube]
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

_SPAM = re.compile(
    r"자격증|합격|학원|국비|학점은행|독학사|수능|입시|수시|정시|입결"
    r"|고1|고2|고3|중학교|중학생|고등학생|초등학생"
    r"|과외|경시대회|과학고|영재고"
    r"|취준|취직|공무원|사교육|인강"
    r"|부트캠프|내일배움카드|내일배움|국가기간|무료수강|취업연계"
    r"|특강|캡스톤|오리엔테이션|방통대|편입|프로모션|할인|수강신청"
    r"|주가|코스피|코스닥|목표가|성장주|관련주|ETF|etf|배당주|투자종목|증시"
)


def find_spam_courses() -> list[dict]:
    with get_session() as session:
        result = session.run("""
            MATCH (c:Course)-[:HAS_CONTENT]->(ct:Content {source: 'ai'})
            RETURN DISTINCT c.courseId AS course_id, c.nameKr AS name,
                   collect(ct.title) AS titles
        """)
        spam_courses = []
        for r in result:
            titles = r["titles"] or []
            spam_titles = [t for t in titles if t and _SPAM.search(t)]
            if spam_titles:
                spam_courses.append({
                    "course_id": r["course_id"],
                    "name": r["name"],
                    "spam_titles": spam_titles,
                })
        return spam_courses


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="삭제/재생성 없이 스팸 목록만 출력")
    parser.add_argument("--youtube", action="store_true", help="YouTube도 포함 (기본: Naver only)")
    args = parser.parse_args()

    print("스팸 콘텐츠 탐지 중...", flush=True)
    spam_courses = find_spam_courses()
    total = len(spam_courses)
    print(f"스팸 포함 과목: {total}개\n")

    if args.dry_run:
        for c in spam_courses:
            print(f"[{c['course_id']}] {c['name']}")
            for t in c["spam_titles"]:
                print(f"  ❌ {t}")
        return

    naver_only = not args.youtube
    success = fail = 0

    for i, c in enumerate(spam_courses, 1):
        course_id = c["course_id"]
        name = c["name"]
        print(f"[{i}/{total}] {name} ({course_id}) ...", end=" ", flush=True)
        try:
            deleted = delete_cached_contents(course_id)
            result = generate_contents_for_course(course_id, populate_mode=True, naver_only=naver_only)
            count = len(result.contents)
            if count > 0:
                yt = sum(1 for ct in result.contents if ct.type == "youtube")
                blog = sum(1 for ct in result.contents if ct.type == "blog")
                print(f"삭제 {deleted}개 → 재생성 완료 (YouTube {yt}, Blog {blog})")
                success += 1
            else:
                print(f"삭제 {deleted}개 → 콘텐츠 없음")
                fail += 1
        except Exception as e:
            print(f"오류: {e}")
            fail += 1

        if i < total:
            time.sleep(0.5)

    print(f"\n완료: 성공 {success} / 실패 {fail} / 전체 {total}")


if __name__ == "__main__":
    main()
