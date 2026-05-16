import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register } = useApp()

  const [mode, setMode] = useState<'login' | 'signup'>(
    location.state?.mode === 'signup' ? 'signup' : 'login'
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', nickname: '', password: '', confirmPassword: '' })

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const result = await login(form.email, form.password)
        if (result.success) {
          toast.success('로그인되었습니다!')
          navigate(location.state?.from || '/')
        } else {
          toast.error(result.message)
        }
      } else {
        if (!form.email || !form.nickname || !form.password) { toast.error('모든 항목을 입력해주세요.'); return }
        if (form.nickname.length < 2) { toast.error('닉네임은 2자 이상이어야 합니다.'); return }
        if (form.password !== form.confirmPassword) { toast.error('비밀번호가 일치하지 않습니다.'); return }
        const result = await register(form.email, form.nickname, form.password)
        if (result.success) {
          toast.success(result.message)
          navigate(location.state?.from || '/')
        } else {
          toast.error(result.message)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #F0F7F7 0%, #EAF3F3 50%, #E2EEEE 100%)' }}>
      <header className="px-6 py-5 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Logo className="w-7 h-7" />
        <span className="text-lg font-bold tracking-tight" style={{ color: '#3A6E70' }}>CourseNest</span>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex border-b">
              {(['login', 'signup'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className="flex-1 py-4 text-sm transition-all cursor-pointer hover:opacity-80"
                  style={{
                    fontWeight: mode === m ? 700 : 500,
                    background: mode === m ? '#F0F7F7' : 'transparent',
                    color: mode === m ? '#3A6E70' : '#6B7280',
                    borderBottom: mode === m ? '2px solid #6B9FA1' : '2px solid transparent',
                  }}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>

            <div className="p-8">
              <div className="mb-8 text-center">
                <div className="flex justify-center">
                  <Logo className="w-16 h-16" />
                </div>

                <h1 className="text-2xl font-bold">
                  {mode === 'login' ? '다시 만나요 👋' : 'CourseNest에 오신걸 환영해요 🎉'}
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                  {mode === 'login' ? '학습 여정을 계속 이어나가세요' : '나만의 학습 공간을 만들어보세요'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">이메일</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="student@ssu.ac.kr"
                      value={form.email} onChange={e => update('email', e.target.value)}
                      className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl" required />
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="font-semibold">닉네임</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="nickname" placeholder="2자 이상 (예: 숭실이)"
                        value={form.nickname} onChange={e => update('nickname', e.target.value)}
                        className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-xl" required />
                    </div>
                    <p className="text-xs text-gray-400">자료 등록 시 이 닉네임이 표시됩니다</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="password" type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'signup' ? '6자 이상 입력' : '비밀번호 입력'}
                      value={form.password} onChange={e => update('password', e.target.value)}
                      className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-semibold">비밀번호 확인</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                        placeholder="비밀번호 다시 입력"
                        value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
                        className={`pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl ${
                          form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-300' : ''
                        }`} required />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.confirmPassword && form.password !== form.confirmPassword && (
                      <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-12 text-white rounded-xl shadow-md text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#6B9FA1' }}>
                  {loading ? '처리중...' : mode === 'login' ? '로그인' : '회원가입'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  {mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
                  <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="underline font-semibold" style={{ color: '#6B9FA1' }}>
                    {mode === 'login' ? '회원가입' : '로그인'}
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}