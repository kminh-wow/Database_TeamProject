import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ChevronDown, BookOpen, ArrowRight, Search } from 'lucide-react'
import Logo from '../components/Logo'
import { getDepartments } from '../api/curriculum'
import { Department } from '../types'
import { useApp } from '../context/AppContext'
import { Button } from '../components/ui/button'

// CSV의 Department(대학) → Major(학과) 매핑
// API가 Major 이름 flat으로 반환할 때 그룹화용
const COLLEGE_ORDER = [
  'AI대학', 'IT대학', '공과대학', '자연과학대학',
  '경영대학', '경제통상대학', '사회과학대학', '인문대학',
  '법과대학', '건축학부',
]

export default function Home() {
  const navigate = useNavigate()
  const { user, logout } = useApp()

  const [departments, setDepartments] = useState<Department[]>([])
  const [grouped, setGrouped] = useState<Record<string, string[]>>({})
  const [selectedCollege, setSelectedCollege] = useState<string>('')
  const [selectedMajor, setSelectedMajor] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDepartments()
      .then(data => {
        setDepartments(data)
        // API가 flat Major 목록을 줄 경우 → 프론트에서 그룹핑
        // API가 이미 {name, college} 형태면 아래 로직 교체
        buildGroups(data)
      })
      .finally(() => setLoading(false))
  }, [])

  // Major 이름으로 소속 대학 추정 (CSV 기반 하드코딩 매핑)
  const MAJOR_TO_COLLEGE: Record<string, string> = {
    'AI소프트웨어학부': 'AI대학', 'AI융합학부': 'AI대학',
    '소프트웨어학부': 'IT대학', '컴퓨터학부': 'IT대학',
    '전자정보공학부 전자공학전공': 'IT대학', '전자정보공학부 IT융합전공': 'IT대학',
    '글로벌미디어학부': 'IT대학', '정보보호학과(계약학과)': 'IT대학',
    '디지털미디어학과': 'IT대학',
    '기계공학부': '공과대학', '전기공학부': '공과대학',
    '화학공학과': '공과대학', '신소재공학과': '공과대학',
    '산업·정보시스템공학과': '공과대학', '의생명시스템학부': '공과대학',
    '수학과': '자연과학대학', '물리학과': '자연과학대학',
    '화학과': '자연과학대학', '정보통계·보험수리학과': '자연과학대학',
    '경영학부': '경영대학', '벤처경영학과(계약학과)': '경영대학',
    '혁신경영학과(계약학과)': '경영대학', '회계학과': '경영대학',
    '금융학부': '경영대학',
    '경제학과': '경제통상대학', '금융경제학과': '경제통상대학',
    '글로벌통상학과': '경제통상대학', '국제무역학과': '경제통상대학',
    '회계세무학과(계약학과)': '경제통상대학',
    '사회복지학부': '사회과학대학', '행정학부': '사회과학대학',
    '정보사회학과': '사회과학대학', '평생교육학과': '사회과학대학',
    '언론홍보학과': '사회과학대학', '정치외교학과': '사회과학대학',
    '벤처중소기업학과': '사회과학대학', '복지경영학과(계약학과)': '사회과학대학',
    '국어국문학과': '인문대학', '영어영문학과': '인문대학',
    '독어독문학과': '인문대학', '불어불문학과': '인문대학',
    '중어중문학과': '인문대학', '일어일문학과': '인문대학',
    '철학과': '인문대학', '사학과': '인문대학',
    '기독교학과': '인문대학', '스포츠학부': '인문대학',
    '예술창작학부 문예창작전공': '인문대학', '예술창작학부 영화예술전공': '인문대학',
    '법학과': '법과대학', '국제법무학과': '법과대학',
    '건축학전공': '건축학부', '건축공학전공': '건축학부', '실내건축전공': '건축학부',
  }

  const buildGroups = (depts: Department[]) => {
    const g: Record<string, string[]> = {}
    depts.forEach(d => {
      const college = MAJOR_TO_COLLEGE[d.name] ?? '기타'
      if (!g[college]) g[college] = []
      g[college].push(d.name)
    })
    setGrouped(g)
  }

  const handleStart = () => {
    if (!selectedMajor) return
    navigate(`/curriculum/${encodeURIComponent(selectedMajor)}`)
  }

  // 검색 필터
  const filteredMajors = search.trim()
    ? departments.filter(d => d.name.includes(search))
    : selectedCollege ? (grouped[selectedCollege] ?? []).map(n => ({ name: n })) : []

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #F0F7F7 0%, #EAF3F3 50%, #E2EEEE 100%)' }}
    >
      {/* 네비게이션 */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8" />
          <span className="text-xl tracking-tight font-bold" style={{ color: '#3A6E70' }}>
            CourseNest
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button onClick={() => navigate('/study-room')}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/60 transition-colors"
                style={{ color: '#3A6E70' }}>
                <BookOpen className="w-4 h-4" /> My Study Room
              </button>
              <button onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white/60">
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/auth')}
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors"
              style={{ background: '#6B9FA1' }}>
              로그인
            </button>
          )}
        </div>
      </header>

      {/* 메인 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: '#2D5A5C' }}>
            내 전공 커리큘럼,<br />한눈에 보기
          </h1>
          <p className="text-gray-500 text-base">학과를 선택하면 과목 간 선후수 관계를 그래프로 확인할 수 있어요</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
          {/* 검색 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedMajor('') }}
              placeholder="학과 검색..."
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-teal-400 bg-gray-50"
            />
          </div>

          {/* 검색 결과 */}
          {search.trim() ? (
            <div className="mb-4 max-h-48 overflow-y-auto border border-gray-100 rounded-xl">
              {filteredMajors.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">검색 결과가 없습니다</p>
              ) : (
                filteredMajors.map(d => (
                  <button key={d.name} onClick={() => { setSelectedMajor(d.name); setSearch('') }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors ${
                      selectedMajor === d.name ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                    }`}>
                    {d.name}
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* 대학 선택 */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">단과대학</p>
                <div className="grid grid-cols-2 gap-2">
                  {loading ? (
                    <div className="col-span-2 text-center text-sm text-gray-400 py-3">불러오는 중...</div>
                  ) : (
                    COLLEGE_ORDER.filter(c => grouped[c]).map(college => (
                      <button key={college}
                        onClick={() => { setSelectedCollege(college); setSelectedMajor('') }}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left ${
                          selectedCollege === college
                            ? 'text-white'
                            : 'bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-700'
                        }`}
                        style={selectedCollege === college ? { background: '#6B9FA1' } : {}}>
                        {college}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 학과 선택 */}
              {selectedCollege && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">학부/학과</p>
                  <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl">
                    {(grouped[selectedCollege] ?? []).map(major => (
                      <button key={major} onClick={() => setSelectedMajor(major)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 transition-colors ${
                          selectedMajor === major ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                        }`}>
                        {major}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 선택 표시 + 시작 버튼 */}
          {selectedMajor && (
            <div className="mt-2 p-3 rounded-xl mb-3" style={{ background: '#F0F7F7' }}>
              <p className="text-xs text-gray-500">선택된 학과</p>
              <p className="text-sm font-semibold" style={{ color: '#3A6E70' }}>{selectedMajor}</p>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={!selectedMajor}
            className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: selectedMajor ? '#6B9FA1' : undefined }}
          >
            커리큘럼 보기 <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}