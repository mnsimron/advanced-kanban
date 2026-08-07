'use client';

import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useKanbanStore } from '@/store/kanbanStore';
import TaskCard from '@/components/TaskCard';
import WelcomeScreen from '@/components/WelcomeScreen';
import { BarChart3, Check, ChevronLeft, Copy, Download, LayoutDashboard, LogOut, Menu, Plus, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDurationLabel = (seconds: number) => {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatReportTimestamp = (value: string | null | undefined) => {
  if (!value) return '—';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return parsedDate.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export default function Home() {
  const { board, roomCode, setRoomCode, fetchBoardData, moveTask, addTask, editTaskSubTasks } = useKanbanStore();
  const history = useKanbanStore((state) => state.board.history || []);
  
  // State untuk mengontrol Modal Pembuatan Task Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string } | null>(null);
  const [editSubTaskTitles, setEditSubTaskTitles] = useState<SubTaskField[]>([createSubTaskField()]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [taskTitle, setTaskTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(4);
  const [subTaskTitles, setSubTaskTitles] = useState<SubTaskField[]>([createSubTaskField()]);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [expandedHistoryTaskIds, setExpandedHistoryTaskIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'board' | 'report'>('board');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedCode = window.localStorage.getItem('mario_kanban_room_code');
    if (savedCode) {
      void setRoomCode(savedCode);
    }
  }, [setRoomCode]);

  useEffect(() => {
    if (roomCode) {
      void fetchBoardData();
    }
  }, [roomCode, fetchBoardData]);

  useEffect(() => {
    const current = new Date();
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1);
    const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    setStartDate(formatDateInputValue(firstDay));
    setEndDate(formatDateInputValue(lastDay));
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

  const normalizedStartDate = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const normalizedEndDate = endDate ? new Date(`${endDate}T23:59:59`) : null;

  const isTaskInRange = (taskDate: string | null | undefined) => {
    if (!taskDate || !normalizedStartDate || !normalizedEndDate) {
      return true;
    }

    const parsedDate = new Date(taskDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return false;
    }

    return parsedDate >= normalizedStartDate && parsedDate <= normalizedEndDate;
  };

  const activeFilteredTasks = Object.values(board.tasks).filter((task) => isTaskInRange(task.createdAt));
  const historyFilteredTasks = history.filter((task) => isTaskInRange(task.createdAt) || isTaskInRange(task.archivedAt));

  const todoTasks = activeFilteredTasks.filter((task) => task.status === 'todo');
  const inProgressTasks = activeFilteredTasks.filter((task) => task.status === 'in-progress');
  const doneTasks = activeFilteredTasks.filter((task) => task.status === 'done');
  const archivedTasks = historyFilteredTasks;

  const columnDistribution = [
    { name: 'Todo', value: todoTasks.length, color: '#E52521' },
    { name: 'In Progress', value: inProgressTasks.length, color: '#FBD000' },
    { name: 'Done', value: doneTasks.length, color: '#24B43C' },
  ];

  const efficiencyData = [
    {
      name: 'On Time',
      value: archivedTasks.filter((task) => task.totalTrackedTime <= task.estimatedTime * 60).length,
      color: '#24B43C',
    },
    {
      name: 'Overtime',
      value: archivedTasks.filter((task) => task.totalTrackedTime > task.estimatedTime * 60).length,
      color: '#E52521',
    },
  ];

  const totalTasksCreated = activeFilteredTasks.length + archivedTasks.length;
  const completedTasksCount = archivedTasks.length;
  const productiveHours = (archivedTasks.reduce((sum, task) => sum + task.totalTrackedTime, 0) / 3600).toFixed(1);
  const totalStoryPoints = activeFilteredTasks.reduce((sum, task) => sum + task.estimatedTime / 60, 0);

  const handleDownloadPdf = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsPdfExporting(true);

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 36;
      const innerWidth = pageWidth - margin * 2;
      let y = margin;

      const drawSectionTitle = (title: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, margin, y);
        y += 18;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('MARIO KANBAN - PRODUCTIVITY REPORT', margin, y);
      y += 26;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Range: ${startDate || 'All'} to ${endDate || 'All'}`, margin, y);
      y += 18;

      drawSectionTitle('SUMMARY METRICS');
      doc.setFontSize(11);
      const metrics = [
        `Total Tasks: ${totalTasksCreated}`,
        `Completed Stages: ${completedTasksCount}`,
        `Productive Hours: ${productiveHours}h`,
        `Estimated Story Points: ${totalStoryPoints.toFixed(1)} SP`,
      ];
      metrics.forEach((line) => {
        doc.text(line, margin, y);
        y += 16;
      });
      y += 8;

      drawSectionTitle('CHART SNAPSHOT');
      const chartCanvas = document.createElement('canvas');
      const chartContext = chartCanvas.getContext('2d');
      if (chartContext) {
        chartCanvas.width = 900;
        chartCanvas.height = 500;
        chartContext.fillStyle = '#ffffff';
        chartContext.fillRect(0, 0, chartCanvas.width, chartCanvas.height);

        const chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chartSvg.setAttribute('width', '900');
        chartSvg.setAttribute('height', '500');
        chartSvg.setAttribute('viewBox', '0 0 900 500');
        chartSvg.innerHTML = `
          <rect width="900" height="500" fill="#ffffff" />
          <text x="40" y="40" font-family="Arial" font-size="18" font-weight="bold">Column Distribution</text>
          <text x="520" y="40" font-family="Arial" font-size="18" font-weight="bold">Time Efficiency</text>
          <rect x="40" y="70" width="360" height="220" fill="none" stroke="#000000" />
          <rect x="500" y="70" width="360" height="220" fill="none" stroke="#000000" />
          ${columnDistribution.map((entry, index) => `
            <rect x="70" y="${95 + index * 55}" width="140" height="28" fill="${entry.color}" />
            <text x="225" y="${113 + index * 55}" font-family="Arial" font-size="12">${entry.name}: ${entry.value}</text>
          `).join('')}
          ${efficiencyData.map((entry, index) => `
            <circle cx="${640 + index * 80}" cy="180" r="42" fill="${entry.color}" fill-opacity="0.85" />
            <text x="${610 + index * 80}" y="235" font-family="Arial" font-size="12" text-anchor="middle">${entry.name}: ${entry.value}</text>
          `).join('')}
        `;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(chartSvg);
        const svgData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        const img = new Image();
        img.src = svgData;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        chartContext.drawImage(img, 0, 0, chartCanvas.width, chartCanvas.height);

        const chartDataUrl = chartCanvas.toDataURL('image/jpeg', 0.6);
        doc.addImage(chartDataUrl, 'JPEG', margin, y, innerWidth, 220);
        y += 235;
      }

      if (y > pageHeight - 220) {
        doc.addPage();
        y = margin;
      }

      drawSectionTitle('PROJECT MISSION MATRIX');
      const tableRows = [
        ...todoTasks.map((task) => ([task.title, 'To Do', `${(task.estimatedTime / 60).toFixed(1)} SP`, formatDurationLabel(task.totalTrackedTime)])),
        ...inProgressTasks.map((task) => ([task.title, 'In Progress', `${(task.estimatedTime / 60).toFixed(1)} SP`, formatDurationLabel(task.totalTrackedTime)])),
        ...doneTasks.map((task) => ([task.title, 'Done', `${(task.estimatedTime / 60).toFixed(1)} SP`, formatDurationLabel(task.totalTrackedTime)])),
        ...archivedTasks.map((task) => ([task.title, 'History', `${(task.estimatedTime / 60).toFixed(1)} SP`, formatDurationLabel(task.totalTrackedTime)])),
      ];

      autoTable(doc, {
        startY: y,
        head: [['Task Title', 'Status', 'Target (SP)', 'Tracked Duration']],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [232, 37, 33], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: margin, right: margin },
        theme: 'grid',
      });

      doc.save(`Mario-Kanban-Report-${startDate || 'all'}-${endDate || 'all'}.pdf`);
    } finally {
      setIsPdfExporting(false);
    }
  };

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

    const storyPoints = Number(estimatedTime);
    const minutesValue = Math.round(storyPoints * 60);

    // Default dimasukkan ke kolom paling awal ('todo')
    addTask('todo', trimmedTaskTitle, minutesValue, validSubTasks);
    
    // Reset Form & Tutup Modal
    setTaskTitle('');
    setEstimatedTime(4);
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

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code', error);
    }
  };

  const handleJoinRoom = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mario_kanban_room_code', normalizedCode);
    }

    await setRoomCode(normalizedCode);
  };

  const handleLeaveRoom = async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mario_kanban_room_code');
    }

    await setRoomCode('');
  };

  const toggleHistoryTask = (taskId: string) => {
    setExpandedHistoryTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const formatHistoryTimestamp = (value: string | null | undefined) => {
    if (!value) return '—';

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getDisplayTime = (task: { totalTrackedTime: number; isTimerRunning: boolean; timerStartedAt: string | null }) => {
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

  if (!roomCode) {
    return <WelcomeScreen onJoinRoom={handleJoinRoom} />;
  }

  return (
    <main className="flex min-h-screen overflow-hidden bg-mario-sky">
      <aside className={`sticky top-0 flex h-screen flex-col justify-between border-r-4 border-black bg-white p-4 shadow-[6px_0_0_0_rgba(0,0,0,0.1)] transition-all duration-300 ${isSidebarExpanded ? 'w-64' : 'w-16'}`}>
        <div>
          <button
            type="button"
            onClick={() => setIsSidebarExpanded((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-none border-4 border-black bg-mario-tertiary text-black transition-all hover:bg-yellow-400 active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Toggle sidebar"
          >
            {isSidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-3 rounded-none border-4 border-black px-3 py-3 font-game text-xs transition-all ${activeTab === 'board' ? 'bg-mario-tertiary text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-700 hover:bg-yellow-100'}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className={`${isSidebarExpanded ? 'block' : 'hidden'}`}>WORKSPACE</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-3 rounded-none border-4 border-black px-3 py-3 font-game text-xs transition-all ${activeTab === 'report' ? 'bg-mario-primary text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            >
              <BarChart3 className="h-5 w-5" />
              <span className={`${isSidebarExpanded ? 'block' : 'hidden'}`}>MONITORING</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className={`flex items-center gap-3 rounded-none border-4 border-black bg-white px-3 py-3 font-game text-xs text-black transition-all hover:bg-orange-400 hover:text-white ${isSidebarExpanded ? '' : 'justify-center'}`}
          >
            <Plus className="h-5 w-5" />
            <span className={`${isSidebarExpanded ? 'block' : 'hidden'}`}>HISTORY</span>
          </button>

          <button
            type="button"
            onClick={handleLeaveRoom}
            className={`flex items-center gap-3 rounded-none border-4 border-black bg-mario-secondary px-3 py-3 font-game text-xs text-white transition-all hover:bg-red-700 ${isSidebarExpanded ? '' : 'justify-center'}`}
          >
            <LogOut className="h-5 w-5" />
            <span className={`${isSidebarExpanded ? 'block' : 'hidden'}`}>LEAVE ROOM</span>
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <header className="w-full rounded-none border-4 border-black bg-mario-brick p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-start gap-2">
                <h1 className="font-game text-xl md:text-2xl text-mario-tertiary drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] tracking-wide animate-[pulse_3s_infinite]">
                  MARIO KANBAN
                </h1>
                <p className="font-game text-[9px] text-white tracking-wider leading-relaxed">
                  TRACK YOUR TASKS LIKE A TRUE MARIO HERO!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 items-center gap-2 rounded-none border-4 border-black bg-white px-3 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                    Room Code:
                  </span>
                  <span className="font-game text-[11px] text-slate-800">
                    {roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRoomCode}
                    className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-black bg-mario-tertiary text-black transition-all hover:bg-yellow-400 active:translate-x-0.5 active:translate-y-0.5"
                    aria-label="Copy room code"
                  >
                    {copiedRoomCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-none border-4 border-black bg-mario-primary px-4 font-game text-xs text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-green-600 active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  <Plus className="h-4 w-4 stroke-[3]" /> CREATE TASK
                </button>
              </div>
            </div>
          </header>

          <div className="flex w-full items-center justify-between rounded-none border-4 border-black bg-white/80 p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="rounded-none border-4 border-black bg-white/90 px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-game text-[10px] text-slate-800 mt-1">
                {formattedDate}
              </p>
              <p className="font-game text-[11px] text-mario-secondary mt-1 tracking-[0.2em]">
                {formattedTime.replace(/\./g, ':')}
              </p>
            </div>
          </div>

          {activeTab === 'board' ? (
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
              const columnDisplayTitles: Record<string, string> = {
                todo: 'TO DO',
                'in-progress': 'IN PROGRESS',
                done: 'DONE',
              };

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
                            {columnDisplayTitles[column.id] ?? columnTitle}
                          </h2>
                          <span className="font-game text-xs bg-black text-white px-2 py-0.5 min-w-[24px] text-center border-2 border-white">
                            {tasks.length}
                          </span>
                        </div>

                        {/* Kontainer Area List Kartu */}
                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                          {tasks.length === 0 ? (
                            <div className="border-4 border-dashed border-slate-400 p-8 text-center text-slate-400 font-game text-[10px] mt-4">
                              EMPTY STAGE
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {tasks.map((task) => (
                                <Draggable draggableId={task.id} index={tasks.findIndex((item) => item.id === task.id)} key={task.id}>
                                  {(draggableProvided) => (
                                    <div
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      className="mb-4 transition-transform duration-200 ease-out"
                                    >
                                      <TaskCard task={task} index={tasks.findIndex((item) => item.id === task.id)} onEditClick={openEditModal} />
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </div>
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
      ) : (
        <div id="mario-report-content" className={`w-full max-w-6xl rounded-none border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${isPdfExporting ? 'w-[1000px] max-w-none p-8 flex flex-col gap-8' : ''}`} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          <div className="flex flex-col gap-4 border-b-4 border-black pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-game text-sm tracking-wide text-slate-800">MONITORING REPORT</h2>
              <p className="font-sans text-sm text-slate-600">Track the selected period with a full preview and export-ready snapshot.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-2 rounded-none border-4 border-black bg-mario-tertiary px-4 py-2 font-game text-xs text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Download className="h-4 w-4" />
              
            </button>
          </div>

          <div className="mt-6 grid gap-4 rounded-none border-4 border-black bg-slate-50 p-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 font-sans text-sm text-slate-700">
              <span className="font-semibold">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-none border-4 border-black bg-white px-3 py-2 text-slate-800"
              />
            </label>
            <label className="flex flex-col gap-2 font-sans text-sm text-slate-700">
              <span className="font-semibold">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-none border-4 border-black bg-white px-3 py-2 text-slate-800"
              />
            </label>
          </div>

          <div className={isPdfExporting ? 'mt-6 w-[1000px] bg-white p-8 flex flex-col gap-8' : 'mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'}>
            <div className="rounded-none border-4 border-black bg-white/90 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4">
                <h2 className="font-game text-sm tracking-wide text-slate-800">COLUMN DISTRIBUTION</h2>
                <p className="font-sans text-sm text-slate-600">Active tasks across the board lanes</p>
              </div>
              <div className="h-72 w-full">
                <BarChart data={columnDistribution} width={450} height={300}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {columnDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </div>
            </div>

            <div className="rounded-none border-4 border-black bg-white/90 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4">
                <h2 className="font-game text-sm tracking-wide text-slate-800">TIME EFFICIENCY</h2>
                <p className="font-sans text-sm text-slate-600">Completed tasks compared to their estimates</p>
              </div>
              <div className="h-72 w-full">
                <PieChart width={450} height={300}>
                  <Pie
                    data={efficiencyData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {efficiencyData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>
          </div>

          <div className="mt-6 mb-6 rounded-none border-4 border-black bg-mario-brick p-6 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-game text-sm tracking-wide">SUMMARY BOARD</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-none border-4 border-black bg-white p-4 text-slate-800">
                <p className="font-sans text-sm font-semibold">Total Tasks Created</p>
                <p className="mt-2 font-game text-xl text-mario-secondary">{totalTasksCreated}</p>
              </div>
              <div className="rounded-none border-4 border-black bg-white p-4 text-slate-800">
                <p className="font-sans text-sm font-semibold">Completed Tasks Count</p>
                <p className="mt-2 font-game text-xl text-mario-primary">{completedTasksCount}</p>
              </div>
              <div className="rounded-none border-4 border-black bg-white p-4 text-slate-800">
                <p className="font-sans text-sm font-semibold">Estimated Story Points</p>
                <p className="mt-2 font-game text-xl text-mario-tertiary">{totalStoryPoints.toFixed(1)} SP</p>
              </div>
              <div className="rounded-none border-4 border-black bg-white p-4 text-slate-800">
                <p className="font-sans text-sm font-semibold">Accumulated Productive Hours</p>
                <p className="mt-2 font-game text-xl text-mario-tertiary">{productiveHours}h</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-none border-4 border-black bg-slate-50 p-6">
            <h2 className="font-game text-sm tracking-wide text-slate-800">TASK DIRECTORY PREVIEW</h2>
            <p className="mt-1 font-sans text-sm text-slate-600">Filtered by {startDate || 'start'} to {endDate || 'end'}.</p>
            <div className="mt-4 space-y-4">
              {[
                { title: 'TO DO LIST', tasks: todoTasks, accent: 'text-mario-secondary' },
                { title: 'IN PROGRESS LIST', tasks: inProgressTasks, accent: 'text-mario-tertiary' },
                { title: 'DONE LIST', tasks: doneTasks, accent: 'text-mario-primary' },
                { title: 'ARCHIVED HISTORY LOG', tasks: archivedTasks, accent: 'text-slate-700' },
              ].map((group) => (
                <div key={group.title} className="rounded-none border-4 border-black bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={`font-game text-xs tracking-wide ${group.accent}`}>{group.title}</h3>
                    <span className="rounded-none border-2 border-black bg-slate-100 px-2 py-1 font-sans text-xs font-semibold text-slate-700">
                      {group.tasks.length}
                    </span>
                  </div>

                  <div className="mt-3 border-t-2 border-dashed border-slate-200 pt-3 space-y-2">
                    {group.tasks.length === 0 ? (
                      <p className="rounded-none border border-dashed border-slate-300 p-3 font-sans text-sm text-slate-500">
                        No tasks in this period.
                      </p>
                    ) : (
                      group.tasks.map((task) => (
                        <div key={task.id} className="grid gap-2 rounded-none border border-black bg-slate-50 p-3 font-sans text-sm md:grid-cols-[1.6fr_1fr_1fr]">
                          <div>
                            <p className="font-semibold text-slate-800">{task.title}</p>
                            <p className="text-xs text-slate-500">Created: {formatReportTimestamp(task.createdAt)}</p>
                          </div>
                          <div className="text-slate-600">{formatReportTimestamp(task.archivedAt)}</div>
                          <div className="text-slate-600">Tracked: {formatDurationLabel(task.totalTrackedTime)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

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
                  const isExpanded = expandedHistoryTaskIds.includes(task.id);
                  const timeString = getDisplayTime(task);

                  return (
                    <div
                      key={task.id}
                      className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleHistoryTask(task.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-game bg-mario-primary text-white px-1.5 py-0.5 border border-black">
                              CLEAR
                            </span>
                            <h4 className="font-bold text-slate-800 line-clamp-1">{task.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400 font-game text-[9px] mt-2">
                            TIME SPENT: <span className="text-mario-secondary">{timeString}</span> / {task.estimatedTime / 60} SP
                          </p>
                        </div>
                        <span className="text-[10px] font-game text-slate-600">{isExpanded ? '−' : '+'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t-2 border-dashed border-slate-200 pt-3">
                          <div className="rounded-none border-2 border-black bg-slate-50 p-3">
                            <p className="text-[10px] font-game uppercase tracking-wide text-slate-600">Created</p>
                            <p className="text-sm text-slate-800">{formatHistoryTimestamp(task.createdAt)}</p>
                          </div>
                          <div className="rounded-none border-2 border-black bg-slate-50 p-3">
                            <p className="text-[10px] font-game uppercase tracking-wide text-slate-600">Completed</p>
                            <p className="text-sm text-slate-800">{formatHistoryTimestamp(task.archivedAt)}</p>
                          </div>
                          <div className="rounded-none border-2 border-black bg-slate-50 p-3">
                            <p className="text-[10px] font-game uppercase tracking-wide text-slate-600">Productivity Time</p>
                            <p className="text-sm font-semibold text-mario-secondary">{timeString}</p>
                          </div>
                          <div className="rounded-none border-2 border-black bg-slate-50 p-3">
                            <p className="text-[10px] font-game uppercase tracking-wide text-slate-600">Sub-tasks</p>
                            <div className="mt-2 space-y-1">
                              {task.subTasks.length > 0 ? (
                                task.subTasks.map((subTask) => (
                                  <div key={subTask.id} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={subTask.isCompleted}
                                      readOnly
                                      className="h-3.5 w-3.5 border-2 border-black accent-mario-primary"
                                    />
                                    <span className={subTask.isCompleted ? 'line-through text-slate-400' : ''}>{subTask.title}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No sub-tasks recorded.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
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
                  ESTIMATED STORY POINTS (1 SP = 1 HOUR)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    required
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(Number(e.target.value))}
                    className="w-28 border-4 border-black p-2 text-center font-game text-xs text-slate-800 focus:outline-none rounded-none"
                  />
                  <span className="text-sm font-semibold text-slate-500 uppercase">SP</span>
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
