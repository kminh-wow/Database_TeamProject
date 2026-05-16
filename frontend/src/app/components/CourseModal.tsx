import { useState, useEffect } from 'react'
import { X, Youtube, FileText, BookOpen, ThumbsUp, ThumbsDown, Star, ExternalLink, Loader2, ArrowUpDown } from 'lucide-react'
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
type SortType = 'likes' | 'recent'

const _voteCache: Record<string, 'like' | 'dislike'> = {}

const typeIcon = (type: string) => {
  if (type === 'youtube') return <Youtube className="w-4 h-4" style={{ color: '#C0392B' }} />
  if (type === 'blog') return <FileText className="w-4 h-4" style={{ color: '#2980B9' }} />
  return <BookOpen className="w-4 h-4" style={{ color: '#27AE60' }} />
}

const typeLabel = (type: string) => {
  if (type === 'youtube') return 'YouTube'
  if (type === 'blog') return '블로그'
  if (type === 'pdf') return 'PDF'
  return type
}

export default function CourseModal({ course, onClose }: CourseModalProps) {
  const navigate = useNavigate()
  const { user } = useApp()

  const [tab, setTab] = useState<TabType>('ai')
  const [sort, setSort] = useState<SortType>('likes')
  const [aiContents, setAiContents] = useState<ContentItem[]>([])
  const [userResources, setUserResources] = useState<ResourceItem[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [votes, setVotes] = useState<Record<string, 'like' | 'dislike' | null>>(() => ({ ..._voteCache }))
  const [folderTarget, setFolderTarget] = useState<ResourceItem | null>(null)

  useEffect(() => {
    setAiLoading(true)
    getAIContents(course.course_id)
      .then(res => setAiContents(res.contents))
      .catch(() => toast.error('AI 추천 자료를 불러오지 못했습니다.'))
      .finally(() => setAiLoading(false))

    setUserLoading(true)
    getResources(course.course_id)
      .then(res => setUserResources(res))
      .catch(() => {})
      .finally(() => setUserLoading(false))
  }, [course.course_id])

  const handleFeedback = async (contentId: string, action: 'like' | 'dislike') => {
    if (!user) { toast.error('로그인이 필요합니다.'); return }
    if (votes[contentId] === action) return
    try {
      const res = await addFeedback(contentId, action)
      _voteCache[contentId] = action
      setVotes(prev => ({ ...prev, [contentId]: action }))
      setUserResources(prev =>
        prev.map(r => r.content_id === contentId
          ? { ...r, like_count: res.like_count, dislike_count: res.dislike_count }
          : r
        )
      )
      setAiContents(prev =>
        prev.map(r => r.content_id === contentId
          ? { ...r, like_count: res.like_count, dislike_count: res.dislike_count }
          : r
        )
      )
    } catch {
      toast.error('피드백 처리에 실패했습니다.')
    }
  }

  const sortedAi = [...aiContents].sort((a, b) =>
    sort === 'recent'
      ? (b.created_at ?? '').localeCompare(a.created_at ?? '')
      : b.like_count - a.like_count
  )
  const sortedUser = [...userResources].sort((a, b) =>
    sort === 'recent'
      ? (b.created_at ?? '').localeCompare(a.created_at ?? '')
      : b.like_count - a.like_count
  )

  const courseTypeLabel: Record<string, string> = {
    '전공필수': '전필', '전공기초': '핵심', '전공선택': '심화',
  }
  const courseTypeColor: Record<string, string> = {
    '전공필수': '#E53E3E', '전공기초': '#3182CE', '전공선택': '#38A169',
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {course.year && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: '#F0F4F4', color: '#4A7C7E' }}>
                    {course.year}학년
                  </span>
                )}
                <span className="text-xs text-gray-400 font-mono">{course.course_id}</span>
                {course.course_type && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                    style={{ background: courseTypeColor[course.course_type] || '#888' }}>
                    {courseTypeLabel[course.course_type] || course.course_type}
                  </span>
                )}
              </div>
              <button onClick={onClose}
                className="text-gray-300 hover:text-gray-500 transition-colors p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{course.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {course.credits && <span>{course.credits}학점</span>}
              {course.name_en && <><span>·</span><span>{course.name_en}</span></>}
            </div>
            {course.description && (
              <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* 탭 + 정렬 */}
          <div className="flex items-center justify-between px-4 border-b border-gray-100">
            <div className="flex">
              <button
                onClick={() => setTab('ai')}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
                style={{
                  color: tab === 'ai' ? '#4A7C7E' : '#ABABAB',
                  borderBottom: tab === 'ai' ? '2px solid #7AACAE' : '2px solid transparent',
                }}
              >
                🤖 AI 추천
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: tab === 'ai' ? '#E8F4F4' : '#F5F5F5', color: tab === 'ai' ? '#4A7C7E' : '#999' }}>
                  {aiContents.length}
                </span>
              </button>
              <button
                onClick={() => setTab('user')}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors cursor-pointer hover:opacity-80"
                style={{
                  color: tab === 'user' ? '#4A7C7E' : '#ABABAB',
                  borderBottom: tab === 'user' ? '2px solid #7AACAE' : '2px solid transparent',
                }}
              >
                👥 사용자 공유
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: tab === 'user' ? '#E8F4F4' : '#F5F5F5', color: tab === 'user' ? '#4A7C7E' : '#999' }}>
                  {userResources.length}
                </span>
              </button>
            </div>

            {/* 정렬 */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
              <button
                onClick={() => setSort('likes')}
                className="text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer hover:opacity-70"
                style={{
                  background: sort === 'likes' ? '#F0F4F4' : 'transparent',
                  color: sort === 'likes' ? '#4A7C7E' : '#ABABAB',
                  fontWeight: sort === 'likes' ? 600 : 400,
                }}
              >
                추천순
              </button>
              <button
                onClick={() => setSort('recent')}
                className="text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer hover:opacity-70"
                style={{
                  background: sort === 'recent' ? '#F0F4F4' : 'transparent',
                  color: sort === 'recent' ? '#4A7C7E' : '#ABABAB',
                  fontWeight: sort === 'recent' ? 600 : 400,
                }}
              >
                최신순
              </button>
            </div>
          </div>

          {/* 탭 설명 */}
          <div className="px-6 py-2 text-xs text-gray-400"
            style={{ background: '#FAFAFA' }}>
            {tab === 'ai'
              ? '🤖 AI가 선별한 검증된 학습 자료입니다. 신뢰도 높은 콘텐츠를 우선 제공합니다.'
              : '👥 학우들이 직접 공유한 자료입니다. 좋아요로 신뢰도를 높여주세요.'}
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {/* AI 탭 */}
            {tab === 'ai' && (
              aiLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">AI가 자료를 추천하는 중...</span>
                </div>
              ) : sortedAi.length === 0 ? (
                <p className="text-center text-gray-300 text-sm py-12">추천 자료가 없습니다.</p>
              ) : (
                sortedAi.map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 p-4 transition-all hover:border-teal-200 hover:shadow-sm"
                    style={{ background: '#FAFAFA' }}>
                    <div className="flex items-start gap-3">
                      {/* 북마크 */}
                      <button
                        onClick={() => user ? setFolderTarget({
                          content_id: item.content_id,
                          title: item.title,
                          url: item.url,
                          type: item.type,
                          source: 'ai',
                          like_count: item.like_count,
                          dislike_count: item.dislike_count,
                        }) : navigate('/auth')}
                        className="mt-0.5 flex-shrink-0 transition-colors cursor-pointer hover:scale-110"
                        style={{ color: '#CCC' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F5A623' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CCC' }}
                      >
                        <Star className="w-4 h-4" />
                      </button>

                      {/* 아이콘 */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#F0F0F0' }}>
                        {typeIcon(item.type)}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-md"
                            style={{ background: '#F0F0F0', color: '#888' }}>
                            {typeLabel(item.type)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md"
                            style={{ background: '#E8F4F4', color: '#4A7C7E' }}>
                            🤖 AI 추천
                          </span>
                        </div>
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 transition-colors"
                          style={{ color: '#7AACAE' }}>
                          자료 보기 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* 피드백 */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleFeedback(item.content_id, 'like')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer hover:brightness-95 active:scale-95"
                          style={{
                            background: votes[item.content_id] === 'like' ? '#EDF7ED' : '#F0F0F0',
                            color: votes[item.content_id] === 'like' ? '#3D8B3D' : '#888',
                          }}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {item.like_count}
                        </button>
                        <button
                          onClick={() => handleFeedback(item.content_id, 'dislike')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer hover:brightness-95 active:scale-95"
                          style={{
                            background: votes[item.content_id] === 'dislike' ? '#FDECEA' : '#F0F0F0',
                            color: votes[item.content_id] === 'dislike' ? '#B03A2E' : '#888',
                          }}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          {item.dislike_count}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* 사용자 자료 탭 */}
            {tab === 'user' && (
              userLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">불러오는 중...</span>
                </div>
              ) : sortedUser.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-300 text-sm mb-1">아직 공유된 자료가 없습니다.</p>
                  <p className="text-gray-300 text-xs">첫 번째 자료를 공유해보세요!</p>
                </div>
              ) : (
                sortedUser.map(resource => (
                  <div key={resource.content_id} className="rounded-xl border border-gray-100 p-4"
                    style={{ background: '#FAFAFA' }}>
                    <div className="flex items-start gap-3">
                      {/* 북마크 */}
                      <button
                        onClick={() => user ? setFolderTarget(resource) : navigate('/auth')}
                        className="mt-0.5 flex-shrink-0 transition-colors cursor-pointer hover:scale-110"
                        style={{ color: '#CCC' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#F5A623' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#CCC' }}
                      >
                        <Star className="w-4 h-4" />
                      </button>

                      {/* 아이콘 */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: '#F0F0F0' }}>
                        {typeIcon(resource.type)}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">
                          {resource.title}
                        </p>
                        {resource.description && (
                          <p className="text-xs text-gray-500 mb-1 leading-snug">{resource.description}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-md"
                            style={{ background: '#F0F0F0', color: '#888' }}>
                            {typeLabel(resource.type)}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-md"
                            style={{ background: '#F5F0FF', color: '#7B5EA7' }}>
                            👥 사용자
                          </span>
                        </div>
                        <a href={resource.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs flex items-center gap-1 transition-colors"
                          style={{ color: '#7AACAE' }}>
                          자료 보기 <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* 피드백 */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleFeedback(resource.content_id, 'like')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer hover:brightness-95 active:scale-95"
                          style={{
                            background: votes[resource.content_id] === 'like' ? '#EDF7ED' : '#F0F0F0',
                            color: votes[resource.content_id] === 'like' ? '#3D8B3D' : '#888',
                          }}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {resource.like_count}
                        </button>
                        <button
                          onClick={() => handleFeedback(resource.content_id, 'dislike')}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer hover:brightness-95 active:scale-95"
                          style={{
                            background: votes[resource.content_id] === 'dislike' ? '#FDECEA' : '#F0F0F0',
                            color: votes[resource.content_id] === 'dislike' ? '#B03A2E' : '#888',
                          }}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          {resource.dislike_count}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* 푸터 */}
          <div className="border-t border-gray-100 p-4">
            <button
              onClick={() => user ? navigate('/submit-resource', { state: { course } }) : navigate('/auth')}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: '#7AACAE' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#6B9FA1')}
              onMouseLeave={e => (e.currentTarget.style.background = '#7AACAE')}
            >
              {user ? '+ 자료 공유하기' : '+ 로그인 후 자료 공유하기'}
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