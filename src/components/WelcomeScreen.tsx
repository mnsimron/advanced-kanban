'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface WelcomeScreenProps {
  onJoinRoom: (code: string) => void;
}

const generateRoomCode = () => {
  const prefix = 'MARIO';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
};

export default function WelcomeScreen({ onJoinRoom }: WelcomeScreenProps) {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'none' | 'create' | 'join'>('none');

  useEffect(() => {
    setGeneratedCode(generateRoomCode());
  }, []);

  const persistRoomCode = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mario_kanban_room_code', normalizedCode);
    }

    onJoinRoom(normalizedCode);
  };

  const handleCreateBoard = () => {
    if (!generatedCode) return;
    persistRoomCode(generatedCode);
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code', error);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedCode = roomCodeInput.trim().toUpperCase();
    if (!trimmedCode) return;
    persistRoomCode(trimmedCode);
  };

  return (
    <main className="min-h-screen w-full bg-mario-sky flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-2xl rounded-none border-4 border-black bg-white/90 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-10">
        <div className="border-4 border-black bg-mario-brick p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="font-game text-xl md:text-2xl text-white tracking-[0.2em]">
            MARIO KANBAN BOARD
          </h1>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {activeMenu === 'none' && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setActiveMenu('create')}
                className="rounded-none border-4 border-black bg-mario-primary px-6 py-5 font-game text-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-green-600 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                NEW KANBAN BOARD
              </button>
              <button
                type="button"
                onClick={() => setActiveMenu('join')}
                className="rounded-none border-4 border-black bg-mario-tertiary px-6 py-5 font-game text-sm text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                ENTER YOUR KANBAN
              </button>
            </div>
          )}

          {activeMenu !== 'none' && (
            <div className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button
                type="button"
                onClick={() => setActiveMenu('none')}
                className="mb-4 rounded-none border-4 border-black bg-slate-100 px-3 py-2 font-game text-[10px] text-slate-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-slate-200 active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                ← BACK
              </button>

              {activeMenu === 'create' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-none border-4 border-black bg-slate-50 px-4 py-4">
                    <div className="flex-1 font-game text-sm text-slate-700">
                      {generatedCode || 'Generating code...'}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      disabled={!generatedCode}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-4 border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-100 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreateBoard}
                      disabled={!generatedCode}
                      className="flex-1 rounded-none border-4 border-black bg-mario-primary px-4 py-3 font-game text-sm text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-green-600 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      START NEW WORKSPACE
                    </button>
                  </div>
                </div>
              )}

              {activeMenu === 'join' && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <label className="font-game text-[10px] uppercase tracking-wide text-slate-700" htmlFor="room-code">
                    ROOM CODE
                  </label>
                  <input
                    id="room-code"
                    type="text"
                    value={roomCodeInput}
                    onChange={(event) => setRoomCodeInput(event.target.value)}
                    placeholder="Enter Room Code"
                    className="w-full rounded-none border-4 border-black bg-slate-50 px-3 py-3 font-sans text-sm text-slate-800 outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-none border-4 border-black bg-mario-tertiary px-4 py-3 font-game text-sm text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    JOIN BOARD
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
