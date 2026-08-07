'use client';

import React from 'react';
import { Task } from '@/types/kanban';
import { useKanbanStore } from '@/store/kanbanStore';
import { Play, Pause, CheckSquare, Clock, Pencil } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onEditClick?: (task: Task) => void;
}

export default function TaskCard({ task, index, onEditClick }: TaskCardProps) {
  const { startTimer, pauseTimer, toggleSubTask } = useKanbanStore();
  const moveToHistory = useKanbanStore((state) => state.moveToHistory);

  // Menghitung total waktu berjalan secara real-time
  const getDisplayTime = () => {
    const parsedTrackedTime = Number.isFinite(task.totalTrackedTime) ? task.totalTrackedTime : 0;
    const safeTrackedTime = Math.max(0, parsedTrackedTime);

    let seconds = safeTrackedTime;
    if (task.isTimerRunning && task.timerStartedAt) {
      const startedAt = new Date(task.timerStartedAt);
      const isValidStartedAt = startedAt instanceof Date && !isNaN(startedAt.getTime());

      if (isValidStartedAt) {
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        seconds += Number.isFinite(elapsed) ? elapsed : 0;
      }
    }

    const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const h = Math.floor(safeSeconds / 3600);
    const m = Math.floor((safeSeconds % 3600) / 60);
    const s = safeSeconds % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Menghitung status progres sub-task
  const completedSubTasks = task.subTasks.filter(s => s.isCompleted).length;
  const totalSubTasks = task.subTasks.length;
  const progressPercent = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

  // Cek apakah waktu pengerjaan melebihi estimasi (Overtime)
  const estimatedStoryPoints = task.estimatedTime / 60;
  const trackedHours = task.totalTrackedTime / 3600;
  const isOvertime = trackedHours > estimatedStoryPoints;
  const estimatedStoryPointsLabel = Number.isInteger(estimatedStoryPoints)
    ? estimatedStoryPoints.toString()
    : estimatedStoryPoints.toFixed(1);

  const createdAtLabel = (() => {
    const createdAtDate = new Date(task.createdAt);
    const isValidDate = createdAtDate instanceof Date && !Number.isNaN(createdAtDate.getTime());

    if (!isValidDate) {
      return '';
    }

    return createdAtDate.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/, /, ' - ');
  })();

  return (
    <div 
      className={`bg-white border-4 border-black p-4 mb-4 rounded-none select-none transition-all
        ${task.isTimerRunning 
          ? 'shadow-[4px_4px_0px_0px_#24B43C] ring-2 ring-mario-primary ring-offset-2 animate-[pulse_2s_infinite]' 
          : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
        }`}
    >
      {/* Label Kategori / Level */}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(label => (
            <span 
              key={label.id} 
              style={{ backgroundColor: label.color }} 
              className="text-[10px] font-game text-white px-2 py-0.5 border-2 border-black uppercase"
            >
              {label.text}
            </span>
          ))}
        </div>
      )}

      {createdAtLabel && (
        <p className="text-[9px] sm:text-xs text-slate-400 mb-2 tracking-wide">
          {createdAtLabel}
        </p>
      )}

      {/* Judul Kartu */}
      <h3 className="font-semibold text-lg text-slate-800 leading-tight mb-1">
        {task.title}
      </h3>
      
      {task.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">{task.description}</p>
      )}

      {/* Bagian Sub-Tasks (Checklist Item) */}
      {totalSubTasks > 0 && (
        <div className="mb-4 bg-slate-50 border-2 border-black p-2 text-xs">
          <div className="flex justify-between font-medium mb-1 text-slate-700">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" /> PROGRESS
            </span>
            <span>{completedSubTasks}/{totalSubTasks} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-200 h-2 border border-black">
            <div 
              className="bg-mario-tertiary h-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 space-y-1">
            {task.subTasks.map(sub => (
              <label 
                key={sub.id} 
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-0.5"
              >
                <input 
                  type="checkbox" 
                  checked={sub.isCompleted} 
                  onChange={() => toggleSubTask(task.id, sub.id)}
                  className="w-3.5 h-3.5 accent-mario-primary border-2 border-black rounded-none"
                />
                <span className={`text-slate-600 ${sub.isCompleted ? 'line-through text-slate-400' : ''}`}>
                  {sub.title}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Baris Bawah: Timer & Kontrol Kecepatan */}
      <div className="flex items-center justify-between border-t-2 border-dashed border-slate-200 pt-3">
        {/* Visual Waktu */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> ESTIMATE: {estimatedStoryPointsLabel} SP
          </span>
          <span 
            className={`font-game text-sm mt-0.5 tracking-wider
              ${task.isTimerRunning ? 'text-mario-primary' : 'text-slate-700'}
              ${isOvertime ? 'text-mario-secondary font-bold' : ''}`}
          >
            {getDisplayTime()}
          </span>
        </div>

        {/* Kontrol Aksi */}
        <div className="flex items-center gap-2">
          {task.status === 'todo' && (
            <button
              onClick={() => onEditClick?.(task)}
              className="flex items-center gap-1 bg-cyan-400 text-black text-[10px] font-game px-2.5 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {task.status === 'done' ? (
            <button
              onClick={() => moveToHistory(task.id)}
              className="bg-mario-brick text-white text-[10px] font-game px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-amber-800"
            >
              ARCHIVE
            </button>
          ) : (
            <button
              onClick={() => task.isTimerRunning ? pauseTimer(task.id) : startTimer(task.id)}
              className={`flex items-center justify-center p-2 border-2 border-black rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all
                ${task.isTimerRunning 
                  ? 'bg-mario-secondary text-white' 
                  : 'bg-mario-tertiary text-black'
                }`}
            >
              {task.isTimerRunning ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
