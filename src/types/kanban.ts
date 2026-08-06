export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Label {
  id: string;
  text: string;
  color: string; // Kode hex warna latar belakang tag
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done'; // Status kolom
  labels: Label[];
  subTasks: SubTask[];
  
  // Fitur Estimasi & Live Timer
  estimatedTime: number;    // Dalam hitungan menit (misal: 60 untuk 1 jam)
  totalTrackedTime: number; // Akumulasi waktu pengerjaan dalam satuan detik
  isTimerRunning: boolean;
  timerStartedAt: string | null; // ISO String waktu saat tombol Play ditekan
  isArchived: boolean;
  archivedAt: string | null;
  
  createdAt: string;
}

export interface Column {
  id: 'todo' | 'in-progress' | 'done';
  title: string;
  taskIds: string[]; // Menyimpan urutan ID kartu di dalam kolom ini
}

export interface BoardState {
  tasks: Record<string, Task>; // Struktur objek { [taskId]: Task } agar pencarian cepat
  columns: Record<string, Column>; // Struktur objek { [columnId]: Column }
  columnOrder: string[]; // Urutan kolom secara horizontal
  history?: Task[];
}
