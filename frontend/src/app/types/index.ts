export interface Department { name: string }

export interface Course {
  course_id: string
  name: string
  name_en?: string
  year?: number
  course_type?: string
  credits?: number
  hours?: number
  description?: string
}

export interface NodeData {
  label: React.ReactNode
  year?: number
  course_type?: string
  credits?: number
}

export interface FlowNode {
  id: string
  position: { x: number; y: number }
  data: NodeData
  type?: string
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
}

export interface CurriculumGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface ContentItem {
  content_id: string
  title: string
  url: string
  type: string
  difficulty?: string
  description?: string
  source: 'ai' | 'user'
  like_count: number
  dislike_count: number
}

export interface ContentsResponse {
  course_id: string
  contents: ContentItem[]
  cached: boolean
}

export interface ResourceItem {
  content_id: string
  title: string
  url: string
  type: string
  source: 'ai' | 'user'
  like_count: number
  dislike_count: number
}

export interface ResourcesResponse {
  course_id: string
  resources: ResourceItem[]
}

// 신규: 백엔드 Folder/FolderItem 타입
export interface Folder {
  folder_id: string
  name: string
  created_at: string
  item_count: number
}

export interface FolderItem {
  content_id: string
  title: string
  url: string
  type: string
  course_id: string
  course_name?: string
  saved_at: string
}