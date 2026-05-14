import { apiClient } from './client'
import { Folder, FolderItem } from '../types'

export const getFolders = async (): Promise<Folder[]> => {
  const res = await apiClient.get<Folder[]>('/api/folders')
  return res.data
}

export const createFolder = async (name: string): Promise<Folder> => {
  const res = await apiClient.post<Folder>('/api/folders', { name })
  return res.data
}

export const renameFolder = async (folderId: string, name: string): Promise<Folder> => {
  const res = await apiClient.patch<Folder>(`/api/folders/${folderId}`, { name })
  return res.data
}

export const deleteFolder = async (folderId: string): Promise<void> => {
  await apiClient.delete(`/api/folders/${folderId}`)
}

export const addItemToFolder = async (
  folderId: string,
  item: {
    content_id: string
    title: string
    url: string
    type: string
    course_id: string
    course_name?: string
  }
): Promise<FolderItem> => {
  const res = await apiClient.post<FolderItem>(`/api/folders/${folderId}/items`, item)
  return res.data
}

export const getItemsInFolder = async (folderId: string): Promise<FolderItem[]> => {
  const res = await apiClient.get<FolderItem[]>(`/api/folders/${folderId}/items`)
  return res.data
}

export const removeItemFromFolder = async (folderId: string, contentId: string): Promise<void> => {
  await apiClient.delete(`/api/folders/${folderId}/items/${contentId}`)
}