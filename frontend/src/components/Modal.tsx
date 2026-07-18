import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string; // tailwind size class, e.g. 'max-w-4xl'
  title?: ReactNode;
}

export default function Modal({ open, onClose, children, maxWidth = 'max-w-4xl', title }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl w-full ${maxWidth} max-h-[92vh] overflow-y-auto shadow-2xl`}>
        {title && (
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="text-lg font-bold text-gray-900">{title}</div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
              aria-label="Close"
            >
              <i className="fa-solid fa-xmark text-lg" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
