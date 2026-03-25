import React from 'react';

export default function Modal({ isOpen, onClose, title, children, confirmLabel = 'Confirm', onConfirm, isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-bg-base/90 backdrop-blur-2xl border border-border-base rounded-3xl shadow-2xl shadow-black/20 overflow-hidden animate-zoom-in">
        <div className="p-8">
          <h3 className="text-xl font-bold text-text-main mb-3">{title}</h3>
          <div className="text-text-dim text-sm leading-relaxed mb-8">
            {children}
          </div>
          
          <div className="flex gap-3 justify-end font-bold text-sm">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-text-dim hover:text-text-main hover:bg-surface-hover transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-95
                ${isDanger 
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                  : 'bg-accent text-white shadow-accent/20 hover:opacity-90'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
