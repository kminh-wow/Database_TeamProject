import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Trash2, ExternalLink, Loader2, ArrowLeft, Youtube, FileText, BookOpen, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getAdminContents, deleteAdminContent, bulkDeleteContents, resetAllAiContents, AdminContentItem } from '../api/admin'
import { toast } from 'sonner'

const ADMIN_EMAILS = import.meta.env.VITE_ADMIN_EMAILS
  ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((e: string) => e.trim())
  : ['akask9635@gmail.com', 'rkddlstjs707@gmail.com', 'kminh9635@daum.net', 'rkddlstjs707@soongsil.ac.kr']

const typeIcon = (type: string) => {
  if (type === 'youtube') return <Youtube className="w-4 h-4" style={{ color: '#C0392B' }} />
  if (type === 'blog') return <FileText className="w-4 h-4" style={{ color: '#2980B9' }} />
  return <BookOpen className="w-4 h-4" style={{ color: '#27AE60' }} />
}

const typeLabel: Record<string, string> = {
  youtube: 'YouTube', blog: '블로그', pdf: 'PDF',
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, authLoading } = useApp()

  const [contents, setContents] = useState<AdminContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const [filterSource, setFilterSource] = useState<'all' | 'ai' | 'ai_syllabus' | 'user'>('all')
  const [filterType, setFilterType] = useState<'all' | 'youtube' | 'blog' | 'pdf'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
      navigate('/', { replace: true })
      return
    }
    getAdminContents()
      .then(setContents)
      .catch(() => toast.error('콘텐츠를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [user, authLoading, navigate])

  const filtered = useMemo(() => {
    return contents.filter(item => {
      if (filterSource !== 'all' && item.source !== filterSource) return false
      if (filterType !== 'all' && item.type !== filterType) return false
      if (search) {
        const q = search.toLowerCase()
        return item.course_name.toLowerCase().includes(q) || item.title.toLowerCase().includes(q)
      }
      return true
    })
  }, [contents, filterSource, filterType, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selected.has(item.content_id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(item => next.delete(item.content_id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(item => next.add(item.content_id))
        return next
      })
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = async (contentId: string) => {
    setDeleting(contentId)
    try {
      await deleteAdminContent(contentId)
      setContents(prev => prev.filter(c => c.content_id !== contentId))
      setSelected(prev => { const next = new Set(prev); next.delete(contentId); return next })
      toast.success('삭제되었습니다.')
    } catch (e: any) {
      if (e?.response?.status !== 403) toast.error('삭제에 실패했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    if (!ids.length) return
    setBulkDeleting(true)
    try {
      const res = await bulkDeleteContents(ids)
      setContents(prev => prev.filter(c => !selected.has(c.content_id)))
      setSelected(new Set())
      toast.success(`${res.deleted}개 삭제되었습니다.`)
    } catch (e: any) {
      if (e?.response?.status !== 403) toast.error('일괄 삭제에 실패했습니다.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleResetAll = async () => {
    setResetting(true)
    setShowResetConfirm(false)
    try {
      const res = await resetAllAiContents()
      setContents(prev => prev.filter(c => c.source !== 'ai'))
      setSelected(new Set())
      toast.success(`AI 콘텐츠 ${res.deleted}개 전체 삭제되었습니다.`)
    } catch (e: any) {
      if (e?.response?.status !== 403) toast.error('초기화에 실패했습니다.')
    } finally {
      setResetting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">관리자 페이지</h1>
          <p className="text-xs text-gray-400">전체 콘텐츠 관리</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-400">
            총 <span className="font-semibold text-gray-700">{filtered.length}</span>개
            {filtered.length !== contents.length && ` / ${contents.length}개`}
          </span>
          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: '#E53E3E' }}
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            AI 전체 초기화
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="과목명 또는 제목 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-400 w-56"
        />
        <div className="flex items-center gap-1">
          {(['all', 'ai', 'ai_syllabus', 'user'] as const).map(s => (
            <button key={s} onClick={() => setFilterSource(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: filterSource === s ? '#E8F4F4' : '#F5F5F5', color: filterSource === s ? '#4A7C7E' : '#888' }}>
              {s === 'all' ? '전체' : s === 'ai' ? '🤖 AI' : s === 'ai_syllabus' ? '📋 실라버스' : '👥 사용자'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'youtube', 'blog', 'pdf'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: filterType === t ? '#E8F4F4' : '#F5F5F5', color: filterType === t ? '#4A7C7E' : '#888' }}>
              {t === 'all' ? '전체 타입' : typeLabel[t] ?? t}
            </button>
          ))}
        </div>

        {/* 선택 시 일괄 삭제 버튼 */}
        {selected.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: '#E53E3E' }}
          >
            {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            선택 삭제 ({selected.size}개)
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">콘텐츠가 없습니다.</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-36">과목</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">제목</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">타입</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">출처</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-16">👍/👎</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-16">URL</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 w-16">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr
                    key={item.content_id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    style={{ background: selected.has(item.content_id) ? '#FFF9F9' : undefined }}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(item.content_id)}
                        onChange={() => toggleSelect(item.content_id)}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[140px]">
                      {item.course_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-800 font-medium">{item.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {typeIcon(item.type)}
                        <span className="text-xs text-gray-500">{typeLabel[item.type] ?? item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: item.source === 'ai' ? '#E8F4F4' : item.source === 'ai_syllabus' ? '#FFF7E6' : '#F5F0FF',
                          color: item.source === 'ai' ? '#4A7C7E' : item.source === 'ai_syllabus' ? '#B07D2A' : '#7B5EA7',
                        }}>
                        {item.source === 'ai' ? '🤖 AI' : item.source === 'ai_syllabus' ? '📋 실라버스' : '👥 사용자'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {item.like_count}/{item.dislike_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(item.content_id)}
                        disabled={deleting === item.content_id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deleting === item.content_id
                          ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 전체 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: '#FEF2F2' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#E53E3E' }} />
              </div>
              <h2 className="text-base font-bold text-gray-900">AI 콘텐츠 전체 초기화</h2>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              AI가 생성한 콘텐츠를 전부 삭제합니다. 사용자가 등록한 자료는 유지됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                취소
              </button>
              <button onClick={handleResetAll}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{ background: '#E53E3E' }}>
                전체 삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
