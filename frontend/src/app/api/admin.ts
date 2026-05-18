import { apiClient } from './client'

export interface AdminContentItem {
  content_id: string
  title: string
  url: string
  type: string
  source: 'ai' | 'user'
  course_id: string
  course_name: string
  like_count: number
  dislike_count: number
  created_at?: string
}

export const getAdminContents = async (): Promise<AdminContentItem[]> => {
  const res = await apiClient.get('/api/admin/contents')
  return res.data
}

export const deleteAdminContent = async (contentId: string): Promise<void> => {
  await apiClient.delete(`/api/admin/contents/${contentId}`)
}

export const bulkDeleteContents = async (contentIds: string[]): Promise<{ deleted: number }> => {
  const res = await apiClient.delete('/api/admin/contents/bulk', { data: { content_ids: contentIds } })
  return res.data
}

export const resetAllAiContents = async (): Promise<{ deleted: number }> => {
  const res = await apiClient.delete('/api/admin/contents/all')
  return res.data
}
