import { apiClient } from './client'
import { ContentsResponse } from '../types'

export const getAIContents = async (courseId: string): Promise<ContentsResponse> => {
  const res = await apiClient.get(`/api/courses/${courseId}/contents`)
  return res.data
}