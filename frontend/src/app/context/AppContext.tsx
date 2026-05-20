import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { ResourceItem, Folder, FolderItem } from '../types'
import * as foldersApi from '../api/folders'

interface AppContextType {
  user: FirebaseUser | null
  authLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (email: string, nickname: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>

  // Folder (API-based)
  folders: Folder[]
  foldersLoading: boolean
  savedContentIds: Set<string>
  createFolder: (name: string) => Promise<Folder>
  deleteFolder: (folderId: string) => Promise<void>
  saveResource: (folderId: string, courseId: string, courseName: string, resource: ResourceItem) => Promise<void>
  unsaveResource: (folderId: string, contentId: string) => Promise<void>
  refreshFolders: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [folders, setFolders] = useState<Folder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [savedContentIds, setSavedContentIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
      if (firebaseUser) {
        await refreshFolders()
      } else {
        setFolders([])
      }
    })
    return unsubscribe
  }, [])

  const refreshFolders = async () => {
    setFoldersLoading(true)
    try {
      const data = await foldersApi.getFolders()
      setFolders(data)
      if (data.length > 0) {
        const allItems = await Promise.all(data.map(f => foldersApi.getItemsInFolder(f.folder_id)))
        setSavedContentIds(new Set(allItems.flat().map(item => item.content_id)))
      } else {
        setSavedContentIds(new Set())
      }
    } catch (e) {
      console.error('폴더 로딩 실패:', e)
    } finally {
      setFoldersLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { success: true, message: '로그인 성공!' }
    } catch (e: any) {
      const msg =
        e.code === 'auth/user-not-found' ? '등록되지 않은 이메일입니다.' :
        e.code === 'auth/wrong-password' ? '비밀번호가 올바르지 않습니다.' :
        e.code === 'auth/invalid-credential' ? '이메일 또는 비밀번호를 확인해주세요.' :
        '로그인에 실패했습니다.'
      return { success: false, message: msg }
    }
  }

  const register = async (email: string, nickname: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: nickname })
      await sendEmailVerification(cred.user)
      return { success: true, message: '회원가입이 완료되었습니다. 인증 메일을 확인해주세요.' }
    } catch (e: any) {
      const msg =
        e.code === 'auth/email-already-in-use' ? '이미 사용 중인 이메일입니다.' :
        e.code === 'auth/weak-password' ? '비밀번호는 6자 이상이어야 합니다.' :
        '회원가입에 실패했습니다.'
      return { success: false, message: msg }
    }
  }

  const logout = async () => {
    await signOut(auth)
    setFolders([])
    setSavedContentIds(new Set())
  }

  const createFolder = async (name: string): Promise<Folder> => {
    const folder = await foldersApi.createFolder(name)
    setFolders(prev => [...prev, folder])
    return folder
  }

  const deleteFolder = async (folderId: string) => {
    await foldersApi.deleteFolder(folderId)
    setFolders(prev => prev.filter(f => f.folder_id !== folderId))
  }

  const saveResource = async (
    folderId: string,
    courseId: string,
    courseName: string,
    resource: ResourceItem
  ) => {
    await foldersApi.addItemToFolder(folderId, {
      content_id: resource.content_id,
      title: resource.title,
      url: resource.url,
      type: resource.type,
      course_id: courseId,
      course_name: courseName,
    })
    setSavedContentIds(prev => new Set([...prev, resource.content_id]))
    await refreshFolders()
  }

  const unsaveResource = async (folderId: string, contentId: string) => {
    await foldersApi.removeItemFromFolder(folderId, contentId)
    setSavedContentIds(prev => { const next = new Set(prev); next.delete(contentId); return next })
    await refreshFolders()
  }

  return (
    <AppContext.Provider value={{
      user, authLoading, login, register, logout,
      folders, foldersLoading, savedContentIds, createFolder, deleteFolder,
      saveResource, unsaveResource, refreshFolders,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}