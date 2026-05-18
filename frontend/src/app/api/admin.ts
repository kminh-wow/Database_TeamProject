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
  const all: AdminContentItem[] = []
  const limit = 500
  let skip = 0
  while (true) {
    const res = await apiClient.get('/api/admin/contents', { params: { skip, limit } })
    const batch: AdminContentItem[] = res.data
    all.push(...batch)
    if (batch.length < limit) break
    skip += limit
  }
  return all
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
