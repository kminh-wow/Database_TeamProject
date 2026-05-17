import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Mail, RefreshCw } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import { Button } from '../components/ui/button'
import { useApp } from '../context/AppContext'
import { toast } from 'sonner'
import { auth } from '../lib/firebase'
import Logo from '../components/Logo'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const { user, logout } = useApp()
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)

  const handleCheck = async () => {
    if (!auth.currentUser) return
    setChecking(true)
    try {
      await auth.currentUser.reload()
      if (auth.currentUser.emailVerified) {
        toast.success('이메일 인증이 완료되었습니다!')
        window.location.replace('/')
      } else {
        toast.error('아직 인증되지 않았습니다. 메일함을 다시 확인해주세요.')
      }
    } catch {
      toast.error('확인에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setChecking(false)
    }
  }

  const handleResend = async () => {
    if (!auth.currentUser) return
    setResending(true)
    try {
      await sendEmailVerification(auth.currentUser)
      toast.success('인증 메일을 재발송했습니다.')
    } catch {
      toast.error('재발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setResending(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #F0F7F7 0%, #EAF3F3 50%, #E2EEEE 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <Logo className="w-16 h-16 mx-auto mb-6" />
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: '#F0F7F7' }}>
          <Mail className="w-7 h-7" style={{ color: '#6B9FA1' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2">이메일을 인증해주세요</h1>
        <p className="text-sm mb-1 font-semibold" style={{ color: '#6B9FA1' }}>{user?.email}</p>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          위 주소로 인증 링크를 발송했습니다.<br />
          메일함을 확인하고 링크를 클릭한 뒤<br />
          아래 버튼을 눌러주세요.
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleCheck}
            disabled={checking}
            className="w-full h-12 text-white font-bold"
            style={{ background: '#6B9FA1' }}
          >
            {checking ? '확인 중...' : '인증 완료했어요'}
          </Button>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={resending}
            className="w-full h-12"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {resending ? '발송 중...' : '인증 메일 재발송'}
          </Button>
          <button
            onClick={handleLogout}
            className="block w-full text-sm text-gray-400 hover:text-gray-600 transition-colors mt-2"
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  )
}
