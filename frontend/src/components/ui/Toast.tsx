import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, AtSign, AlertTriangle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  duration?: number; // mặc định 4000ms (4 giây)
}

interface ToastInstance extends Required<Omit<ToastOptions, 'buttonLabel' | 'onButtonClick'>> {
  buttonLabel?: string;
  onButtonClick?: () => void;
  createdAt: number;
}

type ToastListener = (toast: ToastInstance) => void;
const listeners = new Set<ToastListener>();

let toastCounter = 0;

/**
 * Hiển thị Toast thông báo:
 * Hỗ trợ truyền chuỗi string hoặc object chi tiết theo mẫu thiết kế
 */
export function showToast(input: string | ToastOptions) {
  toastCounter++;
  const id = `toast-${Date.now()}-${toastCounter}`;

  let options: ToastOptions;
  if (typeof input === 'string') {
    const isError = /lỗi|thất bại|không thể|từ chối|error|sai/i.test(input);
    const isSuccess = /thành công|đã hoàn thành|đã tạo|success|đã gửi/i.test(input);

    const type: ToastType = isError ? 'error' : isSuccess ? 'success' : 'info';
    const title = isError ? 'Error' : isSuccess ? 'Success!' : 'Information';
    const buttonLabel = isError ? 'Try again' : isSuccess ? 'Got It' : 'Super';

    options = {
      id,
      type,
      title,
      message: input,
      buttonLabel,
      duration: 4000,
    };
  } else {
    options = {
      id: input.id || id,
      type: input.type || 'info',
      title: input.title || (input.type === 'error' ? 'Error' : input.type === 'success' ? 'Success!' : 'Information'),
      message: input.message,
      buttonLabel: input.buttonLabel || (input.type === 'error' ? 'Try again' : input.type === 'success' ? 'Got It' : 'Super'),
      onButtonClick: input.onButtonClick,
      duration: input.duration || 4000,
    };
  }

  const instance: ToastInstance = {
    id: options.id!,
    type: options.type!,
    title: options.title!,
    message: options.message,
    buttonLabel: options.buttonLabel,
    onButtonClick: options.onButtonClick,
    duration: options.duration || 4000,
    createdAt: Date.now(),
  };

  listeners.forEach((fn) => fn(instance));
}

// Convenience helpers
showToast.success = (message: string, title = 'Success!', buttonLabel = 'Got It') => {
  showToast({ type: 'success', title, message, buttonLabel });
};

showToast.error = (message: string, title = 'Error', buttonLabel = 'Try again') => {
  showToast({ type: 'error', title, message, buttonLabel });
};

showToast.info = (message: string, title = 'Information', buttonLabel = 'Super') => {
  showToast({ type: 'info', title, message, buttonLabel });
};

export const toast = showToast;

/**
 * ToastItem: hiển thị từng thẻ Toast
 * Chu kỳ 4 giây: 2 giây đầu sáng bình thường (opacity: 1), 2 giây sau mờ dần rồi biến mất
 */
const ToastItem: React.FC<{
  item: ToastInstance;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Sau 2000ms: bắt đầu mờ dần (fade out trong 2000ms tiếp theo)
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, 2000);

    // Sau đúng 4000ms: ẩn và gỡ khỏi DOM
    const removeTimer = window.setTimeout(() => {
      onDismiss(item.id);
    }, 4000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [item.id, onDismiss]);

  const handleAction = () => {
    if (item.onButtonClick) {
      item.onButtonClick();
    }
    onDismiss(item.id);
  };

  // Icon phù hợp theo variant trong ảnh mẫu
  const renderIcon = () => {
    switch (item.type) {
      case 'success':
        return (
          <div className="toast-icon-badge toast-icon-badge--success">
            <Check size={16} strokeWidth={3} />
          </div>
        );
      case 'error':
        return (
          <div className="toast-icon-badge toast-icon-badge--error">
            <AlertCircle size={16} strokeWidth={2.5} />
          </div>
        );
      case 'warning':
        return (
          <div className="toast-icon-badge toast-icon-badge--warning">
            <AlertTriangle size={16} strokeWidth={2.5} />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="toast-icon-badge toast-icon-badge--info">
            <AtSign size={16} strokeWidth={2.5} />
          </div>
        );
    }
  };

  return (
    <div
      className={`fs-toast-pill fs-toast-pill--${item.type} ${fading ? 'fs-toast-fading' : ''}`}
      role="status"
    >
      {/* Icon bên trái */}
      <div className="fs-toast-icon-wrap">{renderIcon()}</div>

      {/* Nội dung ở giữa: Tiêu đề + Thông điệp */}
      <div className="fs-toast-body">
        <h4 className="fs-toast-title">{item.title}</h4>
        <p className="fs-toast-message">{item.message}</p>
      </div>

      {/* Nút hành động dạng Pill bên phải (Super, Try again, Got It, ...) */}
      {item.buttonLabel && (
        <button
          type="button"
          className="fs-toast-btn"
          onClick={handleAction}
        >
          {item.buttonLabel}
        </button>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastInstance[]>([]);

  useEffect(() => {
    const handleNewToast: ToastListener = (item) => {
      // Giữ tối đa 4 toasts trên màn hình cùng lúc để không lấn chiếm component khác
      setToasts((prev) => [item, ...prev].slice(0, 4));
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fs-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};
