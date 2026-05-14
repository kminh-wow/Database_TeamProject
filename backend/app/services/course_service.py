from app.database import get_session
from app.schemas.course import (
    DepartmentResponse,
    CourseResponse,
    CourseRef,
    CurriculumGraphResponse,
    FlowNode,
    FlowEdge,
    NodeData,
)

# 학년별 x 좌표 (React Flow 레이아웃)
YEAR_X = {1: 0, 2: 350, 3: 700, 4: 1050}
NODE_Y_GAP = 120


def get_departments() -> list[DepartmentResponse]:
    with get_session() as session:
        result = session.run("MATCH (d:Department) RETURN d.name AS name ORDER BY d.name")
        return [DepartmentResponse(name=r["name"]) for r in result]


def search_courses(keyword: str) -> list[CourseResponse]:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course)
            WHERE toLower(c.nameKr) CONTAINS toLower($keyword)
               OR toLower(c.nameEn) CONTAINS toLower($keyword)
            RETURN c
            ORDER BY c.nameKr
            LIMIT 30
            """,
            keyword=keyword,
        )
        return [
            CourseResponse(
                course_id=c["c"]["courseId"],
                name=c["c"]["nameKr"],
                name_en=c["c"].get("nameEn"),
                year=c["c"].get("grade"),
                course_type=c["c"].get("type"),
                credits=c["c"].get("credits"),
                hours=c["c"].get("hours"),
                description=c["c"].get("descKr"),
            )
            for c in result
        ]


def get_course(course_id: str) -> CourseResponse | None:
    with get_session() as session:
        result = session.run(
            """
            MATCH (c:Course {courseId: $course_id})
            OPTIONAL MATCH (pre:Course)-[:PREREQUISITE_OF]->(c)
            OPTIONAL MATCH (c)-[:PREREQUISITE_OF]->(suc:Course)
            RETURN c,
                   collect(DISTINCT {courseId: pre.courseId, nameKr: pre.nameKr}) AS prerequisites,
                   collect(DISTINCT {courseId: suc.courseId, nameKr: suc.nameKr}) AS successors
            """,
            course_id=course_id,
        )
        record = result.single()
        if not record:
            return None
        c = record["c"]
        prerequisites = [
            CourseRef(course_id=p["courseId"], name=p["nameKr"])
            for p in record["prerequisites"]
            if p["courseId"] is not None
        ]
        successors = [
            CourseRef(course_id=s["courseId"], name=s["nameKr"])
            for s in record["successors"]
            if s["courseId"] is not None
        ]
        return CourseResponse(
            course_id=c["courseId"],
            name=c["nameKr"],
            name_en=c.get("nameEn"),
            year=c.get("grade"),
            course_type=c.get("type"),
            credits=c.get("credits"),
            hours=c.get("hours"),
            description=c.get("descKr"),
            prerequisites=prerequisites,
            successors=successors,
        )


def get_curriculum_graph(department_name: str) -> CurriculumGraphResponse:
    with get_session() as session:
        # 해당 학과의 모든 과목 조회
        courses_result = session.run(
            """
            MATCH (c:Course)-[:BELONGS_TO]->(d:Department {name: $dept})
            RETURN c
            ORDER BY c.grade, c.nameKr
            """,
            dept=department_name,
        )
        courses = [r["c"] for r in courses_result]

        # 선후수 관계 조회 (해당 학과 과목 간)
        edges_result = session.run(
            """
            MATCH (a:Course)-[:BELONGS_TO]->(d:Department {name: $dept})
            MATCH (b:Course)-[:BELONGS_TO]->(d)
            MATCH (a)-[:PREREQUISITE_OF]->(b)
            RETURN a.courseId AS source, b.courseId AS target
            """,
            dept=department_name,
        )
        edge_pairs = [(r["source"], r["target"]) for r in edges_result]

    # 학년별 y 인덱스 카운터
    year_counter: dict[int, int] = {}
    nodes: list[FlowNode] = []

    for c in courses:
        year = c.get("grade") or 1
        idx = year_counter.get(year, 0)
        year_counter[year] = idx + 1

        nodes.append(
            FlowNode(
                id=c["courseId"],
                data=NodeData(
                    label=c["nameKr"],
                    year=year,
                    course_type=c.get("type"),
                    credits=c.get("credits"),
                ),
                position={"x": YEAR_X.get(year, 0), "y": idx * NODE_Y_GAP},
            )
        )

    edges: list[FlowEdge] = [
        FlowEdge(id=f"e{src}-{tgt}", source=src, target=tgt)
        for src, tgt in edge_pairs
    ]

    return CurriculumGraphResponse(nodes=nodes, edges=edges)
