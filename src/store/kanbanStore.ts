import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BoardState, Task } from '@/types/kanban';

interface KanbanStore {
  board: BoardState;
  
  // Actions Kanban
  moveTask: (sourceCol: string, destCol: string, sourceIndex: number, destIndex: number) => void;
  addTask: (columnId: 'todo' | 'in-progress' | 'done', title: string, estimatedTime: number, subTaskTitles: string[]) => void;
  editTaskSubTasks: (taskId: string, subTaskTitles: string[]) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  
  // Actions Live Timer
  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;
  updateActiveTimers: () => void; // Dipanggil setiap 1 detik oleh setInterval global
  moveToHistory: (taskId: string) => void;
}

const COLUMN_IDS = {
  todo: 'todo',
  inProgress: 'in-progress',
  done: 'done',
} as const;

const createInitialBoardState = (): BoardState => ({
  tasks: {},
  columns: {
    [COLUMN_IDS.todo]: { id: COLUMN_IDS.todo, title: 'TODO', taskIds: [] },
    [COLUMN_IDS.inProgress]: { id: COLUMN_IDS.inProgress, title: 'IN PROGRESS', taskIds: [] },
    [COLUMN_IDS.done]: { id: COLUMN_IDS.done, title: 'DONE', taskIds: [] }
  },
  columnOrder: [COLUMN_IDS.todo, COLUMN_IDS.inProgress, COLUMN_IDS.done],
  history: []
});

const normalizeBoardState = (board?: Partial<BoardState> | null): BoardState => {
  const defaults = createInitialBoardState();
  const persistedBoard = board ?? {};

  return {
    ...defaults,
    ...persistedBoard,
    tasks: persistedBoard.tasks ?? defaults.tasks,
    columns: {
      [COLUMN_IDS.todo]: {
        ...defaults.columns[COLUMN_IDS.todo],
        ...persistedBoard.columns?.[COLUMN_IDS.todo],
        id: COLUMN_IDS.todo,
        title: defaults.columns[COLUMN_IDS.todo].title,
      },
      [COLUMN_IDS.inProgress]: {
        ...defaults.columns[COLUMN_IDS.inProgress],
        ...persistedBoard.columns?.[COLUMN_IDS.inProgress],
        id: COLUMN_IDS.inProgress,
        title: defaults.columns[COLUMN_IDS.inProgress].title,
      },
      [COLUMN_IDS.done]: {
        ...defaults.columns[COLUMN_IDS.done],
        ...persistedBoard.columns?.[COLUMN_IDS.done],
        id: COLUMN_IDS.done,
        title: defaults.columns[COLUMN_IDS.done].title,
      },
    },
    columnOrder: [COLUMN_IDS.todo, COLUMN_IDS.inProgress, COLUMN_IDS.done],
  };
};

