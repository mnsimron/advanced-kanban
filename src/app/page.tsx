'use client';

import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useKanbanStore } from '@/store/kanbanStore';
import TaskCard from '@/components/TaskCard';
import { Plus, X } from 'lucide-react';

type SubTaskField = {
  id: string;
  title: string;
};

const createSubTaskField = (title = ''): SubTaskField => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title,
});

export default function Home() {
  const { board, moveTask, addTask, editTaskSubTasks } = useKanbanStore();
  const history = useKanbanStore((state) => state.board.history || []);
  
  // State untuk mengontrol Modal Pembuatan Task Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string } | null>(null);
  const [editSubTaskTitles, setEditSubTaskTitles] = useState<SubTaskField[]>([createSubTaskField()]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskTitle, setTaskTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [subTaskTitles, setSubTaskTitles] = useState<SubTaskField[]>([createSubTaskField()]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const formattedDate = currentDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // Menangani logika setelah kartu selesai di-drag dan di-drop
  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    // Jika di-drop di luar area droppable yang sah
    if (!destination) return;

    // Jika posisi drop sama persis dengan posisi awal
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Eksekusi pemindahan data di Zustand Store
    moveTask(
      source.droppableId,
      destination.droppableId,
      source.index,
      destination.index
    );
  };

  // Menangani submit pembuatan tugas baru
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTaskTitle = taskTitle.trim();
    if (!trimmedTaskTitle) return;

    const validSubTasks = subTaskTitles
      .map((field) => field.title.trim())
      .filter((title) => title.length > 0);

    // Default dimasukkan ke kolom paling awal ('todo')
    addTask('todo', trimmedTaskTitle, Number(estimatedTime), validSubTasks);
    
    // Reset Form & Tutup Modal
    setTaskTitle('');
    setEstimatedTime(30);
    setSubTaskTitles([createSubTaskField()]);
    setIsModalOpen(false);
  };

  const updateSubTaskTitle = (fieldId: string, value: string) => {
    setSubTaskTitles((prev) => prev.map((field) => (field.id === fieldId ? { ...field, title: value } : field)));
  };

  const addSubTaskField = () => {
    setSubTaskTitles((prev) => [...prev, createSubTaskField()]);
  };

  const removeSubTaskField = (fieldId: string) => {
    setSubTaskTitles((prev) => prev.filter((field) => field.id !== fieldId));
  };

  const openEditModal = (task: { id: string; title: string; subTasks?: Array<{ title: string }> }) => {
    const existingSubTasks = task.subTasks?.map((subTask) => subTask.title) ?? [];
    setEditingTask({ id: task.id, title: task.title });
    setEditSubTaskTitles(
      existingSubTasks.length > 0 ? existingSubTasks.map((title) => createSubTaskField(title)) : [createSubTaskField()]
    );
    setIsEditModalOpen(true);
  };

  const updateEditSubTaskTitle = (fieldId: string, value: string) => {
    setEditSubTaskTitles((prev) => prev.map((field) => (field.id === fieldId ? { ...field, title: value } : field)));
  };

  const addEditSubTaskField = () => {
    setEditSubTaskTitles((prev) => [...prev, createSubTaskField()]);
  };

  const removeEditSubTaskField = (fieldId: string) => {
    setEditSubTaskTitles((prev) => prev.filter((field) => field.id !== fieldId));
  };

  const handleEditTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const validSubTasks = editSubTaskTitles
      .map((field) => field.title.trim())
      .filter((title) => title.length > 0);

    editTaskSubTasks(editingTask.id, validSubTasks);
    setIsEditModalOpen(false);
    setEditingTask(null);
    setEditSubTaskTitles([createSubTaskField()]);
  };

  return (
    <main className="min-h-screen w-full px-0 py-4 md:py-8 flex flex-col items-center">
      {/* HEADER BANNER UTAMA */}
      <header className="w-full max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-mario-brick border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <h1 className="font-game text-xl md:text-2xl text-mario-tertiary drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] tracking-wide animate-[pulse_3s_infinite]">
              MARIO KANBAN
            </h1>
            <div>
              <p className="font-game text-[9px] text-white mt-1 tracking-wider leading-relaxed">
              TRACK YOUR TASKS LIKE A TRUE MARIO HERO!
              </p>
              <p className="font-game text-[9px] text-white mt-1 tracking-wider leading-relaxed">
                {formattedDate} - {formattedTime}
              </p>
            </div>
          </div>
        </div>

        {/* TOMBOL START / CREATE TASK */}
        <div className="flex gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-mario-primary hover:bg-green-600 font-game text-xs text-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> CREATE TASK
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="bg-white hover:bg-orange-400 font-game text-xs text-black border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:text-white active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            History
          </button>
        </div>

      </header>

      {/* DRAG AND DROP KANBAN CONTEXT BOARD */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="w-full max-w-6xl flex flex-col md:flex-row justify-center gap-6 overflow-x-auto pb-4 items-start">
          {board.columnOrder.map((columnId) => {
            const column = board.columns[columnId];
            const columnTitle = board.columns[columnId]?.title ?? '';
            const tasks = (column?.taskIds ?? []).map((taskId) => board.tasks[taskId]);
            const columnHeaderClassName = {
              todo: 'bg-mario-secondary text-white',
              'in-progress': 'bg-mario-tertiary text-black',
              done: 'bg-mario-primary text-white',
            }[column?.id ?? 'todo'] ?? 'bg-slate-200 text-slate-800';

            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-full md:w-1/3 min-w-[300px]"
                  >
                    {/* Render Kolom */}
                    <div className="w-full min-w-[320px] max-w-[400px] bg-[#EAEAEA] border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[calc(100vh-220px)]">
                      
                      {/* Plang Atas Judul Kolom */}
                      <div className={`border-4 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between ${columnHeaderClassName}`}>
                        <h2 className="font-game text-xs md:text-sm tracking-wide truncate pr-2">
                          {columnTitle}
                        </h2>
                        <span className="font-game text-xs bg-black text-white px-2 py-0.5 min-w-[24px] text-center border-2 border-white">
                          {tasks.length}
                        </span>
                      </div>

                      {/* Kontainer Area List Kartu */}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                        {tasks.length === 0 ? (
                          <div className="border-4 border-dashed border-slate-400 p-8 text-center text-slate-400 font-game text-[10px] mt-4">
                            EMPTY STAGE
                          </div>
                        ) : (
                          tasks.map((task, index) => (
                            <Draggable draggableId={task.id} index={index} key={task.id}>
                              {(draggableProvided) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  {...draggableProvided.dragHandleProps}
                                  className="mb-4"
                                >
                                  <TaskCard task={task} index={index} onEditClick={openEditModal} />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>

                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* POP-UP MODAL BOX ALA GAME OVER / ITEM SELECTION SCREEN */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 flex justify-end z-50 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setIsHistoryOpen(false)} />

          <div className="relative w-full max-w-md bg-[#EAEAEA] border-l-8 border-black h-full p-6 shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] flex flex-col z-10 animate-slideInRight">
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-mario-secondary cursor-pointer font-game text-sm"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="font-game text-xs md:text-sm text-center mt-6 mb-6 text-white bg-mario-brick border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              TASK HISTORY ({history.length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {history.length === 0 ? (
                <div className="border-4 border-dashed border-slate-400 p-8 text-center text-slate-400 font-game text-[9px] mt-8">
                  NO RECORDS YET &bull; GO CLEAR SOME STAGES!
                </div>
              ) : (
                history.map((task) => {
                  const h = Math.floor(task.totalTrackedTime / 3600);
                  const m = Math.floor((task.totalTrackedTime % 3600) / 60);
                  const s = task.totalTrackedTime % 60;
                  const timeString = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={task.id}
                      className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-game bg-mario-primary text-white px-1.5 py-0.5 border border-black">
                          CLEAR
                        </span>
                        <h4 className="font-bold text-slate-800 line-clamp-1">{task.title}</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-game text-[9px] mt-2">
                        TIME SPENT: <span className="text-mario-secondary">{timeString}</span> / {task.estimatedTime}M
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-8 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none relative">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingTask(null);
                setEditSubTaskTitles([createSubTaskField()]);
              }}
              className="absolute top-4 right-4 text-black hover:text-mario-secondary cursor-pointer"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            <h3 className="font-game text-sm text-center mb-6 text-black border-b-4 border-double border-black pb-2">
              MODIFY TASK
            </h3>

            <form onSubmit={handleEditTaskSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Task
                </label>
                <div className="w-full border-4 border-black bg-slate-100 p-2 text-sm text-slate-700">
                  {editingTask.title}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Sub-tasks
                </label>
                <div className="space-y-2">
                  {editSubTaskTitles.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.title}
                        onChange={(e) => updateEditSubTaskTitle(field.id, e.target.value)}
                        placeholder={`Sub-task ${index + 1}`}
                        className="flex-1 border-4 border-black p-2 font-sans focus:outline-none focus:bg-yellow-50 text-slate-800 rounded-none text-sm placeholder:text-slate-400"
                      />
                      {editSubTaskTitles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditSubTaskField(field.id)}
                          className="border-4 border-black bg-white px-2 py-2 text-slate-700 hover:bg-red-100 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addEditSubTaskField}
                  className="mt-3 border-4 border-black bg-mario-secondary text-white px-3 py-2 font-game text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  ADD SUB-TASK
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-mario-tertiary hover:bg-yellow-400 text-black border-4 border-black font-game text-xs py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  SUBMIT CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-8 border-black p-6 w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-black hover:text-mario-secondary cursor-pointer"
            >
              <X className="w-6 h-6 stroke-[3]" />
            </button>

            <h3 className="font-game text-sm text-center mb-6 text-black border-b-4 border-double border-black pb-2">
              CREATE NEW TASK
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Epic Name
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Misal: Kalahkan Browser Bug..."
                  className="w-full border-4 border-black p-2 font-sans focus:outline-none focus:bg-yellow-50 text-slate-800 rounded-none text-sm placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Time (Estimated in Minutes)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    required
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(Number(e.target.value))}
                    className="w-24 border-4 border-black p-2 text-center font-game text-xs text-slate-800 focus:outline-none rounded-none"
                  />
                  <span className="text-sm font-semibold text-slate-500 uppercase">MENIT</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                  Sub-tasks
                </label>
                <div className="space-y-2">
                  {subTaskTitles.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.title}
                        onChange={(e) => updateSubTaskTitle(field.id, e.target.value)}
                        placeholder={`Sub-task ${index + 1}`}
                        className="flex-1 border-4 border-black p-2 font-sans focus:outline-none focus:bg-yellow-50 text-slate-800 rounded-none text-sm placeholder:text-slate-400"
                      />
                      {subTaskTitles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubTaskField(field.id)}
                          className="border-4 border-black bg-white px-2 py-2 text-slate-700 hover:bg-red-100 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addSubTaskField}
                  className="mt-3 border-4 border-black bg-mario-secondary text-white px-3 py-2 font-game text-[10px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  ADD SUB-TASK
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-mario-tertiary hover:bg-yellow-400 text-black border-4 border-black font-game text-xs py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  SUBMIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
