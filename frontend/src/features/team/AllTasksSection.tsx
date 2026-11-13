import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Table,
  BarChart2,
  Columns3,
  SlidersHorizontal,
  MoreHorizontal,
  Plus,
  MessageSquare,
  Link2,
  CheckCircle2,
  Clock,
  Sparkles,
  ListTodo,
  GripHorizontal,
  Database,
} from 'lucide-react';
import { showToast } from '../../components/ui/Toast';
import { CreateTaskModal, CreateTaskSavePayload } from './CreateTaskModal';
import { TaskDetailModal, parseChecklistFromDescription } from './TaskDetailModal';
import { CustomToolsPopup, ColumnItem } from './CustomToolsPopup';
import { boardApi } from '../../api/board.api';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | string;

export interface TaskItem {
  id: string;
  projectTag: string; // e.g. "ABC Dashboard", "Sinen Dashboard", "Twingle Website", "Sosro Mobile App"
  title: string;
  description?: string;
  dueDate: string; // e.g. "Feb 14, 2027"
  status: TaskStatus;
  progress: number; // 0, 25, 55, 100
  difficultyLevel?: number;
  storyPoints?: number;
  assigneeId?: number;
  commentsCount: number;
  linksCount: number;
  assignees: {
    name: string;
    avatarText: string;
    bg: string;
  }[];
}

