from pydantic import BaseModel, ConfigDict
from typing import Optional


class DepartmentResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "AI소프트웨어학부", "college_name": "AI대학"}
    })
    name: str
    college_name: Optional[str] = None


class CourseRef(BaseModel):
    course_id: str
    name: str


class CourseResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "course_id": "21501614",
            "name": "프로그래밍기초1",
            "name_en": "Programming I",
            "year": 1,
            "course_type": "전공기초",
            "credits": 3,
            "hours": 4,
            "description": "프로그래밍의 기초 개념과 C언어를 활용한 절차적 프로그래밍을 학습한다.",
            "prerequisites": [],
            "successors": [
                {"course_id": "21501616", "name": "프로그래밍기초2"}
            ]
        }
    })
    course_id: str
    name: str
    name_en: Optional[str] = None
    year: Optional[int] = None
    semester: Optional[str] = None
    course_type: Optional[str] = None
    credits: Optional[int] = None
    hours: Optional[int] = None
    description: Optional[str] = None
    prerequisites: list[CourseRef] = []
    successors: list[CourseRef] = []


# React Flow용 노드/엣지
class NodeData(BaseModel):
    label: str
    year: Optional[int] = None
    course_type: Optional[str] = None
    credits: Optional[int] = None


class FlowNode(BaseModel):
    id: str
    data: NodeData
    position: dict


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str


class CurriculumGraphResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "nodes": [
                {
                    "id": "21501614",
                    "data": {"label": "프로그래밍기초1", "year": 1, "course_type": "전공기초", "credits": 3},
                    "position": {"x": 0, "y": 0}
                },
                {
                    "id": "21501616",
                    "data": {"label": "프로그래밍기초2", "year": 1, "course_type": "전공기초", "credits": 3},
                    "position": {"x": 0, "y": 120}
                }
            ],
            "edges": [
                {"id": "e21501614-21501616", "source": "21501614", "target": "21501616"}
            ]
        }
    })
    nodes: list[FlowNode]
    edges: list[FlowEdge]


# 콘텐츠 추천 (AI)
class ContentItem(BaseModel):
    content_id: str
    title: str
    url: str
    type: str  # "youtube" | "blog" | "pdf"
    source: str = "ai"
    like_count: int = 0
    dislike_count: int = 0


class ContentsResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "course_id": "21501614",
            "course_name": "프로그래밍기초1",
            "contents": [
                {"title": "C언어 입문 강의", "url": "https://www.youtube.com/watch?v=example1", "type": "youtube"},
                {"title": "C 프로그래밍 완전 정복", "url": "https://blog.example.com/c-programming", "type": "blog"},
                {"title": "C언어 교재 PDF", "url": "https://example.com/c-book.pdf", "type": "pdf"}
            ],
            "cached": True
        }
    })
    course_id: str
    course_name: str
    contents: list[ContentItem]
    cached: bool


# 자료 (Resources)
class ResourceItem(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "title": "C언어 포인터 정리 블로그",
            "url": "https://blog.example.com/c-pointer",
            "type": "blog",
            "source": "user",
            "description": "포인터 개념을 그림과 함께 쉽게 설명한 글",
            "like_count": 5,
            "dislike_count": 0
        }
    })
    content_id: str
    title: str
    url: str
    type: str        # "youtube" | "blog" | "강의자료" | "교재"
    source: str      # "ai" | "user"
    description: Optional[str] = None
    like_count: int = 0
    dislike_count: int = 0


class ResourceCreateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "C언어 포인터 정리 블로그",
            "url": "https://blog.example.com/c-pointer",
            "type": "blog",
            "description": "포인터 개념을 그림과 함께 쉽게 설명한 글"
        }
    })
    title: str
    url: str
    type: str
    description: Optional[str] = None


class ResourcesResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "course_id": "21501614",
            "resources": [
                {
                    "content_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "title": "C언어 포인터 정리 블로그",
                    "url": "https://blog.example.com/c-pointer",
                    "type": "blog",
                    "source": "user",
                    "description": "포인터 개념을 그림과 함께 쉽게 설명한 글",
                    "like_count": 5,
                    "dislike_count": 0
                }
            ]
        }
    })
    course_id: str
    resources: list[ResourceItem]


# 피드백
class FeedbackRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"action": "like"}
    })
    action: str  # "like" | "dislike"


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "like_count": 6,
            "dislike_count": 0
        }
    })
    content_id: str
    like_count: int
    dislike_count: int
