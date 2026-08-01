'use client';

import React from 'react';
import { Column, Task } from '@/types/kanban';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onEditClick?: (task: Task) => void;
}

export default function KanbanColumn({ column, tasks, onEditClick }: KanbanColumnProps) {
  // Menentukan warna header kolom berdasarkan status ala Mario Bros
  const getHeaderStyle = () => {
    switch (column.id) {
      case 'todo':
        return 'bg-mario-secondary text-white'; // Merah Topi Mario
      case 'in-progress':
        return 'bg-mario-tertiary text-black';   // Kuning Koin
      case 'done':
        return 'bg-mario-primary text-white';    // Hijau Rumput
      default:
        return 'bg-mario-brick text-white';
    }
  };

  return (
    <div className="w-full min-w-[320px] max-w-[400px] bg-[#EAEAEA] border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[calc(100vh-180px)]">
      {/* Header Kolom Ala Plang Game Retro */}
      <div className={`border-4 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between ${getHeaderStyle()}`}>
        <h2 className="font-game text-xs md:text-sm tracking-wide truncate pr-2">
          {column.title}
        </h2>
        <span className="font-game text-xs bg-black text-white px-2 py-0.5 min-w-[24px] text-center border-2 border-white">
          {tasks.length}
        </span>
      </div>

      {/* Area Daftar Kartu (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
        {tasks.length === 0 ? (
          // Tampilan kosong estetik ala area bonus tersembunyi
          <div className="border-4 border-dashed border-slate-400 p-8 text-center text-slate-400 font-game text-[10px] mt-4">
            EMPTY STAGE
          </div>
        ) : (
          tasks.map((task, index) => (
            <TaskCard key={task.id} task={task} index={index} onEditClick={onEditClick} />
          ))
        )}
      </div>
    </div>
  );
}
