from app.database import get_session
from app.schemas.course import (
    DepartmentResponse,
    CourseResponse,
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


def get_course(course_id: str) -> CourseResponse | None:
    with get_session() as session:
        result = session.run(
            "MATCH (c:Course {course_id: $course_id}) RETURN c",
            course_id=course_id,
        )
        record = result.single()
        if not record:
            return None
        c = record["c"]
        return CourseResponse(
            course_id=c["course_id"],
            name=c["name"],
            name_en=c.get("name_en"),
            year=c.get("year"),
            course_type=c.get("course_type"),
            credits=c.get("credits"),
            hours=c.get("hours"),
            description=c.get("description"),
        )


def get_curriculum_graph(department_name: str) -> CurriculumGraphResponse:
    with get_session() as session:
        # 해당 학과의 모든 과목 조회
        courses_result = session.run(
            """
            MATCH (c:Course)-[:BELONGS_TO]->(d:Department {name: $dept})
            RETURN c
            ORDER BY c.year, c.name
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
            RETURN a.course_id AS source, b.course_id AS target
            """,
            dept=department_name,
        )
        edge_pairs = [(r["source"], r["target"]) for r in edges_result]

    # 학년별 y 인덱스 카운터
    year_counter: dict[int, int] = {}
    nodes: list[FlowNode] = []

    for c in courses:
        year = c.get("year") or 1
        idx = year_counter.get(year, 0)
        year_counter[year] = idx + 1

        nodes.append(
            FlowNode(
                id=c["course_id"],
                data=NodeData(
                    label=c["name"],
                    year=year,
                    course_type=c.get("course_type"),
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
