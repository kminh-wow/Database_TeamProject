import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { BookMarked, Folder, Trash2, ExternalLink, Loader2, FolderPlus } from 'lucide-react'
import Logo from '../components/Logo'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useApp } from '../context/AppContext'
import { FolderItem } from '../types'
import * as foldersApi from '../api/folders'
import { toast } from 'sonner'

export default function MyStudyRoom() {
  const navigate = useNavigate()
  const { user, folders, foldersLoading, createFolder, deleteFolder, logout, refreshFolders } = useApp()

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [folderItems, setFolderItems] = useState<FolderItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // 폴더 선택 시 아이템 로드
  useEffect(() => {
    if (!selectedFolderId) { setFolderItems([]); return }
    setItemsLoading(true)
    foldersApi.getItemsInFolder(selectedFolderId)
      .then(setFolderItems)
      .catch(() => toast.error('자료를 불러오지 못했습니다.'))
      .finally(() => setItemsLoading(false))
  }, [selectedFolderId])

  // 첫 번째 폴더 자동 선택
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(folders[0].folder_id)
    }
  }, [folders])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createFolder(newFolderName.trim())
      toast.success('폴더를 만들었습니다!')
      setNewFolderName('')
      setShowCreate(false)
    } catch {
      toast.error('폴더 생성에 실패했습니다.')
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('폴더를 삭제할까요? 안에 저장된 자료도 모두 삭제됩니다.')) return
    try {
      await deleteFolder(folderId)
      if (selectedFolderId === folderId) setSelectedFolderId(null)
      toast.success('폴더를 삭제했습니다.')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleRemoveItem = async (contentId: string) => {
    if (!selectedFolderId) return
    try {
      await foldersApi.removeItemFromFolder(selectedFolderId, contentId)
      setFolderItems(prev => prev.filter(i => i.content_id !== contentId))
      await refreshFolders()
      toast.success('자료를 제거했습니다.')
    } catch {
      toast.error('제거에 실패했습니다.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">로그인이 필요합니다</p>
          <Button onClick={() => navigate('/auth')} style={{ background: '#6B9FA1' }}>로그인하기</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* 헤더 */}
      <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')}
            className="h-9 w-9 p-0 text-white hover:bg-slate-800">
            ←
          </Button>
          <Logo className="w-7 h-7" />
          <span className="text-white font-bold">My Study Room</span>
        </div>
        <Button variant="ghost" onClick={logout} className="text-gray-400 hover:text-white text-sm">
          로그아웃
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 폴더 사이드바 */}
        <div className="w-60 border-r border-slate-800 p-4 flex flex-col gap-2 bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">폴더</span>
            <button onClick={() => setShowCreate(!showCreate)}
              className="p-1 rounded hover:bg-slate-700 text-gray-400 hover:text-white">
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {showCreate && (
            <div className="flex gap-1 mb-2">
              <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                placeholder="폴더 이름" className="h-8 text-xs bg-slate-800 border-slate-700 text-white"
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus />
              <Button size="sm" onClick={handleCreateFolder} className="h-8 px-2"
                style={{ background: '#6B9FA1' }}>✓</Button>
            </div>
          )}

          {foldersLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">폴더가 없어요</p>
          ) : (
            folders.map(folder => (
              <div key={folder.folder_id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer group transition-colors ${
                  selectedFolderId === folder.folder_id
                    ? 'bg-teal-900/50 text-teal-300'
                    : 'hover:bg-slate-800 text-gray-400'
                }`}
                onClick={() => setSelectedFolderId(folder.folder_id)}>
                <Folder className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-sm truncate">{folder.name}</span>
                <span className="text-xs opacity-60">{folder.item_count}</span>
                <button onClick={e => { e.stopPropagation(); handleDeleteFolder(folder.folder_id) }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 아이템 목록 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!selectedFolderId ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <BookMarked className="w-12 h-12 mb-3 opacity-30" />
              <p>폴더를 선택하세요</p>
            </div>
          ) : itemsLoading ? (
            <div className="flex justify-center pt-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : folderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-sm">저장된 자료가 없습니다</p>
              <p className="text-xs mt-1 opacity-60">과목 모달에서 자료를 저장해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-w-2xl">
              {folderItems.map(item => (
                <div key={item.content_id}
                  className="bg-slate-800 rounded-xl p-4 flex items-start gap-3 hover:bg-slate-700 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">
                        {item.type}
                      </span>
                      {item.course_name && (
                        <span className="text-xs text-teal-400">{item.course_name}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.saved_at.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleRemoveItem(item.content_id)}
                      className="p-1.5 rounded-lg hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}