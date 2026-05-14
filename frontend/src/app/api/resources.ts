import { apiClient } from './client'
import { ResourceItem, ResourceCreateRequest, FeedbackResponse } from '../types'

export const getResources = async (courseId: string): Promise<ResourceItem[]> => {
  const res = await apiClient.get(`/api/courses/${courseId}/resources`)
  return res.data.resources
}

export const createResource = async (
  courseId: string,
  data: ResourceCreateRequest
): Promise<ResourceItem> => {
  const res = await apiClient.post(`/api/courses/${courseId}/resources`, data)
  return res.data
}

export const addFeedback = async (
  contentId: string,
  action: 'like' | 'dislike'
): Promise<FeedbackResponse> => {
  const res = await apiClient.post(`/api/resources/${contentId}/feedback`, { action })
  return res.data
}