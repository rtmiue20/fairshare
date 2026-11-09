import React, { useEffect, useState } from 'react';

type ToastListener = (msg: string) => void;
const listeners = new Set<ToastListener>();

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(message: string) {
  listeners.forEach((fn) => fn(message));
}

// Alias for convenience
// eslint-disable-next-line react-refresh/only-export-components
export const toast = showToast;

export const ToastContainer: React.FC = () => {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleToast: ToastListener = (msg) => {
      setMessage(msg);
      setVisible(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setVisible(false);
      }, 2600);
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className={`toast ${visible ? 'on' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};
