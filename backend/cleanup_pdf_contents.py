"""
AI 생성 PDF 콘텐츠 노드 삭제 스크립트.
backend/ 디렉토리에서 실행: python cleanup_pdf_contents.py
"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import get_session


def main():
    with get_session() as session:
        count_result = session.run(
            "MATCH (ct:Content {source: 'ai', type: 'pdf'}) RETURN count(ct) AS cnt"
        )
        cnt = count_result.single()["cnt"]
        print(f"삭제 대상 PDF Content 노드: {cnt}개")

        if cnt == 0:
            print("삭제할 노드가 없습니다.")
            return

        session.run(
            "MATCH (ct:Content {source: 'ai', type: 'pdf'}) DETACH DELETE ct"
        )
        print(f"{cnt}개 삭제 완료.")


if __name__ == "__main__":
    main()
