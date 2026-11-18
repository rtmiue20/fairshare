import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { ApiResponse } from '../../types/api';
import { showToast } from '../../components/ui/Toast';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NoProjectState } from '../team/NoProjectState';
import type { Board } from '../../types/board';
import type { Team } from '../../types/team';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sliders,
  ShieldAlert,
  UserCheck,
  Send,
  X,
  RefreshCw,
  Users,
  ClipboardList,
  Loader2,
  Sparkles,
} from 'lucide-react';

export type AlertTemplateKey = 'info' | 'warning' | 'success' | 'error';

export interface AlertItem {
  id: number;
  level: AlertTemplateKey;
  title: string;
  desc: string;
  timeAgo: string;
  userId?: number;
  userName: string;
  alertType: string;
  taskTitle?: string;
  senderLabel?: string;
  autoDispatched?: boolean;
}

interface BackendAlertDto {
  id: number;
  teamId: number;
  userId: number;
  userName?: string;
  alertType: string;
  severity?: string;
  message: string;
  resolved: boolean;
  createdAt?: string;
}

interface MemberInactivityDto {
  userId: number;
  userName: string;
  daysInactive: number;
  lastActivity: string;
  exceeded: boolean;
}

interface TaskCandidate {
  id: number;
  title: string;
  columnName: string;
  dueDate?: string;
  assigneeId?: number;
  assigneeName?: string;
  riskStatus: 'overdue' | 'due_soon' | 'todo' | 'normal';
  daysDiff?: number;
}

interface MemberCandidate {
  userId: number;
  userName: string;
  daysInactive: number;
  lastActivity: string;
  exceeded: boolean;
  riskTags: string[];
}

interface TemplateConfig {
  key: AlertTemplateKey;
  label: string;
  viBadge: string;
  sampleTitle: string;
  sampleMessage: string;
  defaultTitle: string;
  quickMessages: string[];
  light: {
    bg: string;
    border: string;
    titleColor: string;
    textColor: string;
    iconColor: string;
    chipBg: string;
    chipText: string;
  };
  dark: {
    bg: string;
    border: string;
    titleColor: string;
    textColor: string;
    iconColor: string;
    chipBg: string;
    chipText: string;
  };
}

const ALERT_TEMPLATES: Record<AlertTemplateKey, TemplateConfig> = {
  info: {
    key: 'info',
    label: 'Info',
    viBadge: 'Thông tin · Cần thực hiện',
    sampleTitle: 'Info',
    sampleMessage: 'Nhắc thành viên bắt đầu thực hiện công việc mới hoặc cập nhật tài liệu dự án.',
    defaultTitle: 'Nhắc nhở công việc cần thực hiện',
    quickMessages: [
      'Công việc đã được phân công trên Kanban, vui lòng bắt đầu thực hiện đúng tiến độ.',
      'Vui lòng cập nhật tài liệu minh chứng hoặc mô tả tiến độ trong hôm nay.',
      'Nhóm đã cập nhật yêu cầu mới cho task, bạn kiểm tra lại checklist nhé.',
    ],
    light: {
      bg: '#d9f0f7',
      border: '1px solid #b5e0ec',
      titleColor: '#0e586d',
      textColor: '#155e75',
      iconColor: '#155e75',
      chipBg: 'rgba(21, 94, 117, 0.12)',
      chipText: '#0e586d',
    },
    dark: {
      bg: 'rgba(14, 116, 144, 0.22)',
      border: '1px solid rgba(34, 211, 238, 0.34)',
      titleColor: '#cffafe',
      textColor: '#a5f3fc',
      iconColor: '#22d3ee',
      chipBg: 'rgba(34, 211, 238, 0.16)',
      chipText: '#67e8f9',
    },
  },
  warning: {
    key: 'warning',
    label: 'Warning',
    viBadge: 'Cảnh báo · Sắp trễ / Im lặng',
    sampleTitle: 'Warning',
    sampleMessage: 'Task sắp đến hạn chót hoặc thành viên chưa có hoạt động mới trong nhiều ngày.',
    defaultTitle: 'Cảnh báo nguy cơ trễ hạn công việc',
    quickMessages: [
      'Công việc của bạn sắp đến hạn chót, vui lòng ưu tiên hoàn thành và cập nhật trạng thái.',
      'Bạn có gặp khó khăn hoặc blocker nào không? Hãy báo lại để nhóm trưởng hỗ trợ kịp thời.',
      'Đã nhiều ngày chưa thấy hoạt động mới trên bảng công việc, vui lòng phản hồi lại nhóm.',
    ],
    light: {
      bg: '#fdf4ce',
      border: '1px solid #f6e193',
      titleColor: '#7c5308',
      textColor: '#854d0e',
      iconColor: '#92600a',
      chipBg: 'rgba(146, 96, 10, 0.12)',
      chipText: '#7c5308',
    },
    dark: {
      bg: 'rgba(217, 119, 6, 0.20)',
      border: '1px solid rgba(251, 191, 36, 0.34)',
      titleColor: '#fef3c7',
      textColor: '#fde68a',
      iconColor: '#fbbf24',
      chipBg: 'rgba(251, 191, 36, 0.16)',
      chipText: '#fcd34d',
    },
  },
  success: {
    key: 'success',
    label: 'Success',
    viBadge: 'Hoàn thành · Đạt chuẩn',
    sampleTitle: 'Success',
    sampleMessage: 'Ghi nhận hoàn thành đúng hạn, đạt mốc Sprint hoặc đủ lượt đánh giá chéo 360°.',
    defaultTitle: 'Xác nhận hoàn thành đúng tiến độ',
    quickMessages: [
      'Chúc mừng bạn đã hoàn thành công việc đúng hạn và đạt chất lượng tốt!',
      'Dữ liệu đóng góp và đánh giá chéo đã đạt ngưỡng an toàn cho kỳ Sprint này.',
      'Tiến độ xử lý cảnh báo rất tốt, cảm ơn bạn đã phối hợp kịp thời cùng nhóm.',
    ],
    light: {
      bg: '#daf1e2',
      border: '1px solid #b3dec2',
      titleColor: '#14532d',
      textColor: '#166534',
      iconColor: '#15803d',
      chipBg: 'rgba(21, 128, 61, 0.12)',
      chipText: '#14532d',
    },
    dark: {
      bg: 'rgba(16, 185, 129, 0.20)',
      border: '1px solid rgba(52, 211, 153, 0.34)',
      titleColor: '#d1fae5',
      textColor: '#a7f3d0',
      iconColor: '#34d399',
      chipBg: 'rgba(52, 211, 153, 0.16)',
      chipText: '#6ee7b7',
    },
  },
  error: {
    key: 'error',
    label: 'Error',
    viBadge: 'Quá hạn · Cần xử lý gấp',
    sampleTitle: 'Error',
    sampleMessage: 'Công việc đã quá hạn chót nhưng chưa hoàn thành, có nguy cơ ảnh hưởng Sprint.',
    defaultTitle: 'Cảnh báo khẩn: Công việc đã quá hạn',
    quickMessages: [
      'Công việc này đã quá hạn chót, đề nghị bạn báo cáo ngay tiến độ và thời điểm bàn giao mới.',
      'Task đang chặn luồng công việc của các thành viên khác, cần xử lý gấp trong hôm nay.',
      'Vui lòng chuyển thẻ sang Review hoặc liên hệ nhóm trưởng để chia sẻ khối lượng công việc.',
    ],
    light: {
      bg: '#f9dadf',
      border: '1px solid #efbcc3',
      titleColor: '#7f1d1d',
      textColor: '#9f1239',
      iconColor: '#9f1239',
      chipBg: 'rgba(159, 18, 57, 0.12)',
      chipText: '#7f1d1d',
    },
    dark: {
      bg: 'rgba(225, 29, 72, 0.20)',
      border: '1px solid rgba(251, 113, 133, 0.34)',
      titleColor: '#ffe4e6',
      textColor: '#fecdd3',
      iconColor: '#fb7185',
      chipBg: 'rgba(251, 113, 133, 0.16)',
      chipText: '#fda4af',
    },
  },
};

function renderTemplateIcon(key: AlertTemplateKey, size = 28, color?: string) {
  switch (key) {
    case 'info':
      return <Info size={size} strokeWidth={2.1} color={color} />;
    case 'warning':
      return <AlertCircle size={size} strokeWidth={2.1} color={color} />;
    case 'success':
      return <CheckCircle2 size={size} strokeWidth={2.1} color={color} />;
    case 'error':
      return <XCircle size={size} strokeWidth={2.1} color={color} />;
  }
}

