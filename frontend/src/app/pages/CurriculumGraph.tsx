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
    edges.forEach(e => {
      if (e.target === id && !related.has(e.source)) {
        related.add(e.source)
        findAncestors(e.source)
      }
    })
  }
  const findDescendants = (id: string) => {
    edges.forEach(e => {
      if (e.source === id && !related.has(e.target)) {
        related.add(e.target)
        findDescendants(e.target)
      }
    })
  }
  findAncestors(selectedId)
  findDescendants(selectedId)
  return related
}

const SEMESTER_COL_IDX: Record<string, number> = {
  '1-1학기': 0, '1-2학기': 1,
  '2-1학기': 2, '2-2학기': 3,
  '3-1학기': 4, '3-2학기': 5,
  '4-1학기': 6, '4-2학기': 7,
}

// 학년 간 60px 추가 여백 적용
const COL_BASE_X: Record<number, number> = {
  0: 0,    1: 420,
  2: 900,  3: 1320,
  4: 1800, 5: 2220,
  6: 2700, 7: 3120,
}

const HEADER_INFO: { label: string; year: number }[] = [
  { label: '1학년 1학기', year: 1 }, { label: '1학년 2학기', year: 1 },
  { label: '2학년 1학기', year: 2 }, { label: '2학년 2학기', year: 2 },
  { label: '3학년 1학기', year: 3 }, { label: '3학년 2학기', year: 3 },
  { label: '4학년 1학기', year: 4 }, { label: '4학년 2학기', year: 4 },
]

function computeGridPositions(apiNodes: ApiFlowNode[]) {
  const COLS = 2
  const NODE_W = 175
  const NODE_H = 70
  const H_GAP = 20
  const V_GAP = 16

  const bySemester: Record<string, ApiFlowNode[]> = {}
  apiNodes.forEach(n => {
    const year = n.data.year || 1
    const sem = n.data.semester || '1학기'
    const key = `${year}-${sem}`
    if (!bySemester[key]) bySemester[key] = []
    bySemester[key].push(n)
  })

  const positions = new Map<string, { x: number; y: number }>()
  Object.entries(bySemester).forEach(([key, nodes]) => {
    const colIdx = SEMESTER_COL_IDX[key] ?? 0
    const baseX = COL_BASE_X[colIdx] ?? colIdx * 420
    nodes.forEach((n, i) => {
      const col = i % COLS
      const row = Math.floor(i / COLS)
      positions.set(n.id, {
        x: baseX + col * (NODE_W + H_GAP),
        y: row * (NODE_H + V_GAP),
      })
    })
  })
  return positions
}

const yearColors: Record<number, { bg: string; border: string }> = {
  1: { bg: '#FEF9EC', border: '#F5A623' },
  2: { bg: '#EBF3FF', border: '#4A90D9' },
  3: { bg: '#EAFAF1', border: '#27AE60' },
  4: { bg: '#FDE8F0', border: '#E91E8C' },
}

const courseTypeColors: Record<string, string> = {
  '전공필수': '#E53E3E',
  '전공기초': '#3182CE',
  '전공선택': '#38A169',
}

const courseTypeLabels: Record<string, string> = {
  '전공필수': '전필',
  '전공기초': '핵심',
  '전공선택': '심화',
}

