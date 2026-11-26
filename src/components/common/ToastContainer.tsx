import React from 'react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;
  const latest = toasts[toasts.length - 1];

  return (
    <div
      id="toast"
      role="status"
      aria-live="polite"
      onClick={() => dismissToast(latest.id)}
      className={`no-print cursor-pointer ${latest.type === 'error' ? 'gagal' : ''}`}
    >
      {latest.text}
    </div>
  );
};
