import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ArrowLeft, Send, Youtube, FileText, BookOpen, Link as LinkIcon, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Course } from '../types'
import { createResource } from '../api/resources'
import { toast } from 'sonner'
import Logo from '../components/Logo'
import { useApp } from '../context/AppContext'

export default function SubmitResource() {
  const navigate = useNavigate()
  const location = useLocation()
  const course = location.state?.course as Course | undefined
  const { user } = useApp()

  const [formData, setFormData] = useState({
    title: '',
    type: 'youtube' as string,
    url: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.url) { toast.error('제목과 URL을 입력해주세요'); return }
    if (!course) { toast.error('과목 정보가 없습니다'); return }

    setLoading(true)
    try {
      await createResource(course.course_id, {
        title: formData.title,
        url: formData.url,
        type: formData.type,
        description: formData.description || undefined,
      })
      toast.success('학습 자료가 등록되었습니다!')
      setTimeout(() => navigate(-1), 1000)
    } catch {
      toast.error('등록에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const resourceTypes = [
    { value: 'youtube', label: '유튜브', Icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' },
    { value: 'blog', label: '블로그', Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { value: 'lecture', label: '강의자료', Icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { value: 'book', label: '교재', Icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100">
      <header className="px-6 py-4 flex items-center gap-3 border-b bg-white/80 backdrop-blur-sm">
        <Button variant="ghost" onClick={() => navigate(-1)} className="h-9 w-9 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Logo className="w-6 h-6" />
        <span className="text-base font-bold">CourseNest</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">학습 자료 공유</h1>
          {course && (
            <p className="text-base text-gray-600">
              <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-sm font-semibold mr-2">
                {course.course_id}
              </span>
              {course.name}
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* 닉네임 표시 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">작성자</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={user?.displayName || '로그인이 필요합니다'}
                  className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-sm" readOnly />
              </div>
              {!user && (
                <p className="text-xs text-gray-400">
                  <button type="button" onClick={() => navigate('/auth')}
                    className="text-amber-600 hover:underline font-semibold">로그인</button>하면 자료를 등록할 수 있습니다
                </p>
              )}
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">자료 제목 <span className="text-red-500">*</span></Label>
              <Input placeholder="예: 자료구조 완전정복 강의"
                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-12 px-4 bg-gray-50 border-gray-200 rounded-xl text-sm" />
            </div>

            {/* 유형 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">자료 유형 <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-4 gap-3">
                {resourceTypes.map(({ value, label, Icon, color, bg }) => (
                  <button key={value} type="button" onClick={() => setFormData({ ...formData, type: value })}
                    className={`p-4 rounded-2xl transition-all cursor-pointer ${
                      formData.type === value
                        ? 'bg-amber-50 border-2 border-amber-400 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-amber-300 hover:bg-amber-50/50'
                    }`}>
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="text-xs text-center font-semibold">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">자료 URL <span className="text-red-500">*</span></Label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input type="url" placeholder="https://..."
                  value={formData.url} onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl text-sm" />
              </div>
            </div>

            {/* 설명 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">자료 설명 <span className="text-gray-400">(선택)</span></Label>
              <Textarea placeholder="이 자료가 어떤 점에서 도움이 되었는지 알려주세요"
                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="min-h-24 bg-gray-50 border-gray-200 rounded-xl text-sm resize-none" />
            </div>

            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <h4 className="mb-2 text-sm font-bold">📌 공유 안내</h4>
              <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                <li>• 저작권을 침해하지 않는 자료만 공유해주세요</li>
                <li>• 허위 또는 부적절한 자료는 삭제될 수 있습니다</li>
                <li>• 추천을 많이 받은 자료는 AI 추천 탭에 등재될 수 있습니다</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}
                className="flex-1 h-12 border-2 rounded-xl text-sm font-semibold">취소</Button>
              <Button type="submit" disabled={loading || !user}
                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-60">
                <Send className="w-4 h-4 mr-2" />
                {loading ? '등록 중...' : '공유하기'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}