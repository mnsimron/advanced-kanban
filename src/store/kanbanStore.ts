import { create } from 'zustand';
import { BoardState, Task } from '@/types/kanban';
import { supabase } from '@/utils/supabase';

interface KanbanStore {
  board: BoardState;
  roomCode: string | null;

  setRoomCode: (code: string) => Promise<void>;
  fetchBoardData: () => Promise<void>;

  // Actions Kanban
  moveTask: (sourceCol: string, destCol: string, sourceIndex: number, destIndex: number) => Promise<void>;
  addTask: (columnId: 'todo' | 'in-progress' | 'done', title: string, estimatedTime: number, subTaskTitles: string[]) => Promise<void>;
  editTaskSubTasks: (taskId: string, subTaskTitles: string[]) => Promise<void>;
  toggleSubTask: (taskId: string, subTaskId: string) => Promise<void>;

  // Actions Live Timer
  startTimer: (taskId: string) => Promise<void>;
  pauseTimer: (taskId: string) => Promise<void>;
  updateActiveTimers: () => void;
  moveToHistory: (taskId: string) => Promise<void>;
}

interface SupabaseSubTaskRow {
  id: string;
  task_id: string;
  title: string;
  is_completed?: boolean | null;
  created_at?: string | null;
}

interface SupabaseTaskRowWithSubTasks {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  estimated_time?: number | null;
  total_tracked_time?: number | null;
  is_timer_running?: boolean | null;
  timer_started_at?: string | null;
  created_at?: string | null;
  room_code?: string | null;
  sub_tasks?: SupabaseSubTaskRow[] | null;
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

const normalizeTaskStatus = (status?: string | null): Task['status'] => {
  if (status === 'in-progress' || status === 'done') {
    return status;
  }

  return 'todo';
};

const createBoardFromSupabaseRows = (
  taskRows: SupabaseTaskRowWithSubTasks[]
): BoardState => {
  const board = createInitialBoardState();

  taskRows.forEach((row) => {
    const taskId = row.id;
    const task: Task = {
      id: taskId,
      title: row.title ?? '',
      description: row.description ?? '',
      status: normalizeTaskStatus(row.status),
      labels: [],
      subTasks: (row.sub_tasks ?? []).map((subTask) => ({
        id: subTask.id,
        title: subTask.title,
        isCompleted: Boolean(subTask.is_completed),
      })),
      estimatedTime: Number(row.estimated_time ?? 0),
      totalTrackedTime: Number(row.total_tracked_time ?? 0),
      isTimerRunning: Boolean(row.is_timer_running),
      timerStartedAt: row.timer_started_at ?? null,
      createdAt: row.created_at ?? new Date().toISOString(),
    };

    board.tasks[taskId] = task;
    board.columns[task.status].taskIds.push(task.id);
  });

  return board;
};

const initialBoardState = createInitialBoardState();

export const useKanbanStore = create<KanbanStore>()((set, get) => ({
  board: initialBoardState,
  roomCode: null,

  setRoomCode: async (code) => {
    const normalizedCode = code.trim();
    set({ roomCode: normalizedCode || null });

    if (normalizedCode) {
      await get().fetchBoardData();
    } else {
      set({ board: createInitialBoardState() });
    }
  },

  fetchBoardData: async () => {
    const roomCode = get().roomCode;

    if (!roomCode || !supabase) {
      set({ board: createInitialBoardState() });
      return;
    }

    set({ board: createInitialBoardState() });

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        sub_tasks (*)
      `)
      .eq('room_code', roomCode)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch Supabase board data', error);
      return;
    }

    const board = createBoardFromSupabaseRows((data as SupabaseTaskRowWithSubTasks[]) ?? []);

    set({ board });
  },

  moveTask: async (sourceCol, destCol, sourceIndex, destIndex) => {
    const roomCode = get().roomCode;
    const movedTaskId = get().board.columns[sourceCol]?.taskIds?.[sourceIndex];

    if (!roomCode || !movedTaskId || !supabase) {
      return;
    }

    const status = destCol as Task['status'];
    await supabase.from('tasks').update({ status }).eq('id', movedTaskId);
    await get().fetchBoardData();
  },

  addTask: async (columnId, title, estimatedTime, subTaskTitles) => {
    const roomCode = get().roomCode;

    if (!roomCode || !supabase) {
      return;
    }

    const trimmedSubTaskTitles = (subTaskTitles ?? [])
      .map((subTaskTitle) => subTaskTitle.trim())
      .filter((subTaskTitle) => subTaskTitle.length > 0);

    const cleanedSubTasks = trimmedSubTaskTitles.map((subTaskTitle, index) => ({
      id: `sub-${Date.now()}-${index}`,
      title: subTaskTitle,
      isCompleted: false,
    }));

    const newTaskPayload = {
      room_code: roomCode,
      title,
      description: '',
      status: columnId,
      estimated_time: estimatedTime,
      total_tracked_time: 0,
      is_timer_running: false,
      timer_started_at: null,
      created_at: new Date().toISOString(),
    };

    const { data: insertedTask, error: taskError } = await supabase
      .from('tasks')
      .insert([{ ...newTaskPayload }])
      .select()
      .single();

    if (taskError || !insertedTask) {
      console.error('Supabase Task Insert Error:', taskError);
      return;
    }

    if (cleanedSubTasks.length > 0) {
      const subTaskPayload = cleanedSubTasks.map((subTask) => ({
        task_id: insertedTask.id,
        title: subTask.title,
        is_completed: false,
        created_at: new Date().toISOString(),
      }));

      const { error: subTaskError } = await supabase.from('sub_tasks').insert(subTaskPayload);

      if (subTaskError) {
        console.error('Supabase Sub-Task Insert Error:', subTaskError);
      }
    }

    await get().fetchBoardData();
  },

  editTaskSubTasks: async (taskId, subTaskTitles) => {
    const roomCode = get().roomCode;
    const task = get().board.tasks[taskId];

    if (!roomCode || !task || task.status !== 'todo' || !supabase) {
      return;
    }

    const trimmedSubTaskTitles = (subTaskTitles ?? [])
      .map((subTaskTitle) => subTaskTitle.trim())
      .filter((subTaskTitle) => subTaskTitle.length > 0);

    const { error: deleteError } = await supabase.from('sub_tasks').delete().eq('task_id', taskId);
    if (deleteError) {
      console.error('Failed to replace sub-tasks in Supabase', deleteError);
      return;
    }

    if (trimmedSubTaskTitles.length > 0) {
      const subTaskPayload = trimmedSubTaskTitles.map((subTaskTitle, index) => ({
        id: `sub-${Date.now()}-${index}`,
        task_id: taskId,
        title: subTaskTitle,
        is_completed: false,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('sub_tasks').insert(subTaskPayload);
      if (insertError) {
        console.error('Failed to insert updated sub-tasks in Supabase', insertError);
        return;
      }
    }

    await get().fetchBoardData();
  },

  toggleSubTask: async (taskId, subTaskId) => {
    const roomCode = get().roomCode;
    const task = get().board.tasks[taskId];
    const subTask = task?.subTasks.find((item) => item.id === subTaskId);

    if (!roomCode || !subTask || !supabase) {
      return;
    }

    const { error } = await supabase
      .from('sub_tasks')
      .update({ is_completed: !subTask.isCompleted })
      .eq('id', subTaskId);

    if (error) {
      console.error('Failed to toggle sub-task in Supabase', error);
      return;
    }

    await get().fetchBoardData();
  },

  startTimer: async (taskId) => {
    const roomCode = get().roomCode;

    if (!roomCode || !supabase) {
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ is_timer_running: true, timer_started_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error('Failed to start timer in Supabase', error);
      return;
    }

    await get().fetchBoardData();
  },

  pauseTimer: async (taskId) => {
    const roomCode = get().roomCode;
    const task = get().board.tasks[taskId];

    if (!roomCode || !task || !supabase) {
      return;
    }

    let elapsedSeconds = 0;
    if (task.isTimerRunning && task.timerStartedAt) {
      elapsedSeconds = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
    }

    const nextTrackedTime = task.totalTrackedTime + elapsedSeconds;
    const { error } = await supabase
      .from('tasks')
      .update({
        total_tracked_time: nextTrackedTime,
        is_timer_running: false,
        timer_started_at: null,
      })
      .eq('id', taskId);

    if (error) {
      console.error('Failed to pause timer in Supabase', error);
      return;
    }

    await get().fetchBoardData();
  },

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

        if (task.isTimerRunning && task.timerStartedAt && isValidStartedAt) {
          updatedTasks[id] = { ...task };
          hasUpdates = true;
        }
      });

      return hasUpdates ? { board: { ...state.board, tasks: updatedTasks } } : {};
    });
  },

  moveToHistory: async (taskId) => {
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
  },
}));
