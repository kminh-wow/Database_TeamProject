import { useState, useEffect } from 'react'
import { X, Youtube, FileText, BookOpen, ThumbsUp, ThumbsDown, Bookmark, ExternalLink, Loader2 } from 'lucide-react'
import { Course, ResourceItem, ContentItem } from '../types'
import { getResources, addFeedback } from '../api/resources'
import { getAIContents } from '../api/contents'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import FolderSelectModal from './FolderSelectModal'

interface CourseModalProps {
  course: Course
  onClose: () => void
}

type TabType = 'ai' | 'user'

const typeIcon = (type: string) => {
  if (type === 'youtube') return <Youtube className="w-4 h-4 text-red-500" />
  if (type === 'blog') return <FileText className="w-4 h-4 text-blue-500" />
  return <BookOpen className="w-4 h-4 text-green-500" />
}

const typeLabel = (type: string) => {
  if (type === 'youtube') return 'YouTube'
  if (type === 'blog') return '블로그'
  if (type === 'pdf') return 'PDF'
  return type
}

export default function CourseModal({ course, onClose }: CourseModalProps) {
  const navigate = useNavigate()
  const { isResourceSaved, saveResource, unsaveResource, getSavedFolder, folders } = useApp()

  const [tab, setTab] = useState<TabType>('ai')
  const [aiContents, setAiContents] = useState<ContentItem[]>([])
  const [userResources, setUserResources] = useState<ResourceItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [votes, setVotes] = useState<Record<string, 'like' | 'dislike' | null>>({})
  const [folderTarget, setFolderTarget] = useState<ResourceItem | null>(null)

  useEffect(() => {
    // AI 추천 로드
    setAiLoading(true)
    getAIContents(course.course_id)
      .then(res => setAiContents(res.contents))
      .catch(() => toast.error('AI 추천 자료를 불러오지 못했습니다.'))
      .finally(() => setAiLoading(false))

    // 사용자 자료 로드
    setUserLoading(true)
    getResources(course.course_id)
      .then(res => setUserResources(res.filter(r => r.source === 'user')))
      .catch(() => {})
      .finally(() => setUserLoading(false))
  }, [course.course_id])

  const handleFeedback = async (resource: ResourceItem, action: 'like' | 'dislike') => {
    const current = votes[resource.content_id]
    if (current === action) return
    try {
      const res = await addFeedback(resource.content_id, action)
      setVotes(prev => ({ ...prev, [resource.content_id]: action }))
      setUserResources(prev =>
        prev.map(r => r.content_id === resource.content_id
          ? { ...r, like_count: res.like_count, dislike_count: res.dislike_count }
          : r
        )
      )
    } catch {
      toast.error('피드백 처리에 실패했습니다.')
    }
  }

  const handleSave = (resource: ResourceItem) => {
    if (isResourceSaved(resource.content_id)) {
      unsaveResource(resource.content_id)
      toast.success('저장 취소됨')
    } else {
      setFolderTarget(resource)
    }
  }

  const courseTypeLabel: Record<string, string> = {
    '전공필수': '전필', '전공기초': '전기', '전공선택': '전선',
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="px-5 py-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {course.course_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: '#EBF5F5', color: '#3A6E70' }}>
                      {courseTypeLabel[course.course_type] || course.course_type}
                    </span>
                  )}
                  {course.year && (
                    <span className="text-xs text-gray-400">{course.year}학년</span>
                  )}
                  {course.credits && (
                    <span className="text-xs text-gray-400">{course.credits}학점</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{course.name}</h2>
                {course.name_en && (
                  <p className="text-xs text-gray-400 mt-0.5">{course.name_en}</p>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            {course.description && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* 탭 */}
          <div className="flex border-b">
            {(['ai', 'user'] as TabType[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-3 text-sm font-semibold transition-colors"
                style={{
                  color: tab === t ? '#3A6E70' : '#9CA3AF',
                  borderBottom: tab === t ? '2px solid #6B9FA1' : '2px solid transparent',
                  background: tab === t ? '#F0F7F7' : 'transparent',
                }}
              >
                {t === 'ai' ? '🤖 AI 추천' : '👥 사용자 자료'}
              </button>
            ))}
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'ai' && (
              <div className="p-4 space-y-3">
                {aiLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">AI가 자료를 추천하는 중...</span>
                  </div>
                ) : aiContents.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-12">추천 자료가 없습니다.</p>
                ) : (
                  aiContents.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {typeIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-400">{typeLabel(item.type)}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </a>
                  ))
                )}
              </div>
            )}

            {tab === 'user' && (
              <div className="p-4 space-y-3">
                {userLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">불러오는 중...</span>
                  </div>
                ) : userResources.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-12">등록된 자료가 없습니다.</p>
                ) : (
                  userResources.map(resource => {
                    const saved = isResourceSaved(resource.content_id)
                    const voted = votes[resource.content_id]
                    return (
                      <div key={resource.content_id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          {typeIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 truncate hover:text-teal-600 block">
                            {resource.title}
                          </a>
                          <p className="text-xs text-gray-400">{typeLabel(resource.type)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleFeedback(resource, 'like')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              voted === 'like' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                            {resource.like_count}
                          </button>
                          <button
                            onClick={() => handleFeedback(resource, 'dislike')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              voted === 'dislike' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-red-50'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                            {resource.dislike_count}
                          </button>
                          <button
                            onClick={() => handleSave(resource)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              saved ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400 hover:bg-amber-50'
                            }`}
                          >
                            <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="border-t p-4">
            <button
              onClick={() => navigate('/submit-resource', { state: { course } })}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 border-dashed border-teal-300 text-teal-600 hover:bg-teal-50 transition-colors"
            >
              + 학습 자료 등록하기
            </button>
          </div>
        </div>
      </div>

      {folderTarget && (
        <FolderSelectModal
          resource={folderTarget}
          courseId={course.course_id}
          courseName={course.name}
          onClose={() => setFolderTarget(null)}
        />
      )}
    </>
  )
}