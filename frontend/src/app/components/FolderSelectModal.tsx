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
  const { folders, saveResource, createFolder } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSelectFolder = async (folderId: string, folderName: string) => {
    setSaving(true)
    try {
      await saveResource(folderId, courseId, courseName, resource)
      toast.success(`"${folderName}"에 저장되었습니다!`)
      onClose()
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAndSave = async () => {
    if (!newFolderName.trim()) { toast.error('폴더 이름을 입력해주세요'); return }
    setSaving(true)
    try {
      await createFolder(newFolderName.trim())
      // 방금 만든 폴더 id는 refreshFolders 후 folders에 들어있음
      // 폴더 생성 성공 후 바로 저장은 folders 최신화 후 해야 하므로 안내만
      toast.success(`"${newFolderName}" 폴더를 만들었습니다. 다시 선택해주세요.`)
      setNewFolderName('')
      setShowCreate(false)
    } catch {
      toast.error('폴더 생성에 실패했습니다.')
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