from pydantic import BaseModel
from typing import Optional


class FolderCreate(BaseModel):
    name: str


class FolderResponse(BaseModel):
    folder_id: str
    name: str
    created_at: str
    item_count: int = 0


class FolderItemCreate(BaseModel):
    content_id: str
    title: str
    url: str
    type: str
    course_id: str
    course_name: Optional[str] = None


class FolderItemResponse(BaseModel):
    content_id: str
    title: str
    url: str
    type: str
    course_id: str
    course_name: Optional[str] = None
    saved_at: str