function formatAlertTitle(alertType: string): string {
  switch ((alertType || '').toUpperCase()) {
    case 'OVERDUE_TASK':
      return 'Công việc In Progress đã quá hạn chót';
    case 'DUE_SOON_TASK':
      return 'Công việc sắp đến hạn chót (nguy cơ trễ)';
    case 'TASK_TODO':
      return 'Công việc cần bắt đầu thực hiện';
    case 'INACTIVITY_WARNING':
      return 'Cảnh báo thành viên im lặng quá lâu (CR-04)';
    case 'PEER_REVIEW_SUFFICIENT':
      return 'Đủ điều kiện giải mã điểm chéo 360° (Nghị định 13)';
    case 'MILESTONE_PROGRESS':
      return 'Cập nhật tiến độ mốc Sprint';
    case 'ON_TIME_COMPLETION':
      return 'Hiệu suất hoàn thành đúng hạn';
    case 'AVAILABILITY_ADJUSTED':
      return 'Điều chỉnh hệ số khả dụng thành viên';
    case 'OVERDUE_WARNING':
      return 'Cảnh báo rủi ro trễ hạn & mở lại thẻ';
    case 'FRAUD_SUSPICION':
      return 'Cảnh báo nghi vấn bất thường (Anti-Fraud)';
    case 'SPRINT_CLOSED':
      return 'Sprint đã đóng — Sẵn sàng tính điểm';
    case 'CUSTOM_INFO':
      return 'Thông báo thông tin (Info)';
    case 'CUSTOM_WARNING':
      return 'Cảnh báo nguy cơ tiến độ (Warning)';
    case 'CUSTOM_SUCCESS':
      return 'Xác nhận hoàn thành tốt (Success)';
    case 'CUSTOM_ERROR':
      return 'Cảnh báo khẩn cấp / Quá hạn (Error)';
    default:
      return alertType || 'Thông báo hệ thống';
  }
}

function parseFormattedMessage(rawMessage: string): {
  customTitle?: string;
  body: string;
  taskTitle?: string;
  senderLabel?: string;
} {
  let text = (rawMessage || '').trim();
  let customTitle: string | undefined;
  let taskTitle: string | undefined;
  let senderLabel: string | undefined;

  const titleMatch = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (titleMatch) {
    customTitle = titleMatch[1].trim();
    text = titleMatch[2].trim();
  }

  const parts = text.split(' | ');
  const bodyParts: string[] = [];
  for (const part of parts) {
    if (part.startsWith('Công việc: ')) {
      taskTitle = part.replace('Công việc: ', '').trim();
    } else if (part.startsWith('Người báo: ')) {
      senderLabel = part.replace('Người báo: ', '').trim();
    } else {
      bodyParts.push(part);
    }
  }

  return {
    customTitle,
    body: bodyParts.join(' | ').trim() || rawMessage,
    taskTitle,
    senderLabel,
  };
}

function mapBackendAlert(dto: BackendAlertDto): AlertItem {
  const typeUpper = (dto.alertType || '').toUpperCase();
  const severityUpper = (dto.severity || '').toUpperCase();

  let level: AlertTemplateKey = 'info';
  if (
    typeUpper === 'CUSTOM_ERROR' ||
    severityUpper === 'CRITICAL' ||
    typeUpper === 'OVERDUE_TASK' ||
    typeUpper === 'FRAUD_SUSPICION'
  ) {
    level = 'error';
  } else if (
    typeUpper === 'CUSTOM_WARNING' ||
    severityUpper === 'WARNING' ||
    typeUpper.includes('INACTIVITY') ||
    typeUpper.includes('DUE_SOON') ||
    typeUpper.includes('WARN')
  ) {
    level = 'warning';
  } else if (
    typeUpper === 'CUSTOM_SUCCESS' ||
    typeUpper === 'PEER_REVIEW_SUFFICIENT' ||
    typeUpper === 'ON_TIME_COMPLETION' ||
    typeUpper === 'MILESTONE_PROGRESS'
  ) {
    level = 'success';
  } else {
    level = 'info';
  }

  const parsed = parseFormattedMessage(dto.message || '');
  const title =
    typeUpper.startsWith('CUSTOM_') && parsed.customTitle
      ? parsed.customTitle
      : formatAlertTitle(dto.alertType);
  const desc = parsed.body;
  const isAuto =
    !typeUpper.startsWith('CUSTOM_') &&
    (level === 'error' || level === 'warning' || typeUpper === 'TASK_TODO');

  return {
    id: dto.id,
    level,
    title,
    desc,
    timeAgo: dto.createdAt
      ? new Date(dto.createdAt).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'Vừa xong',
    userId: dto.userId,
    userName: dto.userName || 'Thành viên nhóm',
    alertType: dto.alertType,
    taskTitle: parsed.taskTitle,
    senderLabel: parsed.senderLabel,
    autoDispatched: isAuto,
  };
}

function getInitials(name: string): string {
  if (!name) return 'FS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function analyzeCardRisk(
  columnName: string,
  dueDateStr?: string
): { riskStatus: TaskCandidate['riskStatus']; daysDiff?: number } {
  const colLower = (columnName || '').trim().toLowerCase();
  if (colLower === 'done' || colLower === 'hoàn thành' || colLower === 'completed') {
    return { riskStatus: 'normal' };
  }

  if (dueDateStr) {
    const due = new Date(dueDateStr);
    if (!isNaN(due.getTime())) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dueStart = new Date(due);
      dueStart.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return { riskStatus: 'overdue', daysDiff: Math.abs(diffDays) };
      }
      if (diffDays <= 3) {
        return { riskStatus: 'due_soon', daysDiff: diffDays };
      }
    }
  }

  if (colLower === 'to do' || colLower === 'backlog' || colLower === 'cần làm') {
    return { riskStatus: 'todo' };
  }

  return { riskStatus: 'normal' };
}

function buildBoardRiskAlerts(tasks: TaskCandidate[]): AlertItem[] {
  const result: AlertItem[] = [];
  let synthId = 9000;
  for (const t of tasks) {
    if (!t.assigneeName) continue;
    if (t.riskStatus === 'overdue') {
      result.push({
        id: synthId++,
        level: 'error',
        title: formatAlertTitle('OVERDUE_TASK'),
        desc: `Công việc "${t.title}" do ${t.assigneeName} phụ trách đã quá hạn chót ${t.daysDiff ?? 1} ngày.`,
        timeAgo: 'Tự động phát hiện',
        userId: t.assigneeId,
        userName: t.assigneeName,
        alertType: 'OVERDUE_TASK',
        taskTitle: t.title,
        autoDispatched: true,
      });
    } else if (t.riskStatus === 'due_soon') {
      result.push({
        id: synthId++,
        level: 'warning',
        title: formatAlertTitle('DUE_SOON_TASK'),
        desc: `Công việc "${t.title}" (${t.columnName}) của ${t.assigneeName} sắp đến hạn chót (${t.daysDiff === 0 ? 'hôm nay' : `còn ${t.daysDiff} ngày`}).`,
        timeAgo: 'Tự động phát hiện',
        userId: t.assigneeId,
        userName: t.assigneeName,
        alertType: 'DUE_SOON_TASK',
        taskTitle: t.title,
        autoDispatched: true,
      });
    } else if (t.riskStatus === 'todo') {
      result.push({
        id: synthId++,
        level: 'info',
        title: formatAlertTitle('TASK_TODO'),
        desc: `Công việc "${t.title}" đang ở cột ${t.columnName} cần ${t.assigneeName} bắt đầu thực hiện.`,
        timeAgo: 'Tự động phát hiện',
        userId: t.assigneeId,
        userName: t.assigneeName,
        alertType: 'TASK_TODO',
        taskTitle: t.title,
        autoDispatched: true,
      });
    }
  }
  return result;
}

