/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldAlert, Info, Croissant } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setLoginModalOpen, loginWithGoogle, isLoading } = useStore();

  if (!isLoginModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white w-full max-w-md rounded-[var(--radius-card)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header — Starbucks house green */}
        <div className="feature-band p-6 text-left relative shrink-0" style={{backgroundColor: 'var(--house-green)'}}>
          <button onClick={() => setLoginModalOpen(false)}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-white/15 text-white p-2 rounded-lg">
              <Croissant size={20} />
            </div>
            <div>
              <span className="text-[#cba258] font-bold text-[1rem] tracking-[var(--tracking-looser)] uppercase">Near Bakery & Co.</span>
              <p className="text-white/70 text-[1.1rem]">Artisan Bakery Premium</p>
            </div>
          </div>
          <h3 className="text-[1.8rem] font-bold text-white mt-2 tracking-[var(--tracking-tight)]">Selamat Datang</h3>
          <p className="text-white/70 text-[1.3rem] mt-1 max-w-[90%]">Masuk untuk memesan, chat dengan baker, dan beri ulasan.</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Google Login — Satu-satunya metode masuk */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-4 w-1 bg-[var(--brand-green)] rounded-full" />
              <h4 className="text-[1.1rem] font-bold text-[var(--text-black-soft)] tracking-[var(--tracking-looser)] uppercase">Masuk dengan Google</h4>
            </div>
            <button onClick={loginWithGoogle} disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[var(--canvas-warm)] text-[var(--text-black)] border-2 border-gray-200 py-3 px-4 rounded-[var(--button-radius)] text-[1.4rem] font-semibold transition-colors cursor-pointer shadow-sm">
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.92,-1.77 3.02,-4.38 3.02,-7.38c0,-0.66 -0.06,-1.3 -0.16,-1.98z" fill="#4285F4" />
                  <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.19l-3.3,-2.58c-0.9,0.6 -2.07,0.97 -3.3,0.97c-2.34,0 -4.33,-1.58 -5.03,-3.7H2.9v2.58c1.5,2.98 4.56,4.92 8.1,4.92z" fill="#34A853" />
                  <path d="M6.97,13.12a6.01,6.01 0 0 1 0,-1.82V8.72H2.9a10.02,10.02 0 0 0 0,6.98l4.07,-2.58z" fill="#FBBC05" />
                  <path d="M12,6.38c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.68 14.43,2.9 12,2.9C8.46,2.9 5.4,4.84 3.9,7.82l4.07,2.58c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                </g>
              </svg>
              <span>Masuk dengan Google</span>
            </button>
            <p className="text-[1rem] text-[var(--text-black-soft)] pl-1 leading-snug">
              Menggunakan autentikasi Google Firebase yang aman.
            </p>
          </div>

          {/* Notice — Redirect flow, bukan popup */}
          <div className="bg-[var(--gold-lightest)] border border-[var(--gold-light)]/50 rounded-[var(--radius-card)] p-4 flex items-start gap-3">
            <Info size={16} className="text-[var(--gold)] shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[1.1rem] font-bold text-[var(--text-black)] uppercase">Proses Login Aman</h5>
              <p className="text-[1rem] text-[var(--text-black-soft)] leading-relaxed">
                Anda akan diarahkan ke halaman Google untuk login, lalu kembali otomatis. Pastikan tidak memblokir redirect browser.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--canvas-warm)] px-6 py-4 border-t border-gray-100 text-center shrink-0">
          <span className="text-[0.9rem] text-[var(--text-black-soft)] flex items-center justify-center gap-1.5">
            <Info size={11} /> Data tersimpan aman di Firebase.
          </span>
        </div>
      </div>
    </div>
  );
};
