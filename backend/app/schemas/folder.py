from pydantic import BaseModel, ConfigDict
from typing import Optional


class FolderCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "자료구조 공부"}
    })
    name: str


class FolderUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"name": "자료구조 & 알고리즘"}
    })
    name: str


class FolderResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "folder_id": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
            "name": "자료구조 공부",
            "created_at": "2025-05-14T10:00:00",
            "item_count": 3
        }
    })
    folder_id: str
    name: str
    created_at: str
    item_count: int = 0


class FolderItemCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "title": "C언어 포인터 정리 블로그",
            "url": "https://blog.example.com/c-pointer",
            "type": "blog",
            "course_id": "21501614",
            "course_name": "프로그래밍기초1"
        }
    })
    content_id: str
    title: str
    url: str
    type: str
    course_id: str
    course_name: Optional[str] = None


class FolderItemResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "title": "C언어 포인터 정리 블로그",
            "url": "https://blog.example.com/c-pointer",
            "type": "blog",
            "course_id": "21501614",
            "course_name": "프로그래밍기초1",
            "saved_at": "2025-05-14T10:30:00"
        }
    })
    content_id: str
    title: str
    url: str
    type: str
    course_id: str
    course_name: Optional[str] = None
    saved_at: str