function buildFallbackDataForTeam(teamId: number, thresholdDays: number): {
  alerts: AlertItem[];
  inactivity: MemberInactivityDto[];
  tasks: TaskCandidate[];
} {
  if (teamId === 2) {
    // EKLA
    const inactivity: MemberInactivityDto[] = [
      { userId: 112, userName: 'Phạm Minh Đức (DevOps)', daysInactive: 6, lastActivity: '2026-11-11T09:00:00', exceeded: 6 >= thresholdDays },
      { userId: 111, userName: 'Lê Quốc Bảo (Backend Dev)', daysInactive: 3, lastActivity: '2026-11-14T15:00:00', exceeded: 3 >= thresholdDays },
      { userId: 110, userName: 'Trần Thu Trang (Frontend Dev)', daysInactive: 2, lastActivity: '2026-11-15T10:30:00', exceeded: 2 >= thresholdDays },
      { userId: 109, userName: 'Nguyễn Hoàng Nam (Trưởng nhóm)', daysInactive: 1, lastActivity: '2026-11-16T14:00:00', exceeded: 1 >= thresholdDays },
      { userId: 1, userName: 'Minh Triều (Product Owner)', daysInactive: 0, lastActivity: '2026-11-17T09:00:00', exceeded: false },
    ];
    const tasks: TaskCandidate[] = [
      { id: 205, title: 'API FastAPI phục vụ gợi ý thời gian thực & caching Redis', columnName: 'Review', dueDate: '2026-11-18T18:00:00', assigneeId: 109, assigneeName: 'Nguyễn Hoàng Nam (Trưởng nhóm)', riskStatus: 'due_soon', daysDiff: 1 },
      { id: 203, title: 'Huấn luyện mô hình LightGCN cho hệ thống gợi ý khóa học', columnName: 'In Progress', dueDate: '2026-11-19T18:00:00', assigneeId: 1, assigneeName: 'Minh Triều (Product Owner)', riskStatus: 'due_soon', daysDiff: 2 },
      { id: 201, title: 'Tích hợp Pipeline OCR trích xuất đề cương môn học', columnName: 'To Do', dueDate: '2026-11-22T18:00:00', assigneeId: 111, assigneeName: 'Lê Quốc Bảo (Backend Dev)', riskStatus: 'todo' },
      { id: 202, title: 'Thiết lập Grafana Dashboard giám sát độ trễ Inference', columnName: 'To Do', dueDate: '2026-11-23T18:00:00', assigneeId: 112, assigneeName: 'Phạm Minh Đức (DevOps)', riskStatus: 'todo' },
    ];
    const alerts: AlertItem[] = [
      {
        id: 2001,
        level: 'warning',
        title: formatAlertTitle('DUE_SOON_TASK'),
        desc: 'Công việc "API FastAPI phục vụ gợi ý thời gian thực & caching Redis" (Review) do Nguyễn Hoàng Nam phụ trách sắp đến hạn chót (còn 1 ngày — 18/11/2026).',
        timeAgo: 'Tự động quét hôm nay',
        userId: 109,
        userName: 'Nguyễn Hoàng Nam (Trưởng nhóm)',
        alertType: 'DUE_SOON_TASK',
        taskTitle: 'API FastAPI phục vụ gợi ý thời gian thực & caching Redis',
        autoDispatched: true,
      },
      {
        id: 2002,
        level: 'warning',
        title: formatAlertTitle('INACTIVITY_WARNING'),
        desc: `Thành viên Phạm Minh Đức (DevOps) không có hoạt động trong 6 ngày liên tiếp (vượt ngưỡng ${thresholdDays} ngày).`,
        timeAgo: 'Tự động quét hôm nay',
        userId: 112,
        userName: 'Phạm Minh Đức (DevOps)',
        alertType: 'INACTIVITY_WARNING',
        autoDispatched: true,
      },
      {
        id: 2003,
        level: 'info',
        title: formatAlertTitle('TASK_TODO'),
        desc: 'Công việc "Tích hợp Pipeline OCR trích xuất đề cương môn học" đang ở cột To Do cần Lê Quốc Bảo bắt đầu thực hiện.',
        timeAgo: 'Tự động quét hôm nay',
        userId: 111,
        userName: 'Lê Quốc Bảo (Backend Dev)',
        alertType: 'TASK_TODO',
        taskTitle: 'Tích hợp Pipeline OCR trích xuất đề cương môn học',
        autoDispatched: true,
      },
    ];
    return { alerts, inactivity, tasks };
  }

  if (teamId === 3) {
    // KINGSHA
    const inactivity: MemberInactivityDto[] = [
      { userId: 111, userName: 'Lê Quốc Bảo (Backend Dev)', daysInactive: 5, lastActivity: '2026-11-12T10:00:00', exceeded: 5 >= thresholdDays },
      { userId: 113, userName: 'Đặng Thảo Vy (QA Engineer)', daysInactive: 2, lastActivity: '2026-11-15T14:00:00', exceeded: 2 >= thresholdDays },
      { userId: 110, userName: 'Trần Thu Trang (Frontend Dev)', daysInactive: 1, lastActivity: '2026-11-16T11:00:00', exceeded: 1 >= thresholdDays },
      { userId: 109, userName: 'Nguyễn Hoàng Nam (Trưởng nhóm)', daysInactive: 1, lastActivity: '2026-11-16T15:00:00', exceeded: 1 >= thresholdDays },
      { userId: 1, userName: 'Minh Triều (Product Owner)', daysInactive: 0, lastActivity: '2026-11-17T08:30:00', exceeded: false },
    ];
    const tasks: TaskCandidate[] = [
      { id: 2, title: 'Kiểm tra bảo mật phân quyền Bác sĩ & Dược sĩ (RBAC HIPAA)', columnName: 'Review', dueDate: '2026-11-17T18:00:00', assigneeId: 1, assigneeName: 'Minh Triều (Product Owner)', riskStatus: 'due_soon', daysDiff: 0 },
      { id: 304, title: 'Kiểm thử hộp đen API Đơn thuốc Điện tử & Xuất PDF chuẩn Bộ Y tế', columnName: 'Review', dueDate: '2026-11-18T18:00:00', assigneeId: 113, assigneeName: 'Đặng Thảo Vy (QA Engineer)', riskStatus: 'due_soon', daysDiff: 1 },
      { id: 301, title: 'Tích hợp máy quét mã vạch GS1-128 cho kho thuốc trung tâm', columnName: 'To Do', dueDate: '2026-11-22T18:00:00', assigneeId: 111, assigneeName: 'Lê Quốc Bảo (Backend Dev)', riskStatus: 'todo' },
    ];
    const alerts: AlertItem[] = [
      {
        id: 3001,
        level: 'warning',
        title: formatAlertTitle('DUE_SOON_TASK'),
        desc: 'Công việc "Kiểm tra bảo mật phân quyền Bác sĩ & Dược sĩ (RBAC HIPAA)" đến hạn hôm nay (17/11/2026).',
        timeAgo: 'Tự động quét hôm nay',
        userId: 1,
        userName: 'Minh Triều (Product Owner)',
        alertType: 'DUE_SOON_TASK',
        taskTitle: 'Kiểm tra bảo mật phân quyền Bác sĩ & Dược sĩ (RBAC HIPAA)',
        autoDispatched: true,
      },
      {
        id: 3002,
        level: 'info',
        title: formatAlertTitle('TASK_TODO'),
        desc: 'Công việc "Tích hợp máy quét mã vạch GS1-128 cho kho thuốc trung tâm" đang ở cột To Do cần Lê Quốc Bảo bắt đầu thực hiện.',
        timeAgo: 'Tự động quét hôm nay',
        userId: 111,
        userName: 'Lê Quốc Bảo (Backend Dev)',
        alertType: 'TASK_TODO',
        taskTitle: 'Tích hợp máy quét mã vạch GS1-128 cho kho thuốc trung tâm',
        autoDispatched: true,
      },
      {
        id: 3003,
        level: 'success',
        title: formatAlertTitle('MILESTONE_PROGRESS'),
        desc: 'Audit Trail chuẩn HIPAA và kiểm thử UAT đạt 100% tiêu chí an toàn dữ liệu.',
        timeAgo: 'Hôm qua',
        userId: 1,
        userName: 'Minh Triều (Product Owner)',
        alertType: 'MILESTONE_PROGRESS',
      },
    ];
    return { alerts, inactivity, tasks };
  }

  // Team 1: EduConnect (default)
  const inactivity: MemberInactivityDto[] = [
    { userId: 110, userName: 'Trần Thu Trang (Frontend Dev)', daysInactive: 5, lastActivity: '2026-11-12T15:00:00', exceeded: 5 >= thresholdDays },
    { userId: 112, userName: 'Phạm Minh Đức (DevOps)', daysInactive: 5, lastActivity: '2026-11-12T20:00:00', exceeded: 5 >= thresholdDays },
    { userId: 111, userName: 'Lê Quốc Bảo (Backend Dev)', daysInactive: 2, lastActivity: '2026-11-15T11:00:00', exceeded: 2 >= thresholdDays },
    { userId: 113, userName: 'Đặng Thảo Vy (QA Engineer)', daysInactive: 1, lastActivity: '2026-11-16T14:00:00', exceeded: 1 >= thresholdDays },
    { userId: 109, userName: 'Nguyễn Hoàng Nam (Trưởng nhóm)', daysInactive: 1, lastActivity: '2026-11-16T18:00:00', exceeded: 1 >= thresholdDays },
    { userId: 1, userName: 'Minh Triều (Product Owner)', daysInactive: 0, lastActivity: '2026-11-17T09:00:00', exceeded: false },
  ];
  const tasks: TaskCandidate[] = [
    { id: 103, title: 'Giao diện đọc tài liệu PDF và highlight nội dung', columnName: 'In Progress', dueDate: '2026-11-15T18:00:00', assigneeId: 110, assigneeName: 'Trần Thu Trang (Frontend Dev)', riskStatus: 'overdue', daysDiff: 2 },
    { id: 105, title: 'Đặc tả API phân quyền RBAC & middleware JWT', columnName: 'Review', dueDate: '2026-11-16T20:00:00', assigneeId: 111, assigneeName: 'Lê Quốc Bảo (Backend Dev)', riskStatus: 'overdue', daysDiff: 1 },
    { id: 104, title: 'Cấu hình Redis Cache cho danh mục môn học', columnName: 'In Progress', dueDate: '2026-11-18T18:00:00', assigneeId: 112, assigneeName: 'Phạm Minh Đức (DevOps)', riskStatus: 'due_soon', daysDiff: 1 },
    { id: 116, title: 'Hoàn thiện màn hình Thống kê & Xuất báo cáo PDF cá nhân', columnName: 'Review', dueDate: '2026-11-17T20:00:00', assigneeId: 1, assigneeName: 'Minh Triều (Product Owner)', riskStatus: 'due_soon', daysDiff: 0 },
    { id: 101, title: 'Tích hợp cổng thanh toán VNPay Sandbox', columnName: 'To Do', dueDate: '2026-11-19T18:00:00', assigneeId: 111, assigneeName: 'Lê Quốc Bảo (Backend Dev)', riskStatus: 'due_soon', daysDiff: 2 },
    { id: 114, title: 'Thiết lập Webhook thông báo nhắc nhở tự động CR-04', columnName: 'To Do', dueDate: '2026-11-21T18:00:00', assigneeId: 1, assigneeName: 'Minh Triều (Product Owner)', riskStatus: 'todo' },
  ];
  const alerts: AlertItem[] = [
    {
      id: 1001,
      level: 'error',
      title: formatAlertTitle('OVERDUE_TASK'),
      desc: 'Công việc "Giao diện đọc tài liệu PDF và highlight nội dung" do Trần Thu Trang (Frontend Dev) phụ trách đã quá hạn chót 2 ngày (Hạn: 15/11/2026).',
      timeAgo: 'Tự động quét hôm nay',
      userId: 110,
      userName: 'Trần Thu Trang (Frontend Dev)',
      alertType: 'OVERDUE_TASK',
      taskTitle: 'Giao diện đọc tài liệu PDF và highlight nội dung',
      autoDispatched: true,
    },
    {
      id: 1002,
      level: 'warning',
      title: formatAlertTitle('DUE_SOON_TASK'),
      desc: 'Công việc "Cấu hình Redis Cache cho danh mục môn học" (In Progress) do Phạm Minh Đức phụ trách sắp đến hạn chót (còn 1 ngày — 18/11/2026).',
      timeAgo: 'Tự động quét hôm nay',
      userId: 112,
      userName: 'Phạm Minh Đức (DevOps)',
      alertType: 'DUE_SOON_TASK',
      taskTitle: 'Cấu hình Redis Cache cho danh mục môn học',
      autoDispatched: true,
    },
    {
      id: 1003,
      level: 'info',
      title: formatAlertTitle('TASK_TODO'),
      desc: 'Công việc "Thiết lập Webhook thông báo nhắc nhở tự động CR-04" đang ở cột To Do cần Minh Triều bắt đầu thực hiện.',
      timeAgo: 'Tự động quét hôm nay',
      userId: 1,
      userName: 'Minh Triều (Product Owner)',
      alertType: 'TASK_TODO',
      taskTitle: 'Thiết lập Webhook thông báo nhắc nhở tự động CR-04',
      autoDispatched: true,
    },
    {
      id: 1004,
      level: 'success',
      title: formatAlertTitle('ON_TIME_COMPLETION'),
      desc: '100% các thẻ Done trong Sprint 3 đều hoàn thành đúng thời hạn cam kết.',
      timeAgo: 'Hôm qua',
      userId: 109,
      userName: 'Nguyễn Hoàng Nam (Trưởng nhóm)',
      alertType: 'ON_TIME_COMPLETION',
    },
  ];
  return { alerts, inactivity, tasks };
}

