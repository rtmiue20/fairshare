import React, { useState } from 'react';
import { useNotificationStore, NotificationItem } from '../../store/notificationStore';
import { Check, CheckCheck, Trash2, Bell, MessageSquare, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../ui/Toast';
import './NotificationPopover.css';

export const NotificationPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredList = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleActionPrimary = (e: React.MouseEvent, n: NotificationItem) => {
    e.stopPropagation();
    markAsRead(n.id);
    if (n.actionPrimary?.onClick) {
      n.actionPrimary.onClick();
    } else if (n.actionPrimary?.link) {
      navigate(n.actionPrimary.link);
      onClose();
    } else if (n.targetLink) {
      navigate(n.targetLink);
      onClose();
    } else if (n.type === 'warning' || n.type === 'error') {
      navigate('/alerts');
      onClose();
    } else {
      navigate('/teams');
      onClose();
    }
  };

  const handleActionSecondary = (e: React.MouseEvent, n: NotificationItem) => {
    e.stopPropagation();
    markAsRead(n.id);
    if (n.actionSecondary?.onClick) {
      n.actionSecondary.onClick();
    } else {
      showToast('Đã ẩn thông báo');
    }
  };

  const handleCardClick = (n: NotificationItem) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.targetLink) {
      navigate(n.targetLink);
      onClose();
    }
  };

  const renderBadgeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <Check size={10} strokeWidth={3} />;
      case 'warning':
      case 'error':
        return <AlertTriangle size={10} strokeWidth={3} />;
      case 'info':
      default:
        return <MessageSquare size={10} strokeWidth={2.5} />;
    }
  };

  return (
    <div
      className="notif-popover-container notif-popover"
      id="notifPopover"
      data-testid="notif-popover"
      role="dialog"
      aria-label="Hộp thư thông báo"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="notif-popover-header">
        <div className="notif-title-group">
          <h3>Thông báo</h3>
          {unreadCount > 0 && (
            <span className="notif-unread-pill">{unreadCount} mới</span>
          )}
        </div>

        <div className="notif-actions-group">
          {/* Filter tabs */}
          <div className="notif-filter-pill">
            <button
              type="button"
              className={`notif-tab-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`notif-tab-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Chưa đọc
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-mark-read-all"
              onClick={markAllAsRead}
              title="Đánh dấu tất cả đã đọc"
              aria-label="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="notif-cards-list">
        {filteredList.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon-wrap">
              <Bell size={24} opacity={0.6} />
            </div>
            <p>
              {filter === 'unread'
                ? 'Tuyệt vời! Bạn không còn thông báo nào chưa đọc.'
                : 'Hiện chưa có thông báo nào.'}
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`notif-card ${item.read ? 'is-read' : 'is-unread'}`}
              onClick={() => handleCardClick(item)}
              title={item.read ? 'Nhấp để xem chi tiết' : 'Nhấp để đánh dấu đã đọc'}
            >
              {/* Avatar with Sub-badge */}
              <div
                className="notif-avatar-box"
                style={{ background: item.avatarBg || 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {item.avatarText || item.authorName?.substring(0, 2).toUpperCase() || 'FS'}
                <div className={`notif-badge-overlay notif-badge-overlay--${item.type}`}>
                  {renderBadgeIcon(item.type)}
                </div>
              </div>

              {/* Content Box */}
              <div className="notif-content-box">
                <div className="notif-content-header">
                  <span className="notif-author-name">{item.authorName || 'Hệ thống'}</span>
                  <span className="notif-time-ago">{item.timeAgo}</span>
                </div>

                <div className="notif-card-title">{item.title}</div>
                <p className="notif-card-message">{item.message}</p>

                {/* Action buttons (e.g. [Xem task], [Chấp nhận], [Để sau], [Nhắc nhở]) */}
                {(item.actionPrimary || item.actionSecondary) && (
                  <div className="notif-btn-row">
                    {item.actionSecondary && (
                      <button
                        type="button"
                        className="notif-pill-btn-secondary"
                        onClick={(e) => handleActionSecondary(e, item)}
                      >
                        {item.actionSecondary.label}
                      </button>
                    )}
                    {item.actionPrimary && (
                      <button
                        type="button"
                        className="notif-pill-btn-primary"
                        onClick={(e) => handleActionPrimary(e, item)}
                      >
                        {item.actionPrimary.label}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Status Indicator: Green dot if unread */}
              <div className="notif-status-col">
                {!item.read && <span className="notif-green-dot" title="Chưa đọc" />}
                <button
                  type="button"
                  className="notif-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(item.id);
                  }}
                  title="Xóa thông báo này"
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
