import React, { useState } from 'react';
import {
  PlusCircle,
  ArrowUpDown,
  Filter,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  Check,
  X,
  ListPlus,
  RotateCcw,
} from 'lucide-react';
import { showToast } from '../../components/ui/Toast';

export interface ColumnItem {
  id: string;
  title: string;
  badgeClass: string;
  iconType?: 'todo' | 'inprogress' | 'inreview' | 'completed' | 'custom';
  isHidden?: boolean;
}

interface CustomToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onAddColumn: (title: string) => void;
  onDeleteColumn: (id: string) => void;
  onToggleHideColumn: (id: string) => void;
  onUnhideAllColumns: () => void;
  onSort: (type: 'dueDate' | 'progress' | 'title' | 'default') => void;
  onFilter: (projectTag: string | null) => void;
  activeSort: string;
  activeFilter: string | null;
  projectTags: string[];
}

type SubView = 'main' | 'add' | 'sort' | 'filter' | 'hide' | 'delete';

export const CustomToolsPopup: React.FC<CustomToolsPopupProps> = ({
  isOpen,
  onClose,
  columns,
  onAddColumn,
  onDeleteColumn,
  onToggleHideColumn,
  onUnhideAllColumns,
  onSort,
  onFilter,
  activeSort,
  activeFilter,
  projectTags,
}) => {
  const [currentView, setCurrentView] = useState<SubView>('main');
  const [newColumnName, setNewColumnName] = useState('');

  if (!isOpen) return null;

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) {
      showToast.error('Vui lòng nhập tên danh sách', 'Add List');
      return;
    }
    onAddColumn(trimmed);
    setNewColumnName('');
    setCurrentView('main');
  };

  const hiddenCount = columns.filter((c) => c.isHidden).length;

  return (
    <>
      {/* Invisible backdrop to catch clicks outside */}
      <div className="custom-popup-backdrop" onClick={onClose} />

      <div className="custom-tools-popup" onClick={(e) => e.stopPropagation()}>
        {/* Main Menu View (Cards Grid inspired by Image 2) */}
        {currentView === 'main' && (
          <div className="popup-main-content">
            <div className="popup-header-row">
              <span className="popup-title">Tùy biến bảng công việc</span>
              <button
                type="button"
                className="popup-close-btn"
                onClick={onClose}
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {/* Grid of Action Cards */}
            <div className="popup-cards-grid">
              {/* 1. Add another list */}
              <button
                type="button"
                className="popup-action-card"
                onClick={() => setCurrentView('add')}
              >
                <div className="popup-card-icon-box bg-blue">
                  <ListPlus size={18} />
                </div>
                <div className="popup-card-text">
                  <span className="card-action-title">Add another list</span>
                  <span className="card-action-desc">Tạo cột mới</span>
                </div>
              </button>

              {/* 2. Sort */}
              <button
                type="button"
                className="popup-action-card"
                onClick={() => setCurrentView('sort')}
              >
                <div className="popup-card-icon-box bg-green">
                  <ArrowUpDown size={18} />
                </div>
                <div className="popup-card-text">
                  <span className="card-action-title">Sort</span>
                  <span className="card-action-desc">
                    {activeSort === 'default' ? 'Mặc định' : activeSort}
                  </span>
                </div>
              </button>

              {/* 3. Filter */}
              <button
                type="button"
                className="popup-action-card"
                onClick={() => setCurrentView('filter')}
              >
                <div className="popup-card-icon-box bg-orange">
                  <Filter size={18} />
                </div>
                <div className="popup-card-text">
                  <span className="card-action-title">Filter</span>
                  <span className="card-action-desc">
                    {activeFilter ? activeFilter : 'Tất cả'}
                  </span>
                </div>
              </button>

              {/* 4. Ẩn list */}
              <button
                type="button"
                className="popup-action-card"
                onClick={() => setCurrentView('hide')}
              >
                <div className="popup-card-icon-box bg-purple">
                  {hiddenCount > 0 ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
                <div className="popup-card-text">
                  <span className="card-action-title">Ẩn 1 list</span>
                  <span className="card-action-desc">
                    {hiddenCount > 0 ? `Đang ẩn (${hiddenCount})` : 'Tất cả đang hiện'}
                  </span>
                </div>
              </button>

              {/* 5. Xóa list */}
              <button
                type="button"
                className="popup-action-card span-full"
                onClick={() => setCurrentView('delete')}
              >
                <div className="popup-card-icon-box bg-rose">
                  <Trash2 size={18} />
                </div>
                <div className="popup-card-text">
                  <span className="card-action-title">Xóa 1 list</span>
                  <span className="card-action-desc">Xóa danh sách khỏi bảng</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: ADD ANOTHER LIST ── */}
        {currentView === 'add' && (
          <div className="popup-sub-content">
            <div className="popup-sub-head">
              <button
                type="button"
                className="popup-back-btn"
                onClick={() => setCurrentView('main')}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <span className="popup-sub-title">Add another list</span>
            </div>

            <form onSubmit={handleCreateColumn} className="popup-add-form">
              <label className="popup-input-label">Tên danh sách mới:</label>
              <input
                type="text"
                className="popup-text-input"
                placeholder="VD: Backlog, QA Testing, Staging..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                autoFocus
              />
              <div className="popup-form-actions">
                <button
                  type="button"
                  className="popup-btn-cancel"
                  onClick={() => setCurrentView('main')}
                >
                  Hủy
                </button>
                <button type="submit" className="popup-btn-submit">
                  <PlusCircle size={15} /> Thêm List
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── SUB-VIEW: SORT ── */}
        {currentView === 'sort' && (
          <div className="popup-sub-content">
            <div className="popup-sub-head">
              <button
                type="button"
                className="popup-back-btn"
                onClick={() => setCurrentView('main')}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <span className="popup-sub-title">Sắp xếp công việc</span>
            </div>

            <div className="popup-options-list">
              <button
                type="button"
                className={`popup-opt-item ${activeSort === 'default' ? 'active' : ''}`}
                onClick={() => {
                  onSort('default');
                  setCurrentView('main');
                }}
              >
                <span>Thứ tự mặc định</span>
                {activeSort === 'default' && <Check size={16} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`popup-opt-item ${activeSort === 'dueDate' ? 'active' : ''}`}
                onClick={() => {
                  onSort('dueDate');
                  setCurrentView('main');
                }}
              >
                <span>Theo hạn chót (Gần nhất)</span>
                {activeSort === 'dueDate' && <Check size={16} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`popup-opt-item ${activeSort === 'progress' ? 'active' : ''}`}
                onClick={() => {
                  onSort('progress');
                  setCurrentView('main');
                }}
              >
                <span>Theo % Tiến độ (Cao ➔ Thấp)</span>
                {activeSort === 'progress' && <Check size={16} className="check-icon" />}
              </button>

              <button
                type="button"
                className={`popup-opt-item ${activeSort === 'title' ? 'active' : ''}`}
                onClick={() => {
                  onSort('title');
                  setCurrentView('main');
                }}
              >
                <span>Theo tên công việc (A ➔ Z)</span>
                {activeSort === 'title' && <Check size={16} className="check-icon" />}
              </button>
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: FILTER ── */}
        {currentView === 'filter' && (
          <div className="popup-sub-content">
            <div className="popup-sub-head">
              <button
                type="button"
                className="popup-back-btn"
                onClick={() => setCurrentView('main')}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <span className="popup-sub-title">Lọc theo thẻ dự án</span>
            </div>

            <div className="popup-options-list">
              <button
                type="button"
                className={`popup-opt-item ${activeFilter === null ? 'active' : ''}`}
                onClick={() => {
                  onFilter(null);
                  setCurrentView('main');
                }}
              >
                <span>Tất cả dự án con</span>
                {activeFilter === null && <Check size={16} className="check-icon" />}
              </button>

              {projectTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`popup-opt-item ${activeFilter === tag ? 'active' : ''}`}
                  onClick={() => {
                    onFilter(tag);
                    setCurrentView('main');
                  }}
                >
                  <span>{tag}</span>
                  {activeFilter === tag && <Check size={16} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SUB-VIEW: HIDE / SHOW LIST ── */}
        {currentView === 'hide' && (
          <div className="popup-sub-content">
            <div className="popup-sub-head">
              <button
                type="button"
                className="popup-back-btn"
                onClick={() => setCurrentView('main')}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <span className="popup-sub-title">Ẩn / Hiện danh sách</span>
            </div>

            <div className="popup-columns-manager-list">
              {columns.map((col) => {
                const isHidden = !!col.isHidden;
                return (
                  <div
                    key={col.id}
                    className={`popup-col-manage-row ${isHidden ? 'is-hidden-row' : ''}`}
                  >
                    <span className="manage-col-name">{col.title}</span>
                    <button
                      type="button"
                      className={`popup-toggle-eye-btn ${isHidden ? 'hidden-state' : 'visible-state'}`}
                      onClick={() => onToggleHideColumn(col.id)}
                      title={isHidden ? 'Bấm để Hiện' : 'Bấm để Ẩn'}
                    >
                      {isHidden ? (
                        <>
                          <EyeOff size={14} /> <span>Đang ẩn</span>
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> <span>Đang hiện</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {hiddenCount > 0 && (
              <button
                type="button"
                className="popup-unhide-all-btn"
                onClick={onUnhideAllColumns}
              >
                <RotateCcw size={14} /> Hiện lại tất cả danh sách
              </button>
            )}
          </div>
        )}

        {/* ── SUB-VIEW: DELETE LIST ── */}
        {currentView === 'delete' && (
          <div className="popup-sub-content">
            <div className="popup-sub-head">
              <button
                type="button"
                className="popup-back-btn"
                onClick={() => setCurrentView('main')}
              >
                <ChevronLeft size={16} /> Quay lại
              </button>
              <span className="popup-sub-title">Xóa 1 danh sách</span>
            </div>

            <div className="popup-columns-manager-list">
              {columns.map((col) => (
                <div key={col.id} className="popup-col-manage-row">
                  <span className="manage-col-name">{col.title}</span>
                  <button
                    type="button"
                    className="popup-delete-action-btn"
                    onClick={() => {
                      if (columns.length <= 1) {
                        showToast.error('Không thể xóa danh sách cuối cùng!', 'Delete List');
                        return;
                      }
                      onDeleteColumn(col.id);
                    }}
                    title={`Xóa danh sách "${col.title}"`}
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
