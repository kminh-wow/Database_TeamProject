import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { BookMarked } from 'lucide-react'
import Logo from '../components/Logo'
import { getDepartments } from '../api/curriculum'
import { useApp } from '../context/AppContext'

const MAJOR_TO_COLLEGE: Record<string, string> = {
  // AI대학
  'AI소프트웨어학부': 'AI대학',
  '정보보호학과(계약학과)': 'AI대학',
  // IT대학
  'AI융합학부': 'IT대학',
  '글로벌미디어학부': 'IT대학',
  '디지털미디어학과': 'IT대학',
  '소프트웨어학부': 'IT대학',
  '전자정보공학부 IT융합전공': 'IT대학',
  '전자정보공학부 전자공학전공': 'IT대학',
  '컴퓨터학부': 'IT대학',
  // 건축학부
  '건축공학전공': '건축학부',
  '건축학전공': '건축학부',
  '실내건축전공': '건축학부',
  // 경영대학
  '경영학부': '경영대학',
  '금융학부': '경영대학',
  '벤처경영학과(계약학과)': '경영대학',
  '벤처중소기업학과': '경영대학',
  '복지경영학과(계약학과)': '경영대학',
  '혁신경영학과(계약학과)': '경영대학',
  '회계세무학과(계약학과)': '경영대학',
  '회계학과': '경영대학',
  // 경제통상대학
  '경제학과': '경제통상대학',
  '국제무역학과': '경제통상대학',
  '글로벌통상학과': '경제통상대학',
  '금융경제학과': '경제통상대학',
  // 공과대학
  '기계공학부': '공과대학',
  '산업·정보시스템공학과': '공과대학',
  '신소재공학과': '공과대학',
  '전기공학부': '공과대학',
  '화학공학과': '공과대학',
  // 법과대학
  '국제법무학과': '법과대학',
  '법학과': '법과대학',
  // 사회과학대학
  '사회복지학부': '사회과학대학',
  '언론홍보학과': '사회과학대학',
  '정보사회학과': '사회과학대학',
  '정치외교학과': '사회과학대학',
  '평생교육학과': '사회과학대학',
  '행정학부': '사회과학대학',
  // 인문대학
  '국어국문학과': '인문대학',
  '기독교학과': '인문대학',
  '독어독문학과': '인문대학',
  '불어불문학과': '인문대학',
  '사학과': '인문대학',
  '스포츠학부': '인문대학',
  '영어영문학과': '인문대학',
  '예술창작학부 문예창작전공': '인문대학',
  '예술창작학부 영화예술전공': '인문대학',
  '일어일문학과': '인문대학',
  '중어중문학과': '인문대학',
  '철학과': '인문대학',
  // 자연과학대학
  '물리학과': '자연과학대학',
  '수학과': '자연과학대학',
  '의생명시스템학부': '자연과학대학',
  '정보통계·보험수리학과': '자연과학대학',
  '화학과': '자연과학대학',
}

const COLLEGE_ORDER = [
  'AI대학', 'IT대학', '공과대학', '자연과학대학',
  '경영대학', '경제통상대학', '사회과학대학', '인문대학', '법과대학', '건축학부',
]

export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useApp()

  const [grouped, setGrouped] = useState<Record<string, string[]>>({})
  const [selectedCollege, setSelectedCollege] = useState('')
  const [selectedMajor, setSelectedMajor] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDepartments()
      .then(data => {
        const g: Record<string, string[]> = {}
        data.forEach(d => {
          const college = MAJOR_TO_COLLEGE[d.name] ?? '기타'
          if (!g[college]) g[college] = []
          g[college].push(d.name)
        })
        setGrouped(g)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleStart = () => {
    if (!selectedMajor) return
    navigate(`/curriculum/${encodeURIComponent(selectedMajor)}`)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4F8' }}>

      {/* ── 네비게이션 ── */}
      <header className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
        {/* 왼쪽: 로고 + My Study Room */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Logo className="w-12 h-12" />
            <span className="text-lg font-bold" style={{ color: '#2D5A5C' }}>CourseNest</span>
          </div>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => navigate('/study-room')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700 transition-colors"
          >
            <BookMarked className="w-4 h-4" />
            My Study Room
          </button>
        </div>

        {/* 오른쪽: 자료공유 + 로그인/회원가입 */}
        <div className="flex items-center gap-4">
          {user ? (
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/auth')}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
                style={{ background: '#6B9FA1' }}
              >
                회원가입
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── 메인 컨텐츠 ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        {/* 배지 */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-8 text-sm text-gray-600">
          <span>✨</span>
          <span>숭실대학교 AI 스마트러닝허브</span>
        </div>

        {/* 타이틀 */}
        <h1 className="text-5xl font-black text-center leading-tight mb-4" style={{ color: '#1A2E35' }}>
          내 학과의<br />
          <span style={{ color: '#6B9FA1' }}>학습 지도</span>를<br />
          시작하세요
        </h1>

        <p className="text-center text-gray-500 text-base mb-10 leading-relaxed">
          선수과목부터 트리 시각화, 과목별 검증된 학습 자료<br />
          크라우드소싱 피드백으로 쌓이는 신뢰
        </p>

        {/* 학과 선택 카드 */}
        <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-md">
          {/* 단과대학 선택 */}
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">단과대학</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {loading ? (
              <div className="col-span-2 text-center text-sm text-gray-400 py-3">불러오는 중...</div>
            ) : (
              COLLEGE_ORDER.filter(c => grouped[c]).map(college => (
                <button
                  key={college}
                  onClick={() => { setSelectedCollege(college); setSelectedMajor('') }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                    selectedCollege === college
                      ? 'text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                  style={selectedCollege === college ? { background: '#6B9FA1' } : {}}
                >
                  {college}
                </button>
              ))
            )}
          </div>

          {/* 학과 선택 */}
          {selectedCollege && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">학부/학과</p>
              <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl">
                {(grouped[selectedCollege] ?? []).map(major => (
                  <button
                    key={major}
                    onClick={() => setSelectedMajor(major)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                      selectedMajor === major
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                    }`}
                  >
                    {major}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 선택 표시 */}
          {selectedMajor && (
            <div className="p-3 rounded-xl mb-3" style={{ background: '#F0F7F7' }}>
              <p className="text-xs text-gray-500">선택된 학과</p>
              <p className="text-sm font-semibold" style={{ color: '#3A6E70' }}>{selectedMajor}</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!selectedMajor}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: selectedMajor ? '#6B9FA1' : '#9CA3AF' }}
            onMouseEnter={e => { if (selectedMajor) e.currentTarget.style.background = '#5A8E90' }}
            onMouseLeave={e => { if (selectedMajor) e.currentTarget.style.background = '#6B9FA1' }}
          >
            시작하기 →
          </button>
        </div>
      </main>
    </div>
  )
}