const INITIAL_TASKS: TaskItem[] = [
  // ── To-do (4) ──
  {
    id: 't-1',
    projectTag: 'ABC Dashboard',
    title: 'Create Wireframe',
    dueDate: 'Feb 14, 2027',
    status: 'todo',
    progress: 0,
    commentsCount: 3,
    linksCount: 2,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    ],
  },
  {
    id: 't-2',
    projectTag: 'Twingle Website',
    title: 'Client Feedback',
    dueDate: 'Feb 14, 2027',
    status: 'todo',
    progress: 0,
    commentsCount: 1,
    linksCount: 1,
    assignees: [
      { name: 'Quốc Bảo', avatarText: 'QB', bg: 'linear-gradient(135deg, #10b981, #059669)' },
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },
  {
    id: 't-3',
    projectTag: 'Sosro Mobile App',
    title: 'Draft Information Architecture',
    dueDate: 'Feb 15, 2027',
    status: 'todo',
    progress: 0,
    commentsCount: 2,
    linksCount: 3,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    ],
  },
  {
    id: 't-4',
    projectTag: 'Sinen Dashboard',
    title: 'Competitive Analysis',
    dueDate: 'Feb 16, 2027',
    status: 'todo',
    progress: 0,
    commentsCount: 4,
    linksCount: 1,
    assignees: [
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },

  // ── In Progress (5) ──
  {
    id: 't-5',
    projectTag: 'Sinen Dashboard',
    title: 'UI Testing',
    dueDate: 'Feb 14, 2027',
    status: 'in_progress',
    progress: 25,
    commentsCount: 14,
    linksCount: 4,
    assignees: [
      { name: 'Quốc Bảo', avatarText: 'QB', bg: 'linear-gradient(135deg, #10b981, #059669)' },
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    ],
  },
  {
    id: 't-6',
    projectTag: 'Sosro Mobile App',
    title: 'API Authentication Flow',
    dueDate: 'Feb 14, 2027',
    status: 'in_progress',
    progress: 40,
    commentsCount: 5,
    linksCount: 2,
    assignees: [
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },
  {
    id: 't-7',
    projectTag: 'ABC Dashboard',
    title: 'Design System Tokens',
    dueDate: 'Feb 15, 2027',
    status: 'in_progress',
    progress: 35,
    commentsCount: 8,
    linksCount: 3,
    assignees: [
      { name: 'Quốc Bảo', avatarText: 'QB', bg: 'linear-gradient(135deg, #10b981, #059669)' },
    ],
  },
  {
    id: 't-8',
    projectTag: 'Twingle Website',
    title: 'Responsive Grid Layout',
    dueDate: 'Feb 16, 2027',
    status: 'in_progress',
    progress: 50,
    commentsCount: 6,
    linksCount: 2,
    assignees: [
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },
  {
    id: 't-9',
    projectTag: 'KINGSHA Medical',
    title: 'Data Model Schema Definition',
    dueDate: 'Feb 16, 2027',
    status: 'in_progress',
    progress: 30,
    commentsCount: 9,
    linksCount: 5,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    ],
  },

  // ── In Review (3) ──
  {
    id: 't-10',
    projectTag: 'Twingle Website',
    title: 'Update Style',
    dueDate: 'Feb 14, 2027',
    status: 'in_review',
    progress: 55,
    commentsCount: 7,
    linksCount: 1,
    assignees: [
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    ],
  },
  {
    id: 't-11',
    projectTag: 'Sosro Mobile App',
    title: 'Create Hi-Fi Design',
    dueDate: 'Feb 14, 2027',
    status: 'in_review',
    progress: 75,
    commentsCount: 8,
    linksCount: 3,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },
  {
    id: 't-12',
    projectTag: 'ABC Dashboard',
    title: 'Component Review & Testing',
    dueDate: 'Feb 15, 2027',
    status: 'in_review',
    progress: 85,
    commentsCount: 11,
    linksCount: 2,
    assignees: [
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    ],
  },

  // ── Completed (4) ──
  {
    id: 't-13',
    projectTag: 'ABC Dashboard',
    title: 'Create Wireframe',
    dueDate: 'Feb 14, 2027',
    status: 'completed',
    progress: 100,
    commentsCount: 3,
    linksCount: 2,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    ],
  },
  {
    id: 't-14',
    projectTag: 'ABC Dashboard',
    title: 'Client Feedback',
    dueDate: 'Feb 14, 2027',
    status: 'completed',
    progress: 100,
    commentsCount: 4,
    linksCount: 1,
    assignees: [
      { name: 'Quốc Bảo', avatarText: 'QB', bg: 'linear-gradient(135deg, #10b981, #059669)' },
      { name: 'Thu Hà', avatarText: 'TH', bg: 'linear-gradient(135deg, #ec4899, #be185d)' },
    ],
  },
  {
    id: 't-15',
    projectTag: 'Sinen Dashboard',
    title: 'Database Architecture Design',
    dueDate: 'Feb 12, 2027',
    status: 'completed',
    progress: 100,
    commentsCount: 12,
    linksCount: 4,
    assignees: [
      { name: 'Lan Anh', avatarText: 'LA', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    ],
  },
  {
    id: 't-16',
    projectTag: 'Sosro Mobile App',
    title: 'Initial Project Kickoff',
    dueDate: 'Feb 10, 2027',
    status: 'completed',
    progress: 100,
    commentsCount: 6,
    linksCount: 2,
    assignees: [
      { name: 'Minh Triều', avatarText: 'MT', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    ],
  },
];

const INITIAL_COLUMNS: ColumnItem[] = [
  {
    id: 'todo',
    title: 'To-do',
    badgeClass: 'col-badge--todo',
    iconType: 'todo',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    badgeClass: 'col-badge--inprogress',
    iconType: 'inprogress',
  },
  {
    id: 'in_review',
    title: 'In Review',
    badgeClass: 'col-badge--inreview',
    iconType: 'inreview',
  },
  {
    id: 'completed',
    title: 'Completed',
    badgeClass: 'col-badge--completed',
    iconType: 'completed',
  },
];

const getColBadgeClass = (name: string, idx: number): string => {
  const lower = name.toLowerCase();
  if (lower.includes('to do') || lower.includes('to-do') || lower.includes('chưa')) return 'col-badge--todo';
  if (lower.includes('progress') || lower.includes('đang')) return 'col-badge--inprogress';
  if (lower.includes('review') || lower.includes('đánh giá')) return 'col-badge--inreview';
  if (lower.includes('done') || lower.includes('complete') || lower.includes('xong')) return 'col-badge--completed';
  const classes = ['col-badge--todo', 'col-badge--inprogress', 'col-badge--inreview', 'col-badge--completed', 'col-badge--custom'];
  return classes[idx % classes.length];
};

const getColIconType = (name: string): 'todo' | 'inprogress' | 'inreview' | 'completed' | 'custom' => {
  const lower = name.toLowerCase();
  if (lower.includes('to do') || lower.includes('to-do')) return 'todo';
  if (lower.includes('progress')) return 'inprogress';
  if (lower.includes('review')) return 'inreview';
  if (lower.includes('done') || lower.includes('complete')) return 'completed';
  return 'custom';
};

const formatDbDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return '';
  }
};

