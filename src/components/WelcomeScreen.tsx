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
    <main className="relative h-screen w-full overflow-hidden bg-mario-sky px-4 py-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-6 animate-cloud-fast opacity-90">
          <img src="./awan-1.png" alt="Cloud" className="h-40 w-64 object-contain" />
        </div>

        <div className="absolute left-0 top-16 animate-cloud-medium opacity-80">
          <img src="./awan-2.png" alt="Cloud" className="h-30 w-54 object-contain" />
        </div>

        <div className="absolute left-0 top-28 animate-cloud-slow opacity-75">
          <img src="./awan-1.png" alt="Cloud" className="h-40 w-64 object-contain" />
        </div>

        <div className="absolute bottom-16 left-0 right-0 h-40 pointer-events-none">
          <div className="absolute bottom-0 left-[-10%] h-28 w-[70%] rounded-t-[120px] border-t-4 border-black bg-mario-primary shadow-[0_-6px_0_0_rgba(0,0,0,0.2)]" />
          <div className="absolute bottom-0 left-[28%] h-24 w-[45%] rounded-t-[120px] border-t-4 border-black bg-mario-primary shadow-[0_-6px_0_0_rgba(0,0,0,0.2)]" />
          <div className="absolute bottom-0 right-[-8%] h-32 w-[60%] rounded-t-[120px] border-t-4 border-black bg-mario-primary shadow-[0_-6px_0_0_rgba(0,0,0,0.2)]" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 border-t-4 border-black bg-mario-brick">
          <div className="absolute inset-0 opacity-80">
            {Array.from({ length: 18 }).map((_, index) => (
              <div key={index} className="absolute top-0 h-full w-4 border-r-4 border-black" style={{ left: `${index * 6}%` }} />
            ))}
          </div>
        </div>
      </div>

      <section className="relative z-10 mx-auto w-full max-w-2xl rounded-none border-4 border-black bg-white/90 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:p-10">
        <div className="absolute right-1 top-0 z-20 hidden sm:block">
          <img
            src="/blok-why.png"
            alt="Decorative block"
            className="h-22 w-22 object-contain animate-flip-front-back drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] md:h-24 md:w-24"
          />
        </div>
        <div className="rounded-none border-4 border-black bg-mario-brick p-5 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="font-game text-lg md:text-2xl text-white tracking-[0.2em] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            MARIO KANBAN BOARD
          </h1>
        </div>

        <div className="mt-8 flex flex-col gap-4">
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
