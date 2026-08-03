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

        <div className="mt-6 space-y-6">
          <div className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-sans text-lg font-semibold text-slate-800">Create a New Board</h2>
            <p className="mt-2 font-sans text-sm text-slate-600">
              Start a new workspace and generate a secure room code for your team.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-none border-4 border-black bg-slate-50 px-3 py-2 font-game text-sm text-slate-700">
                {generatedCode || 'Generating code...'}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                disabled={!generatedCode}
                className="rounded-none border-4 border-black bg-white px-3 py-2 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-100 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleCreateBoard}
                disabled={!generatedCode}
                className="rounded-none border-4 border-black bg-mario-primary px-4 py-2 font-sans font-semibold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-green-600 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                CREATE NEW BOARD
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="border-4 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-sans text-lg font-semibold text-slate-800">Access an Existing Board</h2>
            <p className="mt-2 font-sans text-sm text-slate-600">
              Enter the room code shared with you to continue working on the board.
            </p>
            <label className="mt-4 block text-sm font-semibold uppercase tracking-wide text-slate-700" htmlFor="room-code">
              Room Code
            </label>
            <input
              id="room-code"
              type="text"
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value)}
              placeholder="Enter Room Code"
              className="mt-2 w-full rounded-none border-4 border-black bg-slate-50 px-3 py-2 font-sans text-sm text-slate-800 outline-none"
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-none border-4 border-black bg-mario-tertiary px-4 py-2 font-sans font-semibold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              JOIN BOARD
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