export default function CurriculumGraph() {
  const { departmentId } = useParams<{ departmentId: string }>()
  const navigate = useNavigate()
  const { user } = useApp()

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
        const gridPos = computeGridPositions(apiNodes)

        const nodes: Node[] = apiNodes
          .filter((n: ApiFlowNode) =>
            n.position &&
            n.position.x !== undefined &&
            n.position.y !== undefined
          )
          .map((n: ApiFlowNode) => {
            const year = n.data.year || 1
            const yc = yearColors[year] || yearColors[1]
            const bc = courseTypeColors[n.data.course_type || ''] || '#6B7280'
            const pos = gridPos.get(n.id) || n.position

            return {
              id: n.id,
              type: 'default',
              data: {
                label: (
                  <div className="text-center select-none">
                    <div className="text-xs font-bold text-gray-900 leading-tight">
                      {n.data.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                      {n.id}
                    </div>
                  </div>
                ),
                rawName: n.data.label,
                year: n.data.year,
                semester: n.data.semester,
                courseType: n.data.course_type,
                credits: n.data.credits,
              },
              position: pos,
              style: {
                background: yc.bg,
                border: `2px solid ${bc}`,
                borderRadius: '10px',
                padding: '8px 6px',
                width: 160,
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                cursor: 'pointer',
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
              draggable: false,
            }
          })

        const edges: Edge[] = apiEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#6B9FA1', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6B9FA1' },
        }))

        // 컬럼 헤더 노드 생성
        const presentCols = new Set<number>()
        apiNodes.forEach((n: ApiFlowNode) => {
          const key = `${n.data.year || 1}-${n.data.semester || '1학기'}`
          presentCols.add(SEMESTER_COL_IDX[key] ?? 0)
        })
        const HEADER_W = 175 * 2 + 20
        const headerNodes: Node[] = Array.from(presentCols).sort().map(colIdx => {
          const info = HEADER_INFO[colIdx]
          const yc = yearColors[info.year] || yearColors[1]
          return {
            id: `__hdr_${colIdx}`,
            type: 'default',
            data: { label: info.label },
            position: { x: COL_BASE_X[colIdx] ?? colIdx * 420, y: -60 },
            style: {
              background: yc.border,
              color: 'white',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              borderRadius: '8px',
              padding: '5px 0',
              width: HEADER_W,
              textAlign: 'center',
              cursor: 'default',
              pointerEvents: 'none',
            },
            draggable: false,
            selectable: false,
            focusable: false,
          }
        })

        setBaseNodes([...headerNodes, ...nodes])
        setBaseEdges(edges)
      })
      .catch(() => toast.error('커리큘럼을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [departmentId])

  const displayNodes = useMemo(() => {
    if (!highlightedId) return baseNodes
    const related = getRelatedIds(highlightedId, baseEdges)
    return baseNodes.map(node => {
      if (node.id.startsWith('__hdr_')) return node  // 헤더는 항상 그대로
      return {
        ...node,
        style: {
          ...node.style,
          opacity: related.has(node.id) ? 1 : 0.2,
          boxShadow: node.id === highlightedId
            ? '0 0 0 3px #6B9FA1, 0 0 16px rgba(107,159,161,0.5)'
            : related.has(node.id)
              ? '0 4px 12px rgba(0,0,0,0.15)'
              : 'none',
        },
      }
    })
  }, [baseNodes, highlightedId, baseEdges])

  const displayEdges = useMemo(() => {
    if (!highlightedId) return baseEdges
    const related = getRelatedIds(highlightedId, baseEdges)
    return baseEdges.map(e => {
      const isRel = related.has(e.source) && related.has(e.target)
      return {
        ...e,
        style: {
          stroke: isRel ? '#6B9FA1' : '#4B5563',
          strokeWidth: isRel ? 2.5 : 1,
          opacity: isRel ? 1 : 0.1,
        },
        animated: isRel,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isRel ? '#6B9FA1' : '#4B5563',
        },
      }
    })
  }, [baseEdges, highlightedId])

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('__hdr_')) return
    setSelectedCourse({
      course_id: node.id,
      name: node.data.rawName || node.id,
      year: node.data.year,
      course_type: node.data.courseType,
      credits: node.data.credits,
    })
  }, [])

  const onNodeMouseEnter = useCallback((_e: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('__hdr_')) return
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHighlightedId(node.id)
  }, [])

  const onNodeMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setHighlightedId(null), 120)
  }, [])

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: '#0F172A' }}>
      {/* 헤더 */}
      <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="h-9 w-9 p-0 text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2.5">
            <Logo className="w-6 h-6" />
            <div>
              <h1 className="text-sm text-white font-bold">{deptName}</h1>
              <p className="text-xs text-slate-400">
                과목에 커서를 올리면 선후수 관계 확인 · 클릭 시 학습 자료
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {Object.entries(yearColors).map(([year, c]) => (
                <div key={year} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
                  />
                  <span>{year}학년</span>
                </div>
              ))}
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="text-xs text-slate-500">← 1학기 · 2학기 →</div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {Object.entries(courseTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: color }}
                  />
                  <span>{courseTypeLabels[type]}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate('/study-room')}
            className="h-9 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 text-xs"
          >
            <BookMarked className="w-4 h-4" style={{ color: '#6B9FA1' }} />
            <span className="hidden sm:inline">My Study Room</span>
          </Button>
        </div>
      </div>

      {/* 그래프 영역 */}
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
          nodes={displayNodes}
          edges={displayEdges}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#334155"
          />
          <Controls
            className="bg-slate-800 border-slate-700"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={node => {
              const year = node.data?.year || 1
              return yearColors[year]?.border || '#6B9FA1'
            }}
            style={{ background: '#1E293B' }}
          />
        </ReactFlow>
      </div>

      {selectedCourse && (
        <CourseModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  )
}