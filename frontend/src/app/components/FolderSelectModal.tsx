import { useState } from 'react'
import { X, Folder, FolderPlus, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useApp } from '../context/AppContext'
import { ResourceItem } from '../types'
import { toast } from 'sonner'

interface FolderSelectModalProps {
  resource: ResourceItem
  courseId: string
  courseName: string
  onClose: () => void
}

export default function FolderSelectModal({ resource, courseId, courseName, onClose }: FolderSelectModalProps) {
  const { folders, saveResource, createFolder, user } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSelectFolder = async (folderId: string, folderName: string) => {
    setSaving(true)
    try {
      await saveResource(folderId, courseId, courseName, resource)
      toast.success(`"${folderName}"에 저장되었습니다!`)
      onClose()
    } catch (e: any) {
      if (e?.response?.status === 409) {
        toast.error('이미 저장된 자료입니다.')
      } else if (e?.response?.status !== 403) {
        toast.error('저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAndSave = async () => {
    if (!newFolderName.trim()) { toast.error('폴더 이름을 입력해주세요'); return }
    setSaving(true)
    try {
      const folder = await createFolder(newFolderName.trim())
      await saveResource(folder.folder_id, courseId, courseName, resource)
      toast.success(`"${newFolderName}"에 저장되었습니다!`)
      onClose()
    } catch (e: any) {
      if (e?.response?.status !== 403) {
        toast.error('폴더 생성 또는 저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">폴더에 저장</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3 truncate">"{resource.title}"</p>

        {user && !user.emailVerified && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            이메일 인증 후 저장 가능합니다. 메일함을 확인해주세요.
          </div>
        )}

        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {folders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">폴더가 없어요</p>
          )}
          {folders.map(folder => (
            <button
              key={folder.folder_id}
              onClick={() => handleSelectFolder(folder.folder_id, folder.name)}
              disabled={saving}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left"
            >
              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700 flex-1">{folder.name}</span>
              <span className="text-xs text-gray-400">{folder.item_count}개</span>
            </button>
          ))}
        </div>

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-300 transition-colors text-sm text-gray-500"
          >
            <FolderPlus className="w-4 h-4" />
            새 폴더 만들기
          </button>
        ) : (
          <div className="flex gap-2">
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="폴더 이름"
              className="h-9 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleCreateAndSave()}
              autoFocus
            />
            <Button size="sm" onClick={handleCreateAndSave} disabled={saving}
              className="h-9 px-3" style={{ background: '#6B9FA1' }}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}