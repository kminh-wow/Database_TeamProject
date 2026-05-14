import { createBrowserRouter } from 'react-router'
import Home from './pages/Home'
import CurriculumGraph from './pages/CurriculumGraph'
import SubmitResource from './pages/SubmitResource'
import Auth from './pages/Auth'
import MyStudyRoom from './pages/MyStudyRoom'

export const router = createBrowserRouter([
  { path: '/', Component: Home },
  { path: '/curriculum/:departmentId', Component: CurriculumGraph },
  { path: '/submit-resource', Component: SubmitResource },
  { path: '/auth', Component: Auth },
  { path: '/study-room', Component: MyStudyRoom },
  {
    path: '*',
    Component: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-teal-400 mb-4">404</h1>
          <p className="text-gray-600 mb-6">페이지를 찾을 수 없습니다</p>
          <a href="/" className="text-teal-600 hover:underline font-semibold">홈으로 돌아가기</a>
        </div>
      </div>
    ),
  },
])