export const AllTasksSection: React.FC<{
  projectName?: string;
  teamId?: number;
}> = ({ projectName = 'KINGSHA', teamId }) => {
  const [boardId, setBoardId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>(teamId ? [] : INITIAL_TASKS);
  const [columns, setColumns] = useState<ColumnItem[]>(INITIAL_COLUMNS);
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'timeline' | 'kanban'>('kanban');
  const [isDbSynced, setIsDbSynced] = useState<boolean>(false);

  // Custom Tools Popup State
  const [isCustomPopupOpen, setIsCustomPopupOpen] = useState(false);
  const [activeSort, setActiveSort] = useState<'default' | 'dueDate' | 'progress' | 'title'>('default');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Column Inline Editing (Double Tap / Double Click)
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState('');
  const [lastTap, setLastTap] = useState<{ id: string; time: number }>({ id: '', time: 0 });

  // Column Drag-and-drop Reordering
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Task Card Drag-and-drop between columns
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskColId, setDragOverTaskColId] = useState<string | null>(null);

  // Kanban Horizontal Drag-to-Scroll (Kéo qua trái / qua phải khi dài)
  const kanbanGridRef = useRef<HTMLDivElement>(null);
  const [isGridDragging, setIsGridDragging] = useState(false);
  const [gridStartX, setGridStartX] = useState(0);
  const [gridScrollLeft, setGridScrollLeft] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalDefaultStatus, setCreateModalDefaultStatus] = useState<TaskStatus>('in_progress');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // ── CONNECT TO DATABASE (Spring Boot REST API) ──
  useEffect(() => {
    if (!teamId) return;

    let mounted = true;
    const fetchBoardData = async () => {
      try {
        let currentBoardId: number | null = null;
        const boardsRes = await boardApi.getBoardsByTeam(teamId);

        if (boardsRes.data && boardsRes.data.length > 0) {
          currentBoardId = boardsRes.data[0].id;
        } else {
          // Tạo mới bảng nếu team chưa có board
          const createRes = await boardApi.createBoard({
            teamId,
            name: `${projectName} Board`,
            description: `Bảng công việc dự án ${projectName}`,
          });
          if (createRes.data) {
            currentBoardId = createRes.data.id;
          }
        }

        if (currentBoardId && mounted) {
          setBoardId(currentBoardId);
          const fullRes = await boardApi.getBoardById(currentBoardId);
          const board = fullRes.data;

          if (board.columns && board.columns.length > 0) {
            const mappedCols: ColumnItem[] = board.columns.map((c, i) => ({
              id: String(c.id),
              title: c.name,
              badgeClass: getColBadgeClass(c.name, i),
              iconType: getColIconType(c.name),
            }));
            setColumns(mappedCols);

            const loadedTasks: TaskItem[] = [];
            board.columns.forEach((c) => {
              if (c.cards && c.cards.length > 0) {
                c.cards.forEach((card) => {
                  const { items: subItems } = parseChecklistFromDescription(card.description);
                  const progressVal = subItems.length > 0
                    ? Math.round((subItems.filter((x) => x.completed).length / subItems.length) * 100)
                    : (card.storyPoints ? Math.min(100, Math.round(card.storyPoints * 20)) : 25);

                  loadedTasks.push({
                    id: String(card.id),
                    projectTag: `${projectName} Dashboard`,
                    title: card.title,
                    description: card.description,
                    dueDate: formatDbDate(card.dueDate),
                    status: String(c.id),
                    difficultyLevel: card.difficultyLevel,
                    storyPoints: card.storyPoints,
                    assigneeId: card.assigneeId,
                    progress: progressVal,
                    commentsCount: 0,
                    linksCount: 0,
                    assignees: card.assigneeName
                      ? [
                          {
                            name: card.assigneeName,
                            avatarText: card.assigneeName.slice(0, 2).toUpperCase(),
                            bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          },
                        ]
                      : [],
                  });
                });
              }
            });

            setTasks(loadedTasks);
            setIsDbSynced(true);
          }
        }
      } catch (err) {
        console.warn('Database sync fallback to local store:', err);
      }
    };

    fetchBoardData();
    return () => {
      mounted = false;
    };
  }, [teamId, projectName]);

  const handleGridMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.task-card') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('.col-drag-zone')
    ) {
      return;
    }
    if (!kanbanGridRef.current) return;
    setIsGridDragging(true);
    setGridStartX(e.pageX - kanbanGridRef.current.offsetLeft);
    setGridScrollLeft(kanbanGridRef.current.scrollLeft);
  };

  const handleGridMouseMove = (e: React.MouseEvent) => {
    if (!isGridDragging || !kanbanGridRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanGridRef.current.offsetLeft;
    const walk = (x - gridStartX) * 1.5;
    kanbanGridRef.current.scrollLeft = gridScrollLeft - walk;
  };

  const handleGridMouseUp = () => {
    setIsGridDragging(false);
  };

  // Distinct Project Tags for Filter Sub-menu
  const projectTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.projectTag) set.add(t.projectTag);
    });
    return Array.from(set);
  }, [tasks]);

  // Handle Double Click / Double Tap to edit column name
  const handleStartRename = (colId: string, currentTitle: string) => {
    setEditingColId(colId);
    setEditColTitle(currentTitle);
  };

  const handleTouchHeader = (colId: string, currentTitle: string) => {
    const now = Date.now();
    if (lastTap.id === colId && now - lastTap.time < 350) {
      handleStartRename(colId, currentTitle);
    } else {
      setLastTap({ id: colId, time: now });
    }
  };

  const handleSaveRename = async (colId: string) => {
    const trimmed = editColTitle.trim();
    if (trimmed) {
      setColumns((prev) =>
        prev.map((c) => (c.id === colId ? { ...c, title: trimmed } : c))
      );

      // Lưu xuống Database
      if (!isNaN(Number(colId))) {
        try {
          await boardApi.updateColumn(Number(colId), { name: trimmed });
          showToast.success(`Đã đổi tên danh sách thành "${trimmed}" và lưu vào DB!`, 'Database Synced');
        } catch (e) {
          console.warn('API updateColumn error:', e);
          showToast.success(`Đã đổi tên danh sách thành "${trimmed}"`, 'All Task');
        }
      } else {
        showToast.success(`Đã đổi tên danh sách thành "${trimmed}"`, 'All Task');
      }
    }
    setEditingColId(null);
  };

  // Reordering Columns (Dragging horizontally)
  const handleColumnDrop = (targetColId: string) => {
    if (!draggingColId || draggingColId === targetColId) {
      setDraggingColId(null);
      setDragOverColId(null);
      return;
    }

    setColumns((prev) => {
      const sourceIndex = prev.findIndex((c) => c.id === draggingColId);
      const targetIndex = prev.findIndex((c) => c.id === targetColId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const newCols = [...prev];
      const [moved] = newCols.splice(sourceIndex, 1);
      newCols.splice(targetIndex, 0, moved);

      // Lưu vị trí mới xuống Database
      newCols.forEach((c, idx) => {
        if (!isNaN(Number(c.id))) {
          boardApi.updateColumn(Number(c.id), { name: c.title, position: idx }).catch(() => {});
        }
      });

      return newCols;
    });

    showToast.info('Đã di chuyển vị trí danh sách và cập nhật vào DB', 'Database Synced');
    setDraggingColId(null);
    setDragOverColId(null);
  };

  // Moving task cards between columns
  const handleCardDrop = async (targetColId: string) => {
    if (!draggingTaskId || draggingTaskId === '') {
      setDraggingTaskId(null);
      setDragOverTaskColId(null);
      return;
    }

    const task = tasks.find((t) => t.id === draggingTaskId);
    if (!task || task.status === targetColId) {
      setDraggingTaskId(null);
      setDragOverTaskColId(null);
      return;
    }

    const toColName   = columns.find((c) => c.id === targetColId)?.title  || targetColId;

    // Optimistic update — move card locally first
    setTasks((prev) =>
      prev.map((t) => t.id === draggingTaskId ? { ...t, status: targetColId } : t)
    );

    // Call API if both IDs are real DB numbers
    const cardIdNum  = Number(draggingTaskId);
    const targetColNum = Number(targetColId);
    if (!isNaN(cardIdNum) && cardIdNum > 0 && !isNaN(targetColNum) && targetColNum > 0) {
      try {
        await boardApi.moveCard(cardIdNum, { targetColumnId: targetColNum });
        showToast.success(
          `Đã di chuyển "${task.title}" sang "${toColName}" và lưu vào DB!`,
          'DB Synced'
        );
      } catch (e) {
        console.warn('moveCard error:', e);
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) => t.id === draggingTaskId ? { ...t, status: task.status } : t)
        );
        showToast.error('Không thể di chuyển task, kiểm tra kết nối.', 'Lỗi');
      }
    } else {
      showToast.success(`Đã di chuyển "${task.title}" sang "${toColName}"`, 'All Task');
    }

    setDraggingTaskId(null);
    setDragOverTaskColId(null);
  };

  // Unified drop handler for a column area
  const handleColAreaDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (draggingTaskId) {
      handleCardDrop(colId);
    } else {
      handleColumnDrop(colId);
    }
  };

  // Custom Popup Actions
  const handleAddColumn = async (title: string) => {
    if (boardId) {
      try {
        const res = await boardApi.createColumn(boardId, {
          name: title,
          position: columns.length,
        });
        const created = res.data;
        const newCol: ColumnItem = {
          id: String(created.id),
          title: created.name,
          badgeClass: 'col-badge--custom',
          iconType: 'custom',
        };
        setColumns((prev) => [...prev, newCol]);
        showToast.success(`Đã thêm danh sách "${title}" và lưu vào DB!`, 'Database Synced');
        return;
      } catch (e) {
        console.warn('API createColumn error:', e);
      }
    }

    // Local fallback
    const newId = `col-${Date.now()}`;
    const newCol: ColumnItem = {
      id: newId,
      title,
      badgeClass: 'col-badge--custom',
      iconType: 'custom',
    };
    setColumns((prev) => [...prev, newCol]);
    showToast.success(`Đã thêm danh sách mới "${title}"`, 'All Task');
  };

  const handleDeleteColumn = async (colId: string) => {
    const colToDelete = columns.find((c) => c.id === colId);
    setColumns((prev) => prev.filter((c) => c.id !== colId));

    if (!isNaN(Number(colId))) {
      try {
        await boardApi.deleteColumn(Number(colId));
        showToast.success(`Đã xóa danh sách "${colToDelete?.title || colId}" khỏi DB!`, 'Database Synced');
      } catch (e) {
        console.warn('API deleteColumn error:', e);
        showToast.success(`Đã xóa danh sách "${colToDelete?.title || colId}"`, 'All Task');
      }
    } else {
      showToast.success(`Đã xóa danh sách "${colToDelete?.title || colId}"`, 'All Task');
    }
  };

  const handleToggleHideColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isHidden: !c.isHidden } : c))
    );
    const target = columns.find((c) => c.id === colId);
    if (target?.isHidden) {
      showToast.info(`Đã hiện lại danh sách "${target.title}"`);
    } else if (target) {
      showToast.info(`Đã ẩn danh sách "${target.title}"`);
    }
  };

  const handleUnhideAll = () => {
    setColumns((prev) => prev.map((c) => ({ ...c, isHidden: false })));
    showToast.success('Đã hiển thị tất cả danh sách', 'All Task');
  };

  const handleSort = (type: 'default' | 'dueDate' | 'progress' | 'title') => {
    setActiveSort(type);
    showToast.info(`Sắp xếp: ${type}`, 'All Task');
  };

  const handleFilter = (tag: string | null) => {
    setActiveFilter(tag);
    if (tag) {
      showToast.info(`Lọc theo: ${tag}`, 'All Task');
    } else {
      showToast.info('Hiển thị tất cả dự án con', 'All Task');
    }
  };

  // Filtered & Sorted Tasks based on active filters and hidden lists
  const visibleColumns = useMemo(() => columns.filter((c) => !c.isHidden), [columns]);
  const hiddenColIds = useMemo(
    () => new Set(columns.filter((c) => c.isHidden).map((c) => c.id)),
    [columns]
  );

  const displayedTasks = useMemo(() => {
    let result = [...tasks];

    // Omit tasks belonging to hidden columns
    result = result.filter((t) => !hiddenColIds.has(t.status));

    // Filter by projectTag
    if (activeFilter) {
      result = result.filter((t) => t.projectTag === activeFilter);
    }

    // Sort tasks
    if (activeSort === 'progress') {
      result.sort((a, b) => b.progress - a.progress);
    } else if (activeSort === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (activeSort === 'dueDate') {
      result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }

    return result;
  }, [tasks, hiddenColIds, activeFilter, activeSort]);

  // Tạo công việc mới và lưu vào DB
  const handleCreateTaskFromModal = async (taskData: CreateTaskSavePayload) => {
    const targetStatus = taskData.status || columns[0]?.id || 'in_progress';
    const targetColNum = Number(targetStatus);

    // Lưu trực tiếp vào Database nếu cột có ID số của DB
    if (!isNaN(targetColNum) && targetColNum > 0) {
      try {
        const res = await boardApi.createCard(targetColNum, {
          title: taskData.title || 'New Task',
          description: taskData.description || taskData.title || '',
          assigneeId: taskData.assigneeId,
          dueDate: taskData.dueDateIso,
          storyPoints: taskData.storyPoints || 1.0,
          difficultyLevel: taskData.difficultyLevel || 2,
        });
        const createdCard = res.data;

        // Lưu comment ban đầu vào DB nếu người dùng có nhập
        if (taskData.initialComment && taskData.initialComment.trim()) {
          boardApi.addComment(createdCard.id, taskData.initialComment.trim(), taskData.initialComment.length > 15)
            .catch((err) => console.warn('Failed to save initial comment:', err));
        }

        const newTask: TaskItem = {
          id: String(createdCard.id),
          projectTag: taskData.projectTag || `${projectName} Dashboard`,
          title: createdCard.title,
          description: createdCard.description || taskData.description,
          dueDate: taskData.dueDate || formatDbDate(createdCard.dueDate),
          status: String(targetColNum),
          progress: taskData.progress || 10,
          difficultyLevel: createdCard.difficultyLevel,
          storyPoints: createdCard.storyPoints,
          assigneeId: createdCard.assigneeId,
          commentsCount: taskData.initialComment ? 1 : 0,
          linksCount: 0,
          assignees: taskData.assignees?.length
            ? taskData.assignees
            : createdCard.assigneeName
            ? [{ name: createdCard.assigneeName, avatarText: createdCard.assigneeName.slice(0, 2).toUpperCase(), bg: '#e0f2fe' }]
            : [],
        };
        setTasks((prev) => [newTask, ...prev]);
        showToast.success(`Đã tạo và lưu công việc "${newTask.title}" vào DB!`, 'Database Saved');
        return;
      } catch (e) {
        console.warn('API createCard error:', e);
        showToast.error('Không thể lưu vào DB, đang lưu cục bộ.', 'Warning');
      }
    }

    // Local fallback (khi board chưa sync với DB)
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      projectTag: taskData.projectTag || `${projectName} Dashboard`,
      title: taskData.title || 'New Task',
      description: taskData.description,
      dueDate: taskData.dueDate || '',
      status: targetStatus,
      progress: 10,
      commentsCount: taskData.commentsCount ?? 0,
      linksCount: taskData.linksCount ?? 0,
      assignees: taskData.assignees || [],
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast.success('Đã tạo nhiệm vụ mới thành công!', 'All Task');
  };

  const handleOpenTaskDetail = (task: TaskItem) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return '#059669'; // Green
    if (progress >= 50) return '#0d9488'; // Teal
    if (progress > 0) return '#0284c7'; // Blue
    return '#d1d5db'; // Gray
  };

  const renderColumnIcon = (iconType?: string) => {
    switch (iconType) {
      case 'todo':
        return <ListTodo size={14} />;
      case 'inprogress':
        return <Clock size={14} />;
      case 'inreview':
        return <Sparkles size={14} />;
      case 'completed':
        return <CheckCircle2 size={14} />;
      default:
        return <Columns3 size={14} />;
    }
  };

  return (
    <div className="all-task-section">
      {/* Header bar */}
      <div className="all-task-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 className="all-task-title">All Task</h3>
          {isDbSynced && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
              title="Dữ liệu kết nối trực tiếp cơ sở dữ liệu"
            >
              <Database size={11} /> DB Connected
            </span>
          )}
          {activeFilter && (
            <span className="active-filter-badge" onClick={() => setActiveFilter(null)}>
              Lọc: {activeFilter} ✕
            </span>
          )}
        </div>

        <div className="all-task-controls">
          {/* Segmented view switcher pills */}
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'spreadsheet' ? 'active' : ''}`}
              onClick={() => setViewMode('spreadsheet')}
            >
              <span>Spreadsheet</span>
              <Table size={15} />
            </button>

            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              <span>Timeline</span>
              <BarChart2 size={15} />
            </button>

            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
            >
              <span>Kanban</span>
              <Columns3 size={15} />
            </button>
          </div>

          {/* Custom Icon Button (Tùy biến bảng, Áp dụng cho cả 3 chế độ xem) */}
          <button
            type="button"
            className={`filter-btn ${isCustomPopupOpen ? 'active' : ''}`}
            title="Tùy biến bảng (Add another list, Sort, Filter, Ẩn/Xóa list)"
            onClick={() => setIsCustomPopupOpen((prev) => !prev)}
            aria-label="Tùy biến bảng công việc"
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* Custom Tools Popup anchored here */}
          <CustomToolsPopup
            isOpen={isCustomPopupOpen}
            onClose={() => setIsCustomPopupOpen(false)}
            columns={columns}
            onAddColumn={handleAddColumn}
            onDeleteColumn={handleDeleteColumn}
            onToggleHideColumn={handleToggleHideColumn}
            onUnhideAllColumns={handleUnhideAll}
            onSort={handleSort}
            onFilter={handleFilter}
            activeSort={activeSort}
            activeFilter={activeFilter}
            projectTags={projectTags}
          />
        </div>
      </div>

      {/* ── MODE 1: KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div
          ref={kanbanGridRef}
          className={`kanban-grid ${isGridDragging ? 'is-grid-dragging' : ''}`}
          onMouseDown={handleGridMouseDown}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          onMouseLeave={handleGridMouseUp}
        >
          {visibleColumns.map((col) => {
            const colTasks = displayedTasks.filter((t) => t.status === col.id);
            const isEditing = editingColId === col.id;
            const isDragOver = dragOverColId === col.id || dragOverTaskColId === col.id;

            return (
              <div
                key={col.id}
                className={`kanban-col ${isDragOver ? 'is-drag-target' : ''} ${draggingTaskId && dragOverTaskColId === col.id ? 'is-card-drop-target' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (draggingTaskId) {
                    setDragOverTaskColId(col.id);
                  } else {
                    setDragOverColId(col.id);
                  }
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column entirely (not entering a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverTaskColId === col.id) setDragOverTaskColId(null);
                    if (dragOverColId === col.id) setDragOverColId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleColAreaDrop(e, col.id);
                }}
              >
                {/* Column Header */}
                <div className="kanban-col-head">
                  {/* Column Pill: Double click / Double tap to rename */}
                  <div
                    className={`col-pill ${col.badgeClass}`}
                    title="Double click để đổi tên danh sách"
                    onTouchStart={() => handleTouchHeader(col.id, col.title)}
                  >
                    <span className="col-pill-icon">{renderColumnIcon(col.iconType)}</span>

                    {isEditing ? (
                      <input
                        type="text"
                        className="col-title-inline-input"
                        value={editColTitle}
                        onChange={(e) => setEditColTitle(e.target.value)}
                        onBlur={() => handleSaveRename(col.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(col.id);
                          if (e.key === 'Escape') setEditingColId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="col-pill-title"
                        onDoubleClick={() => handleStartRename(col.id, col.title)}
                      >
                        {col.title}
                      </span>
                    )}

                    <span className="col-pill-count">{colTasks.length}</span>
                  </div>

                  {/* Khoảng trống bên phải tên List: Nắm kéo để di chuyển cột qua trái/phải */}
                  <div
                    className="col-drag-zone"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', col.id);
                      setDraggingColId(col.id);
                    }}
                    onDragEnd={() => {
                      setDraggingColId(null);
                      setDragOverColId(null);
                    }}
                    title="Nắm vào đây kéo qua trái hoặc phải để sắp xếp lại danh sách"
                  >
                    <GripHorizontal size={14} style={{ opacity: 0.35 }} />
                  </div>

                  <div className="col-head-actions">
                    <button
                      type="button"
                      className="col-icon-btn"
                      title="Tùy chọn danh sách"
                      onClick={() => setIsCustomPopupOpen(true)}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    <button
                      type="button"
                      className="col-icon-btn"
                      title={`Thêm task vào ${col.title}`}
                      onClick={() => {
                        setCreateModalDefaultStatus(col.id);
                        setCreateModalOpen(true);
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {/* Column Task Cards */}
                <div className="kanban-cards-list">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`task-card ${draggingTaskId === task.id ? 'is-dragging' : ''}`}
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();           // prevent grid scroll drag
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', task.id);
                        setDraggingTaskId(task.id);
                        setDraggingColId(null);        // ensure col drag is cleared
                      }}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverTaskColId(null);
                      }}
                      onClick={() => handleOpenTaskDetail(task)}
                    >
                      {/* Top row: Project Tag & Options */}
                      <div className="task-card-top">
                        <span className="task-card-tag">{task.projectTag}</span>
                        <button
                          type="button"
                          className="task-card-opt"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>

                      {/* Due date badge */}
                      <div className="task-card-date-wrap">
                        <div className="task-date-pill">
                          <BarChart2 size={12} className="task-date-icon" />
                          <span>{task.dueDate}</span>
                        </div>
                      </div>

                      {/* Task title */}
                      <h4 className="task-card-title">{task.title}</h4>

                      {/* Progress bar */}
                      <div className="task-card-progress-wrap">
                        <span className="task-card-progress-label">
                          Progress : {task.progress}%
                        </span>
                        <div className="task-progress-track">
                          <div
                            className="task-progress-fill"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: getProgressColor(task.progress),
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer: Avatars + Metrics */}
                      <div className="task-card-footer">
                        {/* Member avatar stack */}
                        <div className="task-avatars-stack">
                          {task.assignees.map((a, i) => (
                            <div
                              key={a.name}
                              className="task-avatar-circle"
                              style={{
                                background: a.bg,
                                zIndex: 10 - i,
                              }}
                              title={a.name}
                            >
                              {a.avatarText}
                            </div>
                          ))}
                        </div>

                        {/* Metrics: comments & links */}
                        <div className="task-metrics">
                          <div className="task-metric-item" title={`${task.commentsCount} thảo luận`}>
                            <MessageSquare size={13} />
                            <span>{task.commentsCount}</span>
                          </div>
                          <div className="task-metric-item" title={`${task.linksCount} liên kết / tài liệu`}>
                            <Link2 size={13} />
                            <span>{task.linksCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {colTasks.length === 0 && (
                    <div
                      style={{
                        padding: '24px 12px',
                        textAlign: 'center',
                        color: 'var(--fg3)',
                        fontSize: '12px',
                        border: '1px dashed rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                      }}
                    >
                      Chưa có công việc nào
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODE 2: SPREADSHEET VIEW ── */}
      {viewMode === 'spreadsheet' && (
        <div className="spreadsheet-card">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                <th>Thẻ dự án</th>
                <th>Tên công việc</th>
                <th>Trạng thái</th>
                <th>Tiến độ</th>
                <th>Hạn chót</th>
                <th>Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map((task) => {
                const colObj = columns.find((c) => c.id === task.status);
                const statusLabel = colObj ? colObj.title : task.status;

                return (
                  <tr
                    key={task.id}
                    onClick={() => handleOpenTaskDetail(task)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="spreadsheet-tag">{task.projectTag}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--fg)' }}>{task.title}</strong>
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${task.status}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="task-progress-track" style={{ width: '80px', height: '5px' }}>
                          <div
                            className="task-progress-fill"
                            style={{
                              width: `${task.progress}%`,
                              backgroundColor: getProgressColor(task.progress),
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--fg3)', fontFamily: 'var(--f-mono)' }}>
                          {task.progress}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--fg2)' }}>{task.dueDate}</span>
                    </td>
                    <td>
                      <div className="task-avatars-stack">
                        {task.assignees.map((a, i) => (
                          <div
                            key={a.name}
                            className="task-avatar-circle"
                            style={{ background: a.bg, zIndex: 10 - i }}
                            title={a.name}
                          >
                            {a.avatarText}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODE 3: TIMELINE VIEW ── */}
      {viewMode === 'timeline' && (
        <div className="timeline-view-card">
          <div className="timeline-view-header">
            <span>Tiến độ dòng thời gian các công việc</span>
          </div>
          <div className="timeline-gantt-list">
            {displayedTasks.map((task, idx) => (
              <div key={task.id} className="timeline-gantt-row">
                <div className="timeline-gantt-label">
                  <strong>{task.title}</strong>
                  <small>{task.projectTag} · {task.dueDate}</small>
                </div>
                <div className="timeline-gantt-track">
                  <div
                    className="timeline-gantt-bar"
                    style={{
                      left: `${(idx * 7) % 50}%`,
                      width: `${Math.max(25, task.progress)}%`,
                      backgroundColor: getProgressColor(task.progress),
                    }}
                  >
                    <span>{task.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CREATE TASK MODAL (Ảnh mẫu 1) ── */}
      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateTaskFromModal}
        defaultStatus={createModalDefaultStatus}
        columns={columns}
        teamId={teamId}
      />

      {/* ── TASK DETAIL MODAL (Ảnh mẫu 2) ── */}
      <TaskDetailModal
        isOpen={detailModalOpen}
        task={selectedTask}
        teamId={teamId}
        onClose={() => setDetailModalOpen(false)}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          setSelectedTask(updated);
        }}
      />
    </div>
  );
};
