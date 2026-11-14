import React, { useState } from 'react';
import { useNotificationStore, NotificationItem } from '../../store/notificationStore';
import { Check, CheckCheck, Trash2, Bell, MessageSquare, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleActionPrimary = (n: NotificationItem) => {
    markAsRead(n.id);
    if (n.actionPrimary?.onClick) {
      n.actionPrimary.onClick();
    } else if (n.type === 'info') {
      navigate('/peer-review');
      onClose();
    } else if (n.type === 'warning') {
      navigate('/alerts');
      onClose();
    } else {
      navigate('/dashboard');
      onClose();
    }
  };

  const handleActionSecondary = (n: NotificationItem) => {
    markAsRead(n.id);
    if (n.actionSecondary?.onClick) {
      n.actionSecondary.onClick();
    }
  };

  const renderBadgeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <Check size={11} strokeWidth={3} />;
      case 'warning':
      case 'error':
        return <AlertTriangle size={11} strokeWidth={3} />;
      case 'info':
      default:
        return <MessageSquare size={11} strokeWidth={2.5} />;
    }
  };

  return (
    <div
      className="notif-popover"
      role="dialog"
      aria-label="Hộp thư thông báo"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-title">
          <h3>Thông báo</h3>
          {unreadCount > 0 && (
            <span className="notif-unread-pill">{unreadCount} mới</span>
          )}
        </div>

        <div className="notif-header-actions">
          {/* Filter tabs */}
          <div className="notif-filter-tabs">
            <button
              type="button"
              className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Chưa đọc
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-mark-all"
              onClick={markAllAsRead}
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck size={15} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="notif-list">
        {filteredList.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Bell size={28} opacity={0.4} />
            </div>
            <p>Không có thông báo nào {filter === 'unread' ? 'chưa đọc' : ''}.</p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`notif-item ${!item.read ? 'unread' : ''}`}
              onClick={() => markAsRead(item.id)}
            >
              {/* Avatar + Sub-badge */}
              <div className="notif-avatar-wrap">
                <div
                  className="notif-avatar"
                  style={{ background: item.avatarBg || 'var(--accent)' }}
                >
                  {item.avatarText || item.authorName?.substring(0, 2).toUpperCase() || 'FS'}
                </div>
                <div className={`notif-avatar-badge notif-avatar-badge--${item.type}`}>
                  {renderBadgeIcon(item.type)}
                </div>
              </div>

              {/* Body */}
              <div className="notif-item-content">
                <div className="notif-item-top">
                  <span className="notif-author">{item.authorName || 'Hệ thống'}</span>
                  <span className="notif-time">{item.timeAgo}</span>
                </div>

                <div className="notif-item-title">{item.title}</div>
                <p className="notif-item-msg">{item.message}</p>

                {/* Actions (if available, like [Từ chối] [Chấp nhận]) */}
                {(item.actionPrimary || item.actionSecondary) && (
                  <div className="notif-item-actions">
                    {item.actionSecondary && (
                      <button
                        type="button"
                        className="notif-btn notif-btn--secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionSecondary(item);
                        }}
                      >
                        {item.actionSecondary.label}
                      </button>
                    )}
                    {item.actionPrimary && (
                      <button
                        type="button"
                        className="notif-btn notif-btn--primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionPrimary(item);
                        }}
                      >
                        {item.actionPrimary.label}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status indicator: Unread green dot */}
              <div className="notif-item-status">
                {!item.read && <span className="notif-unread-dot" title="Chưa đọc" />}
                <button
                  type="button"
                  className="notif-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(item.id);
                  }}
                  title="Xóa thông báo"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
