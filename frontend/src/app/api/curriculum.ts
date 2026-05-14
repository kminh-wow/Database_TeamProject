import { apiClient } from './client'
import { Department, CurriculumGraph, Course } from '../types'

export const getDepartments = async (): Promise<Department[]> => {
  const res = await apiClient.get('/api/departments')
  return res.data
}

export const getCurriculumGraph = async (departmentName: string): Promise<CurriculumGraph> => {
  const res = await apiClient.get(`/api/curriculum/${encodeURIComponent(departmentName)}`)
  return res.data
}

export const getCourseDetail = async (courseId: string): Promise<Course> => {
  const res = await apiClient.get(`/api/courses/${courseId}`)
  return res.data
}