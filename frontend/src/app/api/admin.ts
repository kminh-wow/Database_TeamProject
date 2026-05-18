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
