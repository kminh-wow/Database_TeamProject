import axios from 'axios'
import { auth } from '../lib/firebase'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 10000,
})

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 403) {
      const detail = err.response.data?.detail || ''
      if (detail.includes('이메일 인증')) {
        import('sonner').then(({ toast }) => {
          toast.error('이메일 인증이 필요합니다. 메일함을 확인해주세요.')
        })
      }
    }
    return Promise.reject(err)
  }
)