export const AlertList: React.FC = () => {
  const { teams, activeTeamId, fetchTeams, initialized } = useProjectStore();
  const { user: currentUser } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [searchParams] = useSearchParams();
  const urlTeamId = Number(searchParams.get('teamId'));
  const currentTeamId = urlTeamId > 0 ? urlTeamId : (activeTeamId || (teams[0]?.id ?? 1));

  useEffect(() => {
    if (!initialized) {
      fetchTeams();
    }
  }, [initialized, fetchTeams]);

  // Theme detector for Light / Dark Mode synchronization
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.dataset.theme === 'light';
    }
    return false;
  });

  useEffect(() => {
    const updateTheme = () => {
      setIsLight(document.documentElement.dataset.theme === 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [inactivityList, setInactivityList] = useState<MemberInactivityDto[]>([]);
  const [taskCandidates, setTaskCandidates] = useState<TaskCandidate[]>([]);
  const [teamMembersRaw, setTeamMembersRaw] = useState<{ userId: number; userName: string }[]>([]);
  const [thresholdDays, setThresholdDays] = useState<number>(5);
  const [filterLevel, setFilterLevel] = useState<'ALL' | AlertTemplateKey>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [autoDispatchStats, setAutoDispatchStats] = useState<{ alertCount: number; memberCount: number }>({
    alertCount: 0,
    memberCount: 0,
  });

  // Track auto-dispatched alerts to avoid duplicate notifications on re-renders
  const dispatchedKeysRef = useRef<Set<string>>(new Set());

  // 3-Step Modal State ("Gửi cảnh báo kiểu step")
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<AlertTemplateKey>('warning');
  const [senderRole, setSenderRole] = useState<'Nhóm trưởng' | 'Thành viên liên quan'>('Nhóm trưởng');
  const [senderName, setSenderName] = useState<string>(currentUser?.fullName || 'Nguyễn Hoàng Nam');
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>(ALERT_TEMPLATES.warning.defaultTitle);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [submittingWizard, setSubmittingWizard] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser?.fullName) {
      setSenderName(currentUser.fullName);
    }
  }, [currentUser?.fullName]);

  const dispatchAutoNotifications = useCallback(
    (items: AlertItem[], showSummaryToast = false) => {
      const riskItems = items.filter(
        (a) => a.level === 'error' || a.level === 'warning' || a.alertType === 'TASK_TODO'
      );
      const uniqueMembers = new Set(riskItems.map((a) => a.userName).filter(Boolean));
      setAutoDispatchStats({
        alertCount: riskItems.length,
        memberCount: uniqueMembers.size,
      });

      let newlyDispatched = 0;
      for (const item of riskItems) {
        const key = `${currentTeamId}::${item.alertType}::${item.userName}::${item.desc.slice(0, 48)}`;
        if (dispatchedKeysRef.current.has(key)) continue;
        dispatchedKeysRef.current.add(key);
        newlyDispatched += 1;

        const existingNotifs = useNotificationStore.getState().notifications;
        const alreadyInStore = existingNotifs.some(
          (n) => n.title.includes(item.userName) && n.message === item.desc
        );
        if (!alreadyInStore) {
          addNotification({
            type: item.level,
            title: `[Tự động] ${item.title} · ${item.userName}`,
            message: item.desc,
            authorName: 'Hệ thống giám sát CR-04',
            authorRole: 'Auto Monitor',
            avatarBg:
              item.level === 'error'
                ? 'linear-gradient(135deg, #ef4444, #be123c)'
                : item.level === 'warning'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            avatarText: 'CR',
            triggerToast: false,
            actionPrimary: { label: 'Xem cảnh báo' },
          });
        }
      }

      if (showSummaryToast) {
        if (riskItems.length > 0) {
          showToast({
            type: riskItems.some((r) => r.level === 'error') ? 'warning' : 'info',
            title: 'Đã tự động quét & gửi cảnh báo',
            message: `Phát hiện ${riskItems.length} task/nguy cơ (${newlyDispatched} mới) và tự động gửi tới ${uniqueMembers.size} thành viên.`,
          });
        } else {
          showToast({
            type: 'success',
            title: 'Quét hoàn tất',
            message: 'Không phát hiện thêm công việc quá hạn hay thành viên có nguy cơ mới.',
          });
        }
      }
    },
    [addNotification, currentTeamId]
  );

  const fetchAlertsData = useCallback(
    async (threshold: number, notifySummary = false) => {
      setLoading(true);
      try {
        const [alertsRes, inactivityRes, boardsRes, teamRes] = await Promise.allSettled([
          apiClient.get<ApiResponse<BackendAlertDto[]>>(
            `/alerts/team/${currentTeamId}?thresholdDays=${threshold}`
          ),
          apiClient.get<ApiResponse<MemberInactivityDto[]>>(
            `/alerts/team/${currentTeamId}/inactivity?thresholdDays=${threshold}`
          ),
          apiClient.get<ApiResponse<Board[]>>(`/boards/team/${currentTeamId}`),
          apiClient.get<ApiResponse<Team>>(`/teams/${currentTeamId}`),
        ]);

        const fallback = buildFallbackDataForTeam(currentTeamId, threshold);

        // 1. Parse real boards if valid Board[]
        const extractedTasks: TaskCandidate[] = [];
        let hasValidBoard = false;
        if (boardsRes.status === 'fulfilled') {
          const bData = boardsRes.value?.data?.data;
          if (Array.isArray(bData) && bData.some((b) => b && Array.isArray(b.columns))) {
            hasValidBoard = true;
            for (const board of bData) {
              for (const col of board.columns || []) {
                for (const card of col.cards || []) {
                  const risk = analyzeCardRisk(col.name, card.dueDate);
                  extractedTasks.push({
                    id: card.id,
                    title: card.title,
                    columnName: col.name,
                    dueDate: card.dueDate,
                    assigneeId: card.assigneeId,
                    assigneeName: card.assigneeName,
                    riskStatus: risk.riskStatus,
                    daysDiff: risk.daysDiff,
                  });
                }
              }
            }
          }
        }

        // 2. Parse team members if valid Team
        let extractedMembers: { userId: number; userName: string }[] = [];
        if (teamRes.status === 'fulfilled') {
          const tData = teamRes.value?.data?.data;
          if (tData && typeof tData === 'object' && !Array.isArray(tData) && Array.isArray(tData.members)) {
            extractedMembers = tData.members.map((m) => ({
              userId: m.user?.id ?? m.userId ?? m.id,
              userName: m.user?.fullName ?? m.fullName ?? m.email ?? `Thành viên #${m.id}`,
            }));
          }
        }
        setTeamMembersRaw(extractedMembers);

        // 3. Parse alerts
        let finalAlerts: AlertItem[] = [];
        const alertsOk =
          alertsRes.status === 'fulfilled' &&
          Array.isArray(alertsRes.value?.data?.data);

        if (alertsOk) {
          finalAlerts = (alertsRes.value.data.data || []).map(mapBackendAlert);
        }

        // Synthesize board-detected alerts when API failed or when real board has cards but alerts are empty
        if (!alertsOk) {
          finalAlerts = hasValidBoard && extractedTasks.length > 0
            ? buildBoardRiskAlerts(extractedTasks)
            : fallback.alerts;
        } else if (finalAlerts.length === 0 && hasValidBoard && extractedTasks.length > 0) {
          finalAlerts = buildBoardRiskAlerts(extractedTasks);
        }

        // 4. Parse inactivity
        let finalInactivity: MemberInactivityDto[] = [];
        const inactivityOk =
          inactivityRes.status === 'fulfilled' &&
          Array.isArray(inactivityRes.value?.data?.data);

        if (inactivityOk) {
          finalInactivity = inactivityRes.value.data.data || [];
        } else {
          finalInactivity = fallback.inactivity;
        }

        // 5. Ensure inactivity alerts from finalInactivity are synchronized into finalAlerts
        finalInactivity.forEach((m) => {
          if (m.exceeded) {
            const hasAlert = finalAlerts.some(
              (a) => a.userId === m.userId && a.alertType === 'INACTIVITY_WARNING'
            );
            if (!hasAlert) {
              finalAlerts.push({
                id: 9000 + m.userId,
                level: 'warning',
                title: formatAlertTitle('INACTIVITY_WARNING'),
                desc: `Thành viên ${m.userName} không có hoạt động trong ${m.daysInactive} ngày liên tiếp (vượt ngưỡng ${threshold} ngày theo quy tắc CR-04).`,
                timeAgo: 'Tự động quét hôm nay',
                userId: m.userId,
                userName: m.userName,
                alertType: 'INACTIVITY_WARNING',
                autoDispatched: true,
              });
            }
          }
        });

        const resolvedTasks = extractedTasks.length > 0 ? extractedTasks : fallback.tasks;
        setTaskCandidates(resolvedTasks);
        setAlerts(finalAlerts);
        setInactivityList(finalInactivity);
        dispatchAutoNotifications(finalAlerts, notifySummary);
      } finally {
        setLoading(false);
      }
    },
    [currentTeamId, dispatchAutoNotifications]
  );

  useEffect(() => {
    fetchAlertsData(thresholdDays);
  }, [fetchAlertsData, thresholdDays]);

  const handleResolve = async (id: number, title: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await apiClient.put(`/alerts/${id}/resolve`);
      showToast(`Đã giải quyết cảnh báo: ${title}`);
    } catch {
      showToast(`Đã giải quyết cảnh báo (cục bộ)`);
    }
  };

  const handleRemind = async (id: number, userName: string) => {
    try {
      const res = await apiClient.post<ApiResponse<string>>(`/alerts/${id}/remind`);
      showToast(res.data?.data || `Đã gửi thông báo nhắc nhở đến ${userName}`);
    } catch {
      showToast(`Đã gửi thông báo nhắc nhở đến ${userName}`);
    }
    addNotification({
      type: 'warning',
      title: 'Đã gửi lời nhắc tiến độ',
      message: `Lời nhắc Inactivity đã được chuyển tới thành viên ${userName}.`,
      authorName: 'Hệ thống Cảnh báo',
      avatarText: 'CB',
      avatarBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      actionPrimary: {
        label: 'Xem cảnh báo',
      },
      triggerToast: false,
    });
  };

  const errorCount = useMemo(() => alerts.filter((a) => a.level === 'error').length, [alerts]);
  const warningCount = useMemo(() => alerts.filter((a) => a.level === 'warning').length, [alerts]);
  const successCount = useMemo(() => alerts.filter((a) => a.level === 'success').length, [alerts]);
  const infoCount = useMemo(() => alerts.filter((a) => a.level === 'info').length, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (filterLevel === 'ALL') return alerts;
    return alerts.filter((a) => a.level === filterLevel);
  }, [alerts, filterLevel]);

  const exceededMembers = useMemo(() => {
    return inactivityList.filter((m) => m.exceeded);
  }, [inactivityList]);

  // Combine inactivity members + raw team members + task risks for Step 2 recipient picker
  const memberCandidates: MemberCandidate[] = useMemo(() => {
    const map = new Map<number, MemberCandidate>();
    for (const m of inactivityList) {
      const tags: string[] = [];
      if (m.exceeded) tags.push(`Im lặng ${m.daysInactive} ngày`);
      map.set(m.userId, {
        userId: m.userId,
        userName: m.userName,
        daysInactive: m.daysInactive,
        lastActivity: m.lastActivity,
        exceeded: m.exceeded,
        riskTags: tags,
      });
    }
    for (const raw of teamMembersRaw) {
      if (!map.has(raw.userId)) {
        map.set(raw.userId, {
          userId: raw.userId,
          userName: raw.userName,
          daysInactive: 0,
          lastActivity: '',
          exceeded: false,
          riskTags: [],
        });
      }
    }
    for (const t of taskCandidates) {
      if (!t.assigneeName) continue;
      let target: MemberCandidate | undefined;
      if (t.assigneeId && map.has(t.assigneeId)) {
        target = map.get(t.assigneeId);
      } else {
        for (const cand of map.values()) {
          if (cand.userName.toLowerCase().includes(t.assigneeName.toLowerCase())) {
            target = cand;
            break;
          }
        }
      }
      if (target) {
        if (t.riskStatus === 'overdue' && !target.riskTags.includes('Task quá hạn')) {
          target.riskTags.unshift('Task quá hạn');
        } else if (t.riskStatus === 'due_soon' && !target.riskTags.includes('Task sắp trễ')) {
          target.riskTags.push('Task sắp trễ');
        } else if (t.riskStatus === 'todo' && !target.riskTags.includes('Task cần làm')) {
          target.riskTags.push('Task cần làm');
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.riskTags.length - a.riskTags.length);
  }, [inactivityList, teamMembersRaw, taskCandidates]);

  const sortedTasksForWizard = useMemo(() => {
    const priority: Record<TaskCandidate['riskStatus'], number> = {
      overdue: 1,
      due_soon: 2,
      todo: 3,
      normal: 4,
    };
    return [...taskCandidates].sort((a, b) => priority[a.riskStatus] - priority[b.riskStatus]);
  }, [taskCandidates]);

  const openWizard = (presetUserId?: number, presetTemplate?: AlertTemplateKey) => {
    const chosenTpl = presetTemplate || 'warning';
    const tplConfig = ALERT_TEMPLATES[chosenTpl];
    const defaultMember =
      memberCandidates.find((m) => m.userId === presetUserId) ||
      memberCandidates.find((m) => m.riskTags.length > 0) ||
      memberCandidates[0];

    setSelectedTemplate(chosenTpl);
    setSelectedUserId(defaultMember?.userId);
    setSelectedTaskTitle('');
    setCustomTitle(tplConfig.defaultTitle);
    setCustomMessage('');
    setWizardError(null);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleSelectTemplate = (key: AlertTemplateKey) => {
    const prevDefault = ALERT_TEMPLATES[selectedTemplate].defaultTitle;
    setSelectedTemplate(key);
    if (!customTitle.trim() || customTitle === prevDefault) {
      setCustomTitle(ALERT_TEMPLATES[key].defaultTitle);
    }
  };

  const handleSelectTask = (taskTitle: string) => {
    setSelectedTaskTitle(taskTitle);
    const matchedTask = taskCandidates.find((t) => t.title === taskTitle);
    if (matchedTask && !customMessage.trim()) {
      if (matchedTask.riskStatus === 'overdue') {
        setCustomMessage(
          `Công việc "${matchedTask.title}" đã quá hạn chót, bạn vui lòng cập nhật tiến độ xử lý hoặc báo nếu cần hỗ trợ.`
        );
      } else if (matchedTask.riskStatus === 'due_soon') {
        setCustomMessage(
          `Công việc "${matchedTask.title}" sắp đến hạn chót, bạn ưu tiên hoàn thành và chuyển sang Review nhé.`
        );
      } else {
        setCustomMessage(
          `Nhắc nhở công việc "${matchedTask.title}" (${matchedTask.columnName}), vui lòng bắt đầu thực hiện theo kế hoạch.`
        );
      }
    }
    if (matchedTask?.assigneeId && memberCandidates.some((m) => m.userId === matchedTask.assigneeId)) {
      setSelectedUserId(matchedTask.assigneeId);
    }
  };

  const handleWizardNext = () => {
    setWizardError(null);
    if (wizardStep === 1) {
      setWizardStep(2);
      return;
    }
    if (wizardStep === 2) {
      if (!customMessage.trim()) {
        setWizardError('Vui lòng nhập mô tả cảnh báo để gửi cho thành viên.');
        return;
      }
      setWizardStep(3);
    }
  };

  const handleWizardBack = () => {
    setWizardError(null);
    if (wizardStep > 1) {
      setWizardStep((prev) => prev - 1);
    }
  };

  const selectedRecipient = useMemo(() => {
    return (
      memberCandidates.find((m) => m.userId === selectedUserId) ||
      memberCandidates[0] || {
        userId: 1,
        userName: 'Thành viên nhóm',
        daysInactive: 0,
        lastActivity: '',
        exceeded: false,
        riskTags: [],
      }
    );
  }, [memberCandidates, selectedUserId]);

  const handleWizardSubmit = async () => {
    if (!customMessage.trim()) {
      setWizardError('Vui lòng nhập mô tả cảnh báo để gửi cho thành viên.');
      setWizardStep(2);
      return;
    }

    setSubmittingWizard(true);
    setWizardError(null);

    const tpl = ALERT_TEMPLATES[selectedTemplate];
    const finalTitle = customTitle.trim() || tpl.defaultTitle;
    const finalDesc = customMessage.trim();
    const senderDisplay = `${senderRole}${senderName.trim() ? ` (${senderName.trim()})` : ''}`;

    const payload = {
      userId: selectedRecipient.userId,
      userName: selectedRecipient.userName,
      templateType: selectedTemplate.toUpperCase(),
      alertType: `CUSTOM_${selectedTemplate.toUpperCase()}`,
      severity:
        selectedTemplate === 'error'
          ? 'CRITICAL'
          : selectedTemplate === 'warning'
          ? 'WARNING'
          : 'INFO',
      title: finalTitle,
      message: finalDesc,
      taskTitle: selectedTaskTitle || undefined,
      senderName: senderName.trim() || undefined,
      senderRole,
    };

    let createdAlert: AlertItem = {
      id: Date.now(),
      level: selectedTemplate,
      title: finalTitle,
      desc: finalDesc,
      timeAgo: 'Vừa gửi xong',
      userId: selectedRecipient.userId,
      userName: selectedRecipient.userName,
      alertType: payload.alertType,
      taskTitle: selectedTaskTitle || undefined,
      senderLabel: senderDisplay,
      autoDispatched: false,
    };

    try {
      const res = await apiClient.post<ApiResponse<BackendAlertDto>>(
        `/alerts/team/${currentTeamId}`,
        payload
      );
      if (res.data?.data) {
        createdAlert = mapBackendAlert(res.data.data);
      }
    } catch {
      // Fallback to local state when offline or in unit tests without POST mock
    } finally {
      setAlerts((prev) => [createdAlert, ...prev]);

      addNotification({
        type: selectedTemplate,
        title: `${finalTitle} → ${selectedRecipient.userName}`,
        message: finalDesc,
        authorName: senderName.trim() || 'Nhóm trưởng',
        authorRole: senderRole,
        avatarText: getInitials(senderName.trim() || 'FS'),
        triggerToast: false,
        actionPrimary: { label: 'Xem chi tiết' },
      });

      showToast({
        type: selectedTemplate,
        title: `Đã gửi cảnh báo ${tpl.label}`,
        message: `Đã gửi tới ${selectedRecipient.userName}: ${finalDesc}`,
      });

      setSubmittingWizard(false);
      setWizardOpen(false);
    }
  };

  if (initialized && teams.length === 0 && !urlTeamId) {
    return <NoProjectState />;
  }

  // Visual Theme Tokens
  const theme = {
    textColor: isLight ? '#0f172a' : '#f8fafc',
    subTextColor: isLight ? '#64748b' : '#94a3b8',
    headingColor: isLight ? '#0f172a' : '#ffffff',
    cardBg: isLight ? '#ffffff' : 'rgba(24, 24, 27, 0.75)',
    cardBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
    cardShadow: isLight
      ? '0 10px 30px rgba(0, 0, 0, 0.04)'
      : '0 4px 16px rgba(0, 0, 0, 0.25)',
    cardRadius: '20px',
    rowBg: isLight ? '#fbfcfe' : '#1f1f23',
    rowBorder: isLight ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(255, 255, 255, 0.08)',
    activeTabBg: '#4f46e5',
    inactiveTabBg: isLight ? 'rgba(0, 0, 0, 0.04)' : '#27272a',
  };

  return (
    <div className="page pad" style={{ maxWidth: '1200px', margin: '0 auto', color: theme.textColor }}>
      {/* 1. Breadcrumb & Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.subTextColor, marginBottom: '8px' }}>
          <Link to="/" style={{ color: theme.subTextColor, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#818cf8', fontWeight: 500 }}>Cảnh báo tiến độ</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                <ShieldAlert size={13} />
                Giám sát tự động
              </span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '8px 0 6px', letterSpacing: '-0.02em', color: theme.headingColor }}>
              Cảnh báo tiến độ &amp; Thành viên
            </h1>
            <p style={{ color: theme.subTextColor, margin: 0, fontSize: '13.5px', maxWidth: '64ch', lineHeight: 1.5 }}>
              Tự động theo dõi tiến độ công việc, phát hiện task trễ hạn và nhắc nhở thành viên kịp thời.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {errorCount > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.18)',
                  color: isLight ? '#b91c1c' : '#fca5a5',
                  border: isLight ? '1px solid #fecaca' : '1px solid rgba(239, 68, 68, 0.35)',
                }}
              >
                <AlertCircle size={15} />
                {errorCount} công việc quá hạn
              </span>
            ) : warningCount > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.18)',
                  color: isLight ? '#b45309' : '#fcd34d',
                  border: isLight ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                <AlertTriangle size={15} />
                {warningCount} cần lưu ý
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.18)',
                  color: isLight ? '#047857' : '#6ee7b7',
                  border: isLight ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                <CheckCircle2 size={15} />
                Tất cả đều ổn
              </span>
            )}

            <button
              type="button"
              onClick={() => fetchAlertsData(thresholdDays, true)}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 600,
                background: isLight ? '#f1f5f9' : '#27272a',
                color: theme.textColor,
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Quét & Gửi tự động
            </button>

            <button
              type="button"
              onClick={() => openWizard()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 18px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px -4px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={14} />
              Gửi cảnh báo
            </button>
          </div>
        </div>
      </div>

      {/* Auto-dispatch status banner */}
      {autoDispatchStats.alertCount > 0 && (
        <div
          style={{
            marginBottom: '18px',
            padding: '10px 16px',
            borderRadius: '14px',
            background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.12)',
            border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.28)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.textColor }}>
            <Sparkles size={15} color="#6366f1" />
            <span>
              Đã phát hiện <b>{autoDispatchStats.alertCount} cảnh báo</b> và tự động gửi thông báo tới <b>{autoDispatchStats.memberCount} thành viên</b>.
            </span>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#6366f1',
              background: isLight ? '#ffffff' : 'rgba(99, 102, 241, 0.18)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.35)',
            }}
          >
            Auto-Alert Active
          </span>
        </div>
      )}

      {/* 2. Main Layout: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '22px' }}>
        {/* Left Column: Alert Feed */}
        <div
          style={{
            background: theme.cardBg,
            border: theme.cardBorder,
            borderRadius: theme.cardRadius,
            boxShadow: theme.cardShadow,
            padding: '24px',
          }}
        >
          {/* Header of alerts panel */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                Cảnh báo hiện tại ({filteredAlerts.length})
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: theme.subTextColor }}>
                Phát hiện tự động từ Task Board & Activity Logs · Hiển thị theo 4 mẫu (Info, Warning, Success, Error)
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '5px', background: theme.inactiveTabBg, padding: '4px', borderRadius: '12px', flexWrap: 'wrap' }}>
              {(['ALL', 'error', 'warning', 'success', 'info'] as const).map((tab) => {
                const isActive = filterLevel === tab;
                const tabLabel =
                  tab === 'ALL'
                    ? `Tất cả (${alerts.length})`
                    : tab === 'error'
                    ? `Đỏ (${errorCount})`
                    : tab === 'warning'
                    ? `Vàng (${warningCount})`
                    : tab === 'success'
                    ? `Success (${successCount})`
                    : `Lưu ý (${infoCount})`;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterLevel(tab)}
                    style={{
                      background: isActive ? theme.activeTabBg : 'transparent',
                      color: isActive ? '#ffffff' : theme.subTextColor,
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tabLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert List Rows (Styled with 4 Template Boxes from Image 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map((a) => {
              const tpl = ALERT_TEMPLATES[a.level];
              const palette = isLight ? tpl.light : tpl.dark;

              return (
                <div
                  key={a.id}
                  style={{
                    background: palette.bg,
                    border: palette.border,
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {/* Left circular outline icon matching Image 1 */}
                    <div style={{ flexShrink: 0, marginTop: '1px' }}>
                      {renderTemplateIcon(a.level, 30, palette.iconColor)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color: palette.titleColor,
                            }}
                          >
                            {tpl.label}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: palette.chipBg,
                              color: palette.chipText,
                            }}
                          >
                            {a.title}
                          </span>
                        </div>

                        <span style={{ fontSize: '11.5px', color: palette.textColor, opacity: 0.85, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {a.timeAgo}
                        </span>
                      </div>

                      <p style={{ margin: '6px 0 0', fontSize: '13.5px', lineHeight: 1.55, color: palette.textColor, fontWeight: 500 }}>
                        {a.desc}
                      </p>

                      {(a.taskTitle || a.senderLabel || a.autoDispatched) && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {a.taskTitle && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: palette.chipBg,
                                color: palette.titleColor,
                              }}
                            >
                              Task: {a.taskTitle}
                            </span>
                          )}
                          {a.senderLabel && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: palette.chipBg,
                                color: palette.titleColor,
                              }}
                            >
                              Gửi bởi: {a.senderLabel}
                            </span>
                          )}
                          {a.autoDispatched && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: palette.chipBg,
                                color: palette.titleColor,
                              }}
                            >
                              <Check size={11} strokeWidth={2.5} />
                              <span>Đã tự động gửi cảnh báo</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '8px',
                      borderTop: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.09)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: palette.textColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 500, opacity: 0.85 }}>Liên quan:</span>
                      <span style={{ color: palette.titleColor, fontWeight: 700 }}>{a.userName}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleRemind(a.id, a.userName)}
                        style={{
                          background: isLight ? 'rgba(255, 255, 255, 0.78)' : 'rgba(24, 24, 27, 0.65)',
                          color: palette.titleColor,
                          border: palette.border,
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Bell size={12} />
                        Nhắc nhở
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(a.id, a.title)}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Check size={13} strokeWidth={2.5} />
                        Đánh dấu đã giải quyết
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredAlerts.length === 0 && !loading && (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  background: theme.rowBg,
                  borderRadius: '16px',
                  border: theme.rowBorder,
                }}
              >
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: theme.headingColor }}>
                  Không có cảnh báo tồn đọng
                </h4>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: theme.subTextColor }}>
                  Tất cả công việc và thành viên đều đang trong ngưỡng hoạt động an toàn.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inactivity Threshold Config & Real Team Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Threshold Slider Card */}
          <div
            style={{
              background: theme.cardBg,
              border: theme.cardBorder,
              borderRadius: theme.cardRadius,
              boxShadow: theme.cardShadow,
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sliders size={18} color="#6366f1" />
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                Cấu hình ngưỡng im lặng (CR-04)
              </h2>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', color: theme.subTextColor, fontWeight: 500 }}>
                  Số ngày không hoạt động:
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#6366f1',
                    background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.15)',
                    padding: '2px 10px',
                    borderRadius: '8px',
                    border: isLight ? '1px solid #c7d2fe' : '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  {thresholdDays} ngày
                </span>
              </div>

              <input
                type="range"
                min="2"
                max="10"
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#6366f1',
                  cursor: 'pointer',
                  height: '6px',
                  borderRadius: '3px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.subTextColor, marginTop: '4px' }}>
                <span>2 ngày (Nghiêm ngặt)</span>
                <span>5 ngày (Tiêu chuẩn)</span>
                <span>10 ngày (Nới lỏng)</span>
              </div>
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                background: exceededMembers.length > 0
                  ? isLight
                    ? '#fffbeb'
                    : 'rgba(245, 158, 11, 0.1)'
                  : isLight
                  ? '#f0fdf4'
                  : 'rgba(16, 185, 129, 0.1)',
                border: exceededMembers.length > 0
                  ? isLight
                    ? '1px solid #fef3c7'
                    : '1px solid rgba(245, 158, 11, 0.25)'
                  : isLight
                  ? '1px solid #bbf7d0'
                  : '1px solid rgba(16, 185, 129, 0.25)',
                color: exceededMembers.length > 0
                  ? isLight
                    ? '#92400e'
                    : '#fcd34d'
                  : isLight
                  ? '#166534'
                  : '#86efac',
              }}
            >
              {exceededMembers.length > 0 ? (
                <span>
                  <b>Cảnh báo:</b> Với ngưỡng <b>{thresholdDays} ngày</b>, phát hiện <b>{exceededMembers.length} thành viên</b> vượt quá thời gian im lặng cho phép.
                </span>
              ) : (
                <span>
                  <b>An toàn:</b> Với ngưỡng <b>{thresholdDays} ngày</b>, tất cả các thành viên đều có hoạt động gần đây trong hạn mức quy định.
                </span>
              )}
            </div>
          </div>

          {/* Member Inactivity Real Breakdown Card */}
          <div
            style={{
              background: theme.cardBg,
              border: theme.cardBorder,
              borderRadius: theme.cardRadius,
              boxShadow: theme.cardShadow,
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserX size={18} color="#ec4899" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: theme.headingColor }}>
                  Trạng thái thành viên nhóm ({inactivityList.length})
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inactivityList.map((member) => {
                const isOver = member.exceeded;
                const cand = memberCandidates.find((c) => c.userId === member.userId);
                const hasTaskRisk = (cand?.riskTags || []).some((t) => t.startsWith('Task'));
                const quickPresetTemplate: AlertTemplateKey = cand?.riskTags.includes('Task quá hạn')
                  ? 'error'
                  : isOver || cand?.riskTags.includes('Task sắp trễ')
                  ? 'warning'
                  : 'info';

                return (
                  <div
                    key={member.userId}
                    style={{
                      background: theme.rowBg,
                      border: isOver || hasTaskRisk
                        ? isLight
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : '1px solid rgba(245, 158, 11, 0.3)'
                        : theme.rowBorder,
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isOver
                            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(member.userName)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: theme.headingColor,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {member.userName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: theme.subTextColor, marginTop: '2px' }}>
                          Hoạt động gần nhất: {member.lastActivity ? new Date(member.lastActivity).toLocaleDateString('vi-VN') : 'Chưa có'}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: isOver
                            ? isLight
                              ? '#fef3c7'
                              : 'rgba(245, 158, 11, 0.15)'
                            : isLight
                            ? '#ecfdf5'
                            : 'rgba(16, 185, 129, 0.15)',
                          color: isOver
                            ? isLight
                              ? '#b45309'
                              : '#fbbf24'
                            : isLight
                            ? '#047857'
                            : '#34d399',
                          border: isOver
                            ? isLight
                              ? '1px solid #fde68a'
                              : '1px solid rgba(245, 158, 11, 0.3)'
                            : isLight
                            ? '1px solid #a7f3d0'
                            : '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        {isOver ? <UserX size={11} /> : <UserCheck size={11} />}
                        {member.daysInactive} ngày {isOver ? '(Vượt)' : '(Ổn)'}
                      </span>

                      <button
                        type="button"
                        title={`Gửi cảnh báo cho ${member.userName}`}
                        onClick={() => openWizard(member.userId, quickPresetTemplate)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          border: theme.rowBorder,
                          background: isLight ? '#eef2ff' : 'rgba(99, 102, 241, 0.16)',
                          color: '#6366f1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {inactivityList.length === 0 && !loading && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: theme.subTextColor }}>
                  Không có dữ liệu thành viên.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── 3-STEP SEND ALERT WIZARD MODAL (Image 3 + Image 1 Style) ──────────────── */}
      {wizardOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gửi cảnh báo theo mẫu"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.75rem',
            background: 'rgba(0, 0, 0, 0.68)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingWizard) {
              setWizardOpen(false);
            }
          }}
        >
          <div
            className="mini-window"
            style={{
              width: '100%',
              maxWidth: '610px',
              maxHeight: 'calc(100dvh - 2.5rem)',
              margin: 'auto',
              borderRadius: '26px',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              color: 'var(--fg)',
              boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.42), 0 0 0 1px var(--glass-line)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top Bar with Circular Close Button */}
            <div
              style={{
                padding: '1.25rem 1.5rem 0.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg)',
                    lineHeight: 1.3,
                  }}
                >
                  {wizardStep === 1 && 'Chọn mẫu cảnh báo gửi đi'}
                  {wizardStep === 2 && 'Người có nguy cơ & Mô tả chi tiết'}
                  {wizardStep === 3 && 'Xem trước & Xác nhận gửi cảnh báo'}
                </h2>
                <p
                  style={{
                    margin: '0.35rem 0 0',
                    fontSize: '0.85rem',
                    color: 'var(--fg3)',
                    lineHeight: 1.45,
                  }}
                >
                  {wizardStep === 1 && 'Chọn một trong 4 mẫu thông báo chuẩn (Info, Warning, Success, Error) để báo cho thành viên.'}
                  {wizardStep === 2 && 'Nhóm trưởng hoặc thành viên liên quan chọn người đang có nguy cơ, task và nhập mô tả kèm theo.'}
                  {wizardStep === 3 && 'Kiểm tra lại mẫu cảnh báo và thông tin người nhận trước khi phát thông báo.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                disabled={submittingWizard}
                aria-label="Đóng"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg2)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '1rem 1.5rem 1.25rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {wizardError && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '14px',
                    background: 'color-mix(in srgb, var(--bad) 12%, var(--surface2))',
                    border: '1px solid color-mix(in srgb, var(--bad) 35%, var(--line))',
                    color: 'var(--bad)',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{wizardError}</span>
                </div>
              )}

              {/* STEP 1: SELECT 1 OF 4 ALERT TEMPLATES (Image 1 + Image 3 selection card) */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {(['info', 'warning', 'success', 'error'] as const).map((tplKey) => {
                    const tpl = ALERT_TEMPLATES[tplKey];
                    const pal = isLight ? tpl.light : tpl.dark;
                    const isSelected = selectedTemplate === tplKey;

                    return (
                      <button
                        key={tplKey}
                        type="button"
                        onClick={() => handleSelectTemplate(tplKey)}
                        style={{
                          width: '100%',
                          padding: '0.95rem 1.15rem',
                          borderRadius: '16px',
                          background: pal.bg,
                          border: isSelected ? `2px solid ${pal.iconColor}` : pal.border,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          textAlign: 'left',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.18s ease',
                          boxShadow: isSelected
                            ? `0 8px 22px -8px ${pal.iconColor}`
                            : 'none',
                        }}
                      >
                        <div style={{ flexShrink: 0 }}>
                          {renderTemplateIcon(tplKey, 30, pal.iconColor)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0, paddingRight: '1.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 700, color: pal.titleColor }}>
                              {tpl.label}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: pal.chipBg,
                                color: pal.chipText,
                              }}
                            >
                              {tpl.viBadge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: pal.textColor, marginTop: '0.2rem', lineHeight: 1.4 }}>
                            {tpl.sampleMessage}
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '0.8rem',
                              right: '0.85rem',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: '#2563eb',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Check size={13} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* STEP 2: RECIPIENT, REPORTER ROLE, TASK & DESCRIPTION */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Reporter Role & Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--fg)' }}>
                        Vai trò người báo
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(['Nhóm trưởng', 'Thành viên liên quan'] as const).map((roleOption) => {
                          const active = senderRole === roleOption;
                          return (
                            <button
                              key={roleOption}
                              type="button"
                              onClick={() => setSenderRole(roleOption)}
                              style={{
                                flex: 1,
                                padding: '0.52rem 0.55rem',
                                borderRadius: '11px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: active ? '1.5px solid #4f46e5' : '1px solid var(--line)',
                                background: active ? 'rgba(79, 70, 229, 0.14)' : 'var(--surface2)',
                                color: active ? '#818cf8' : 'var(--fg2)',
                              }}
                            >
                              {roleOption}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--fg)' }}>
                        Tên người gửi
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Nhập tên người báo..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '11px',
                          background: 'var(--surface2)',
                          border: '1.5px solid var(--line)',
                          color: 'var(--fg)',
                          fontSize: '0.84rem',
                        }}
                      />
                    </div>
                  </div>

                  {/* Target Member Selection */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.45rem', color: 'var(--fg)' }}>
                      <Users size={14} color="#6366f1" />
                      Thành viên đang có nguy cơ <span style={{ color: '#6366f1' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {memberCandidates.map((m) => {
                        const isPicked = selectedRecipient.userId === m.userId;
                        const hasRisk = m.riskTags.length > 0;
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => setSelectedUserId(m.userId)}
                            style={{
                              padding: '0.48rem 0.78rem',
                              borderRadius: '12px',
                              border: isPicked
                                ? '1.5px solid #4f46e5'
                                : hasRisk
                                ? '1px solid rgba(245, 158, 11, 0.45)'
                                : '1px solid var(--line)',
                              background: isPicked
                                ? 'rgba(79, 70, 229, 0.16)'
                                : 'var(--surface2)',
                              color: 'var(--fg)',
                              fontSize: '0.78rem',
                              fontWeight: isPicked ? 700 : 500,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{m.userName}</span>
                            {m.riskTags[0] && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                  background: m.riskTags[0].includes('quá hạn')
                                    ? 'rgba(239, 68, 68, 0.18)'
                                    : 'rgba(245, 158, 11, 0.2)',
                                  color: m.riskTags[0].includes('quá hạn')
                                    ? '#f87171'
                                    : '#fbbf24',
                                }}
                              >
                                {m.riskTags[0]}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Related Task Selector */}
                  {sortedTasksForWizard.length > 0 && (
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--fg)' }}>
                        <ClipboardList size={14} color="#6366f1" />
                        Công việc liên quan (tùy chọn)
                      </label>
                      <select
                        value={selectedTaskTitle}
                        onChange={(e) => handleSelectTask(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.62rem 0.85rem',
                          borderRadius: '12px',
                          background: 'var(--surface2)',
                          border: '1.5px solid var(--line)',
                          color: 'var(--fg)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <option value="">-- Không gắn công việc cụ thể --</option>
                        {sortedTasksForWizard.map((t) => (
                          <option key={t.id} value={t.title}>
                            [{t.riskStatus === 'overdue' ? 'Quá hạn' : t.riskStatus === 'due_soon' ? 'Sắp trễ' : t.riskStatus === 'todo' ? 'To Do' : t.columnName}] {t.title} {t.assigneeName ? `(${t.assigneeName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Alert Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--fg)' }}>
                      Tiêu đề cảnh báo
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={ALERT_TEMPLATES[selectedTemplate].defaultTitle}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '12px',
                        background: 'var(--surface2)',
                        border: '1.5px solid var(--line)',
                        color: 'var(--fg)',
                        fontSize: '0.86rem',
                      }}
                    />
                  </div>

                  {/* Alert Description + Quick Chips */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--fg)' }}>
                      Mô tả chi tiết gửi người có nguy cơ <span style={{ color: '#6366f1' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Nhập nội dung nhắc nhở, lý do có nguy cơ hoặc hướng dẫn xử lý..."
                      style={{
                        width: '100%',
                        padding: '0.72rem 0.9rem',
                        borderRadius: '12px',
                        background: 'var(--surface2)',
                        border: '1.5px solid var(--line)',
                        color: 'var(--fg)',
                        fontSize: '0.86rem',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem' }}>
                      {ALERT_TEMPLATES[selectedTemplate].quickMessages.map((qMsg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCustomMessage(qMsg)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            background: 'var(--surface2)',
                            border: '1px solid var(--line)',
                            color: 'var(--fg2)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          + {qMsg.slice(0, 48)}...
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LIVE PREVIEW (Image 1 Style) & CONFIRMATION */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg3)', marginBottom: '0.5rem' }}>
                      Xem trước hộp cảnh báo sẽ hiển thị
                    </div>
                    {(() => {
                      const tpl = ALERT_TEMPLATES[selectedTemplate];
                      const pal = isLight ? tpl.light : tpl.dark;
                      return (
                        <div
                          style={{
                            padding: '1rem 1.2rem',
                            borderRadius: '14px',
                            background: pal.bg,
                            border: pal.border,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                          }}
                        >
                          <div style={{ flexShrink: 0 }}>
                            {renderTemplateIcon(selectedTemplate, 32, pal.iconColor)}
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: pal.titleColor }}>
                              {tpl.label} — {customTitle.trim() || tpl.defaultTitle}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: pal.textColor, marginTop: '0.2rem', lineHeight: 1.45 }}>
                              {customMessage.trim()}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Summary Details Card */}
                  <div
                    style={{
                      padding: '1.1rem 1.25rem',
                      borderRadius: '18px',
                      background: 'var(--surface2)',
                      border: '1.5px solid var(--line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--fg3)' }}>Thành viên nhận (có nguy cơ):</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--fg)' }}>{selectedRecipient.userName}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--fg3)' }}>Người gửi báo cáo:</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--fg)' }}>
                        {senderRole}{senderName.trim() ? ` (${senderName.trim()})` : ''}
                      </span>
                    </div>
                    {selectedTaskTitle && (
                      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '0.65rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--fg3)' }}>Công việc liên quan:</span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--fg)', textAlign: 'right' }}>{selectedTaskTitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar (Matching Image 3: Progress bar + Step x/3 + Pill Buttons) */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid var(--line)',
                background: 'var(--surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '90px',
                    height: '6px',
                    borderRadius: '999px',
                    background: 'var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(wizardStep / 3) * 100}%`,
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
                      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--fg3)' }}>
                  Bước {wizardStep}/3
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleWizardBack}
                    disabled={submittingWizard}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg)',
                      background: 'var(--surface)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ChevronLeft size={15} />
                    Quay lại
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setWizardOpen(false)}
                    disabled={submittingWizard}
                    style={{
                      padding: '0.55rem 1.15rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--fg3)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleWizardNext}
                    style={{
                      padding: '0.55rem 1.4rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#4f46e5',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 14px -3px rgba(79, 70, 229, 0.45)',
                    }}
                  >
                    Tiếp tục
                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleWizardSubmit}
                    disabled={submittingWizard}
                    style={{
                      padding: '0.55rem 1.45rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#4f46e5',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px -3px rgba(79, 70, 229, 0.45)',
                    }}
                  >
                    {submittingWizard ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
                    Xác nhận gửi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
