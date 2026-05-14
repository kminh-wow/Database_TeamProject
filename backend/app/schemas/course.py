from pydantic import BaseModel
from typing import Optional


class DepartmentResponse(BaseModel):
    name: str


class CourseRef(BaseModel):
    course_id: str
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
    nodes: list[FlowNode]
    edges: list[FlowEdge]


# 콘텐츠 추천 (AI)
class ContentItem(BaseModel):
    title: str
    url: str
    type: str  # "youtube" | "blog" | "pdf"


class ContentsResponse(BaseModel):
    course_id: str
    course_name: str
    contents: list[ContentItem]
    cached: bool


# 자료 (Resources)
class ResourceItem(BaseModel):
    content_id: str
    title: str
    url: str
    type: str        # "youtube" | "blog" | "강의자료" | "교재"
    source: str      # "ai" | "user"
    description: Optional[str] = None
    like_count: int = 0
    dislike_count: int = 0


class ResourceCreateRequest(BaseModel):
    title: str
    url: str
    type: str
    description: Optional[str] = None


class ResourcesResponse(BaseModel):
    course_id: str
    resources: list[ResourceItem]


# 피드백
class FeedbackRequest(BaseModel):
    action: str  # "like" | "dislike"


class FeedbackResponse(BaseModel):
    content_id: str
    like_count: int
    dislike_count: int