const initialBoardState = createInitialBoardState();

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
      board: initialBoardState,

      // Logika Drag-and-Drop Kartu
      moveTask: (sourceCol, destCol, sourceIndex, destIndex) => {
        set((state) => {
          const newColumns = { ...state.board.columns };
          const startCol = newColumns[sourceCol];
          const finishCol = newColumns[destCol];

          if (!startCol || !finishCol || !Array.isArray(startCol.taskIds) || !Array.isArray(finishCol.taskIds)) {
            return {};
          }

          // 1. Perpindahan di kolom yang sama
          if (startCol === finishCol) {
            const newTaskIds = Array.from(startCol.taskIds);
            const [movedTaskId] = newTaskIds.splice(sourceIndex, 1);
            newTaskIds.splice(destIndex, 0, movedTaskId);

            newColumns[sourceCol] = { ...startCol, taskIds: newTaskIds };
            return { board: { ...state.board, columns: newColumns } };
          }

          // 2. Perpindahan antar kolom berbeda
          const startTaskIds = Array.from(startCol.taskIds);
          const [movedTaskId] = startTaskIds.splice(sourceIndex, 1);
          const finishTaskIds = Array.from(finishCol.taskIds);
          finishTaskIds.splice(destIndex, 0, movedTaskId);

          newColumns[sourceCol] = { ...startCol, taskIds: startTaskIds };
          newColumns[destCol] = { ...finishCol, taskIds: finishTaskIds };

          // Otomatis update status property di dalam objek Task-nya
          const updatedTasks = { ...state.board.tasks };
          updatedTasks[movedTaskId] = { 
            ...updatedTasks[movedTaskId], 
            status: destCol as 'todo' | 'in-progress' | 'done' 
          };

          return { board: { ...state.board, tasks: updatedTasks, columns: newColumns } };
        });
      },

      // Tambah Kartu Baru
      addTask: (columnId, title, estimatedTime, subTaskTitles) => {
        const id = `task-${Date.now()}`;
        const trimmedSubTaskTitles = (subTaskTitles ?? [])
          .map((subTaskTitle) => subTaskTitle.trim())
          .filter((subTaskTitle) => subTaskTitle.length > 0);

        const cleanedSubTasks = trimmedSubTaskTitles.map((subTaskTitle, index) => ({
          id: `sub-${Date.now()}-${index}`,
          title: subTaskTitle,
          isCompleted: false,
        }));

        const newTask: Task = {
          id,
          title,
          description: '',
          status: columnId,
          labels: [],
          subTasks: cleanedSubTasks,
          estimatedTime,
          totalTrackedTime: 0,
          isTimerRunning: false,
          timerStartedAt: null,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          board: {
            ...state.board,
            tasks: { ...state.board.tasks, [id]: newTask },
            columns: {
              ...state.board.columns,
              [columnId]: {
                ...state.board.columns[columnId],
                taskIds: [...state.board.columns[columnId].taskIds, id]
              }
            }
          }
        }));
      },

      editTaskSubTasks: (taskId, subTaskTitles) => {
        set((state) => {
          const task = state.board.tasks[taskId];
          if (!task || task.status !== 'todo') return {};

          const trimmedSubTaskTitles = (subTaskTitles ?? [])
            .map((subTaskTitle) => subTaskTitle.trim())
            .filter((subTaskTitle) => subTaskTitle.length > 0);

          const updatedSubTasks = trimmedSubTaskTitles.map((subTaskTitle, index) => ({
            id: `sub-${Date.now()}-${index}`,
            title: subTaskTitle,
            isCompleted: false,
          }));

          const updatedTasks = { ...state.board.tasks };
          updatedTasks[taskId] = { ...task, subTasks: updatedSubTasks };

          return { board: { ...state.board, tasks: updatedTasks } };
        });
      },

      // Ceklis Sub-task
      toggleSubTask: (taskId, subTaskId) => {
        set((state) => {
          const updatedTasks = { ...state.board.tasks };
          const task = updatedTasks[taskId];
          if (!task) return {};

          const updatedSubTasks = task.subTasks.map(sub => 
            sub.id === subTaskId ? { ...sub, isCompleted: !sub.isCompleted } : sub
          );

          updatedTasks[taskId] = { ...task, subTasks: updatedSubTasks };
          return { board: { ...state.board, tasks: updatedTasks } };
        });
      },

      // TIMER ACTIONS: Mulai menghitung waktu
      startTimer: (taskId) => {
        set((state) => {
          const updatedTasks = { ...state.board.tasks };
          const task = updatedTasks[taskId];

          if (task && !task.isTimerRunning) {
            task.isTimerRunning = true;
            task.timerStartedAt = new Date().toISOString();
          }

          return { board: { ...state.board, tasks: updatedTasks } };
        });
      },

      // TIMER ACTIONS: Jeda hitungan waktu
      pauseTimer: (taskId) => {
        set((state) => {
          const updatedTasks = { ...state.board.tasks };
          const task = updatedTasks[taskId];

          if (task && task.isTimerRunning && task.timerStartedAt) {
            const elapsedSeconds = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
            task.totalTrackedTime += elapsedSeconds;
            task.isTimerRunning = false;
            task.timerStartedAt = null;
          }

          return { board: { ...state.board, tasks: updatedTasks } };
        });
      },

      // TIMER ACTIONS: Fungsi pembaruan visual real-time
      updateActiveTimers: () => {
        set((state) => {
          const updatedTasks = { ...state.board.tasks };
          let hasUpdates = false;

          Object.keys(updatedTasks).forEach((id) => {
            const task = updatedTasks[id];
            const startedAt = task.timerStartedAt ? new Date(task.timerStartedAt) : null;
            const isValidStartedAt = startedAt instanceof Date && !isNaN(startedAt.getTime());

            if (task.isTimerRunning && task.timerStartedAt && !isValidStartedAt) {
              task.isTimerRunning = false;
              task.timerStartedAt = null;
              updatedTasks[id] = { ...task };
              hasUpdates = true;
              return;
            }

            // Jika timer running, kita trigger re-render dengan update tipis agar UI tahu waktu berjalan
            if (task.isTimerRunning && task.timerStartedAt && isValidStartedAt) {
              updatedTasks[id] = { ...task }; 
              hasUpdates = true;
            }
          });

          return hasUpdates ? { board: { ...state.board, tasks: updatedTasks } } : {};
        });
      },

      moveToHistory: (taskId) => {
        set((state) => {
          const task = state.board.tasks[taskId];
          if (!task) return {};

          const remainingTasks = Object.fromEntries(
            Object.entries(state.board.tasks).filter(([id]) => id !== taskId)
          );

          const updatedColumns = { ...state.board.columns };
          Object.values(updatedColumns).forEach((column) => {
            updatedColumns[column.id] = {
              ...column,
              taskIds: column.taskIds.filter((id) => id !== taskId),
            };
          });

          return {
            board: {
              ...state.board,
              tasks: remainingTasks,
              columns: updatedColumns,
              history: [...(state.board.history ?? []), task],
            },
          };
        });
      }
    }),
    {
      name: 'mario-kanban-storage',
      version: 2,
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...(currentState as unknown as Record<string, unknown>),
          ...(persistedState as unknown as Record<string, unknown>),
        };

        if (mergedState.board) {
          mergedState.board = normalizeBoardState(mergedState.board as Partial<BoardState>);
        }

        return mergedState as unknown as typeof currentState;
      },
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            board: normalizeBoardState((persistedState as { board?: Partial<BoardState> } | undefined)?.board),
          };
        }

        return persistedState as typeof persistedState;
      },
      partialize: (state) => ({ board: state.board }),
    }
  )
);
