from fastapi import APIRouter, HTTPException, Depends
from app.dependencies import get_current_user
from app.schemas.folder import FolderCreate, FolderUpdate, FolderResponse, FolderItemCreate, FolderItemResponse
from app.services import folder_service

router = APIRouter(prefix="/api/folders", tags=["Folders"])


@router.post("", response_model=FolderResponse, status_code=201)
def create_folder(body: FolderCreate, user=Depends(get_current_user)):
    return folder_service.create_folder(user["uid"], body)


@router.get("", response_model=list[FolderResponse])
def list_folders(user=Depends(get_current_user)):
    return folder_service.get_folders(user["uid"])


@router.patch("/{folder_id}", response_model=FolderResponse)
def rename_folder(folder_id: str, body: FolderUpdate, user=Depends(get_current_user)):
    try:
        return folder_service.rename_folder(user["uid"], folder_id, body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{folder_id}", status_code=204)
def delete_folder(folder_id: str, user=Depends(get_current_user)):
    try:
        folder_service.delete_folder(user["uid"], folder_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{folder_id}/items", response_model=FolderItemResponse, status_code=201)
def add_item(folder_id: str, body: FolderItemCreate, user=Depends(get_current_user)):
    try:
        return folder_service.add_item(user["uid"], folder_id, body)
    except ValueError as e:
        detail = str(e)
        raise HTTPException(status_code=409 if "이미 저장" in detail else 404, detail=detail)


@router.get("/{folder_id}/items", response_model=list[FolderItemResponse])
def get_items(folder_id: str, user=Depends(get_current_user)):
    try:
        return folder_service.get_items(user["uid"], folder_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{folder_id}/items/{content_id}", status_code=204)
def remove_item(folder_id: str, content_id: str, user=Depends(get_current_user)):
    try:
        folder_service.remove_item(user["uid"], folder_id, content_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
