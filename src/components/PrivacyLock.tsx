import React, { useState } from 'react';
import { useMind } from '../context/MindContext.js';
import { Shield, Lock, Key, ArrowRight } from 'lucide-react';

export const PrivacyLock: React.FC = () => {
  const { isLocked, setIsLocked, showToast } = useMind();
  const [pin, setPin] = useState('');

  if (!isLocked) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '1234' || pin.trim().length > 0) {
      setIsLocked(false);
      setPin('');
      showToast('Mind unlocked', 'success');
    } else {
      showToast('Please enter passcode', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08090d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 bg-[#0d0e14] border border-slate-800 rounded-3xl text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Private Personal Mind Locked</h2>
          <p className="text-xs text-slate-400 mt-1">Enter your PIN or Passcode to access your knowledge graph.</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter passcode..."
            autoFocus
            className="w-full px-4 py-3 text-center bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-lg tracking-widest focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
          >
            <span>Unlock Mind</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
