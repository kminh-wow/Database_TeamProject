from pydantic import BaseModel
from typing import Optional


class DepartmentResponse(BaseModel):
    name: str


class CourseResponse(BaseModel):
    course_id: str
    name: str
    name_en: Optional[str] = None
    year: Optional[int] = None
    course_type: Optional[str] = None
    credits: Optional[int] = None
    hours: Optional[int] = None
    description: Optional[str] = None


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
    nodes: list[FlowNode]
    edges: list[FlowEdge]


# 콘텐츠 추천
class ContentItem(BaseModel):
    title: str
    url: str
    type: str  # "youtube" | "blog" | "pdf"


class ContentsResponse(BaseModel):
    course_id: str
    course_name: str
    contents: list[ContentItem]
    cached: bool
