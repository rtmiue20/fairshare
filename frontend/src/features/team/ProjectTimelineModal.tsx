import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Check, Loader2 } from 'lucide-react';
import { TimelinePicker, startOfDay } from './TimelinePicker';

interface ProjectTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onSave: (start: Date, end: Date) => void | Promise<void>;
}

export const ProjectTimelineModal: React.FC<ProjectTimelineModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onSave,
}) => {
  const [tempStart, setTempStart] = useState<Date>(startOfDay(startDate));
  const [tempEnd, setTempEnd] = useState<Date>(startOfDay(endDate));
  const [saving, setSaving] = useState(false);

  // Đồng bộ lại lựa chọn mỗi lần mở modal
  useEffect(() => {
    if (isOpen) {
      setTempStart(startOfDay(startDate));
      setTempEnd(startOfDay(endDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setSaving(true);
    try {
      await onSave(tempStart, tempEnd);
      onClose();
    } catch {
      // Lưu thất bại: giữ modal mở để người dùng thử lại
    } finally {
      setSaving(false);
    }
  };

  // Portal ra <body> + z-index cao hơn header để không bị che; co giãn theo chiều cao màn hình
  return createPortal(
    <div className="timeline-modal-backdrop" style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className="timeline-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}
      >
        <div className="timeline-modal-header">
          <div className="timeline-modal-title-wrap">
            <span className="timeline-modal-icon">
              <CalendarIcon size={18} />
            </span>
            <div>
              <h3 className="timeline-modal-title">Lịch dự án</h3>
              <p className="timeline-modal-sub">Chọn ngày bắt đầu và kết thúc, lưu vào cơ sở dữ liệu</p>
            </div>
          </div>
          <button type="button" className="timeline-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <TimelinePicker
          start={tempStart}
          end={tempEnd}
          onChange={(s, e) => {
            setTempStart(s);
            setTempEnd(e);
          }}
        />

        <div className="timeline-modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="timeline-save-btn" onClick={handleApply} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>Lưu lịch</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
