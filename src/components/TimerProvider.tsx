'use client';

import React, { useEffect, useState } from 'react';
import { useKanbanStore } from '@/store/kanbanStore';

export default function TimerProvider({ children }: { children: React.ReactNode }) {
  const updateActiveTimers = useKanbanStore((state) => state.updateActiveTimers);
  const [mounted, setMounted] = useState(false);

  // 1. Efek untuk menyalakan detak jam global (Heartbeat)
  useEffect(() => {
    const interval = setInterval(() => {
      updateActiveTimers();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateActiveTimers]);

  // 2. Mencegah Hydration Mismatch antara Server dan Client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
