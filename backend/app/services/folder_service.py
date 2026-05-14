import uuid
from datetime import datetime
from app.firebase import get_firestore
from app.schemas.folder import FolderCreate, FolderUpdate, FolderItemCreate, FolderResponse, FolderItemResponse


def _folders_ref(uid: str):
    return get_firestore().collection("users").document(uid).collection("folders")


def create_folder(uid: str, data: FolderCreate) -> FolderResponse:
    folder_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    doc = {"folder_id": folder_id, "name": data.name, "created_at": now}
    _folders_ref(uid).document(folder_id).set(doc)
    return FolderResponse(**doc, item_count=0)


def get_folders(uid: str) -> list[FolderResponse]:
    docs = _folders_ref(uid).stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        item_count = len(list(doc.reference.collection("items").stream()))
        result.append(FolderResponse(**data, item_count=item_count))
    return result


def rename_folder(uid: str, folder_id: str, data: FolderUpdate) -> FolderResponse:
    folder_ref = _folders_ref(uid).document(folder_id)
    doc = folder_ref.get()
    if not doc.exists:
        raise ValueError("폴더를 찾을 수 없습니다.")
    folder_ref.update({"name": data.name})
    updated = {**doc.to_dict(), "name": data.name}
    item_count = len(list(folder_ref.collection("items").stream()))
    return FolderResponse(**updated, item_count=item_count)


def delete_folder(uid: str, folder_id: str) -> None:
    folder_ref = _folders_ref(uid).document(folder_id)
    if not folder_ref.get().exists:
        raise ValueError("폴더를 찾을 수 없습니다.")
    for item in folder_ref.collection("items").stream():
        item.reference.delete()
    folder_ref.delete()


def add_item(uid: str, folder_id: str, data: FolderItemCreate) -> FolderItemResponse:
    folder_ref = _folders_ref(uid).document(folder_id)
    if not folder_ref.get().exists:
        raise ValueError("폴더를 찾을 수 없습니다.")
    now = datetime.utcnow().isoformat()
    doc = {**data.model_dump(), "saved_at": now}
    folder_ref.collection("items").document(data.content_id).set(doc)
    return FolderItemResponse(**doc)


def get_items(uid: str, folder_id: str) -> list[FolderItemResponse]:
    folder_ref = _folders_ref(uid).document(folder_id)
    if not folder_ref.get().exists:
        raise ValueError("폴더를 찾을 수 없습니다.")
    docs = folder_ref.collection("items").stream()
    return [FolderItemResponse(**doc.to_dict()) for doc in docs]


def remove_item(uid: str, folder_id: str, content_id: str) -> None:
    item_ref = _folders_ref(uid).document(folder_id).collection("items").document(content_id)
    if not item_ref.get().exists:
        raise ValueError("자료를 찾을 수 없습니다.")
    item_ref.delete()
