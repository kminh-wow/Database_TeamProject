import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import ReactFlow, {
  Node, Edge, Controls, Background, BackgroundVariant,
  MarkerType, Position, MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ArrowLeft, BookMarked, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { getCurriculumGraph } from '../api/curriculum'
import { Course, FlowNode as ApiFlowNode } from '../types'
import CourseModal from '../components/CourseModal'
import Logo from '../components/Logo'
import { useApp } from '../context/AppContext'
import { toast } from 'sonner'

function getRelatedIds(selectedId: string, edges: Edge[]): Set<string> {
  const related = new Set<string>([selectedId])
  const findAncestors = (id: string) => {
    edges.forEach(e => { if (e.target === id && !related.has(e.source)) { related.add(e.source); findAncestors(e.source) } })
  }
  const findDescendants = (id: string) => {
    edges.forEach(e => { if (e.source === id && !related.has(e.target)) { related.add(e.target); findDescendants(e.target) } })
  }
  findAncestors(selectedId)
  findDescendants(selectedId)
  return related
}

const yearColors: Record<number, { bg: string; border: string }> = {
  1: { bg: '#FEF3C7', border: '#F59E0B' },
  2: { bg: '#DBEAFE', border: '#3B82F6' },
  3: { bg: '#D1FAE5', border: '#10B981' },
  4: { bg: '#FCE7F3', border: '#EC4899' },
}

const courseTypeColors: Record<string, string> = {
  '전공필수': '#DC2626',
  '전공기초': '#2563EB',
  '전공선택': '#059669',
}

export default function CurriculumGraph() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const navigate = useNavigate()
  const { savedResources } = useApp()

  const [baseNodes, setBaseNodes] = useState<Node[]>([])
  const [baseEdges, setBaseEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [deptName, setDeptName] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!departmentId) return
    const name = decodeURIComponent(departmentId)
    setDeptName(name)

    getCurriculumGraph(name)
      .then(({ nodes: apiNodes, edges: apiEdges }) => {
        const savedCourseIds = new Set(savedResources.map(s => s.courseId))

        const nodes: Node[] = apiNodes.map((n: ApiFlowNode) => {
          const year = n.data.year || 1
          const yc = yearColors[year] || yearColors[1]
          const bc = courseTypeColors[n.data.course_type || ''] || '#6B7280'

          return {
            id: n.id,
            type: 'default',
            data: {
              label: (
                <div className="text-center select-none">
                  {savedCourseIds.has(n.id) && <div className="text-xs mb-1">⭐</div>}
                  <div className="text-sm leading-tight font-bold text-gray-900">{n.data.label}</div>
                  {n.data.credits && <div className="text-xs mt-1 text-gray-500">{n.data.credits}학점</div>}
                </div>
              ),
            },
            position: n.position,
            style: {
              background: yc.bg, border: `3px solid ${bc}`, borderRadius: '14px',
              padding: '14px 10px', width: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', cursor: 'pointer',
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            draggable: false,
          }
        })

        const edges: Edge[] = apiEdges.map(e => ({
          id: e.id, source: e.source, target: e.target, type: 'smoothstep', animated: true,
          style: { stroke: '#6B9FA1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6B9FA1' },
        }))

        setBaseNodes(nodes)
        setBaseEdges(edges)
      })
      .catch(() => toast.error('커리큘럼을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [departmentId])

  const displayNodes = useMemo(() => {
    if (!highlightedId) return baseNodes
    const related = getRelatedIds(highlightedId, baseEdges)
    return baseNodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: related.has(node.id) ? 1 : 0.22,
        boxShadow: node.id === highlightedId
          ? '0 0 0 3px #6B9FA1, 0 0 20px rgba(107,159,161,0.5)'
          : related.has(node.id) ? '0 4px 14px rgba(0,0,0,0.18)' : 'none',
      },
    }))
  }, [baseNodes, highlightedId, baseEdges])

  const displayEdges = useMemo(() => {
    if (!highlightedId) return baseEdges
    const related = getRelatedIds(highlightedId, baseEdges)
    return baseEdges.map(e => {
      const isRel = related.has(e.source) && related.has(e.target)
      return {
        ...e,
        style: { stroke: isRel ? '#6B9FA1' : '#4B5563', strokeWidth: isRel ? 3 : 1, opacity: isRel ? 1 : 0.15 },
        animated: isRel,
        markerEnd: { type: MarkerType.ArrowClosed, color: isRel ? '#6B9FA1' : '#4B5563' },
      }
    })
  }, [baseEdges, highlightedId])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    // 노드 id로 course 정보 구성 (상세는 CourseModal에서 API 호출)
    setSelectedCourse({ course_id: node.id, name: node.data.label?.props?.children?.[1]?.props?.children || node.id })
  }, [])

  const onNodeMouseEnter = useCallback((_e: React.MouseEvent, node: Node) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHighlightedId(node.id)
  }, [])

  const onNodeMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHighlightedId(null), 120)
  }, [])

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: '#0F172A' }}>
      <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/')} className="h-9 w-9 p-0 text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <Logo className="w-6 h-6" />
            <div>
              <h1 className="text-sm text-white font-bold">{deptName}</h1>
              <p className="text-xs text-slate-400">과목에 커서를 올리면 선후수 확인 · 클릭 시 학습 자료</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {Object.entries(yearColors).map(([year, c]) => (
                <div key={year} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c.bg, border: `1.5px solid ${c.border}` }} />
                  <span>{year}학년</span>
                </div>
              ))}
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {Object.entries(courseTypeColors).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm border-2" style={{ borderColor: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/study-room')}
            className="h-9 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 text-xs">
            <BookMarked className="w-4 h-4" style={{ color: '#6B9FA1' }} />
            <span className="hidden sm:inline">My Study Room</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>커리큘럼 불러오는 중...</span>
            </div>
          </div>
        )}
        <ReactFlow
          nodes={displayNodes} edges={displayEdges}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
          attributionPosition="bottom-left" minZoom={0.2} maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
          <Controls className="bg-slate-800 border-slate-700" showInteractive={false} />
          <MiniMap
            nodeColor={node => {
              const year = baseNodes.find(n => n.id === node.id)?.data?.year || 1
              return yearColors[year]?.border || '#6B9FA1'
            }}
            style={{ background: '#1E293B' }}
          />
        </ReactFlow>
      </div>

      {selectedCourse && (
        <CourseModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  )
}