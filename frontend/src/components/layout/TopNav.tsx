import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useProjectStore } from '../../store/projectStore';
import { buildUserScopeKey, useNotificationStore } from '../../store/notificationStore';
import type { Team } from '../../types/team';
import { FairShareLogo } from '../ui/FairShareLogo';
import { showToast } from '../ui/Toast';
import {
  ChevronDown,
  Check,
  Plus,
  LayoutDashboard,
  FolderKanban,
  FilePlus2,
  Scale,
  Network,
  AlertTriangle,
  FileBarChart,
  Bell,
  Moon,
  Sun,
  Settings,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { CreateProjectModal } from '../../features/team/CreateProjectModal';
import { NotificationPopover } from '../notifications/NotificationPopover';

interface NavLinkItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hasDot?: boolean;
}

const NAV_LINKS: NavLinkItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teams', label: 'Dự án', icon: FolderKanban },
  { to: '/contributions/manual', label: 'Đóng góp', icon: FilePlus2 },
  { to: '/peer-review', label: 'Chấm chéo', icon: Scale },
  { to: '/integration', label: 'Tích hợp', icon: Network },
  { to: '/alerts', label: 'Cảnh báo', icon: AlertTriangle, hasDot: true },
  { to: '/report', label: 'Báo cáo', icon: FileBarChart },
];

const isNavItemActive = (to: string, pathname: string): boolean => {
  if (to === '/dashboard') {
    return (
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname === '/contributions' ||
      pathname === '/dong-gop' ||
      pathname.startsWith('/dong-gop/')
    );
  }
  if (to === '/teams') {
    return pathname.startsWith('/teams') || pathname.startsWith('/board');
  }
  if (to === '/contributions/manual') {
    return pathname.startsWith('/contributions/manual');
  }
  if (to === '/peer-review') {
    return pathname.startsWith('/peer-review');
  }
  if (to === '/integration') {
    return pathname.startsWith('/integration') || pathname.startsWith('/tich-hop');
  }
  if (to === '/alerts') {
    return pathname.startsWith('/alerts');
  }
  if (to === '/report') {
    return pathname.startsWith('/report');
  }
  return pathname === to;
};

const LENS_PAD_X = 0;

function buildMemberNameMap(team?: Team): Map<number, string> | undefined {
  if (!team?.members || team.members.length === 0) return undefined;
  const map = new Map<number, string>();
  for (const m of team.members) {
    const uid = m.user?.id ?? m.userId;
    const name = m.user?.fullName || m.fullName || m.user?.email || m.email;
    if (uid != null && name) {
      map.set(uid, name);
    }
  }
  return map.size > 0 ? map : undefined;
}

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, logout } = useAuthStore();
  const { teams, activeTeamId, initialized, fetchTeams, setActiveTeamId } = useProjectStore();
  const unreadNotifCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);
  const hasUnseenBadge = useNotificationStore((s) => s.hasUnseenBadge);
  const markBellAsSeen = useNotificationStore((s) => s.markBellAsSeen);
  const syncWithBackend = useNotificationStore((s) => s.syncWithBackend);
  const setUserScope = useNotificationStore((s) => s.setUserScope);
  const setScope = useNotificationStore((s) => s.setScope);
  const clearNotifications = useNotificationStore((s) => s.clearNotifications);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('openProjectMenu')
  );
  const notifRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const navRef = useRef<HTMLElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const tabMetricsRef = useRef<Array<{ left: number; width: number }>>([]);
  const suppressClickRef = useRef(false);
  const hoveredIdxRef = useRef<number | null>(null);
  const activeIdxRef = useRef<number>(-1);

  const physicsRef = useRef({
    x: 0,
    w: 0,
    vx: 0,
    vw: 0,
    targetX: 0,
    targetW: 0,
    initialized: false,
    visible: false,
    isDragging: false,
    dragMoved: false,
    dragStartClientX: 0,
    dragLensStartX: 0,
    dragTargetX: 0,
    rafId: 0,
    lastTime: 0,
  });

  const activeIdx = useMemo(
    () => NAV_LINKS.findIndex((item) => isNavItemActive(item.to, location.pathname)),
    [location.pathname]
  );
  activeIdxRef.current = activeIdx;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Tránh đóng popover nếu phần tử click bị unmount khỏi DOM trong khi re-render
      if (!target || !document.contains(target)) return;
      const notifPopoverEl = document.getElementById('notifPopover');
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        (!notifPopoverEl || !notifPopoverEl.contains(target))
      ) {
        setIsNotifOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(target)) {
        setIsProjectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAuthenticated && (user || token)) {
      fetchTeams();
    } else {
      clearNotifications();
    }
  }, [isAuthenticated, user, token, fetchTeams, clearNotifications]);

  useEffect(() => {
    const userScope = buildUserScopeKey(user);
    if (!isAuthenticated || !userScope) {
      clearNotifications();
      return;
    }
    if (!initialized) {
      setUserScope(userScope);
      return;
    }
    const matchedTeam = activeTeamId ? teams.find((t) => t.id === activeTeamId) : undefined;
    if (activeTeamId && matchedTeam) {
      syncWithBackend(activeTeamId, {
        userScope,
        memberNameMap: buildMemberNameMap(matchedTeam),
      });
    } else {
      setScope(userScope, null);
    }
  }, [isAuthenticated, user, initialized, activeTeamId, teams, setUserScope, setScope, syncWithBackend, clearNotifications]);

  useEffect(() => {
    const saved = localStorage.getItem('fs-theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.dataset.theme = initial;
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('fs-theme', nextTheme);
    showToast(`Đã chuyển sang giao diện ${nextTheme === 'dark' ? 'tối' : 'sáng'}`);
  };

  const measureTabs = useCallback(() => {
    tabMetricsRef.current = NAV_LINKS.map((_, i) => {
      const el = itemRefs.current[i];
      if (!el) return { left: 0, width: 0 };
      return { left: el.offsetLeft, width: el.offsetWidth };
    });
  }, []);

  const applyLensStyles = useCallback(
    (x: number, w: number, vx: number, visible: boolean, isDragging: boolean) => {
      const lens = lensRef.current;
      if (lens) {
        if (!visible || w <= 0) {
          lens.style.opacity = '0';
        } else {
          const speed = Math.abs(vx);
          const stretch = Math.min(0.04, speed / 4200);
          const dragBoost = isDragging ? 0.02 : 0;
          const scaleX = 1 + stretch + dragBoost;
          const scaleY = 1 - stretch * 0.35 + dragBoost;
          const glossShift = Math.max(-18, Math.min(18, -vx * 0.014));

          lens.style.opacity = '1';
          lens.style.width = `${w.toFixed(2)}px`;
          lens.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
          lens.style.setProperty('--lens-gloss-x', `${(50 + glossShift).toFixed(1)}%`);
        }
      }

      const lensCenter = x + w / 2;
      const lensHalf = w / 2;
      tabMetricsRef.current.forEach((m, i) => {
        const el = itemRefs.current[i];
        if (!el) return;
        if (!visible || w <= 0 || m.width <= 0) {
          el.style.setProperty('--lens-focus', '0');
          return;
        }
        const tabCenter = m.left + m.width / 2;
        const dist = Math.abs(tabCenter - lensCenter);
        const reach = Math.max(1, lensHalf + m.width * 0.25);
        const proximity = Math.max(0, Math.min(1, 1 - dist / reach));
        el.style.setProperty('--lens-focus', proximity.toFixed(3));
      });
    },
    []
  );

  const startSpringLoop = useCallback(() => {
    const p = physicsRef.current;
    if (p.rafId) return;
    p.lastTime = 0;

    const step = (now: number) => {
      const dt = p.lastTime ? Math.min(0.032, Math.max(0.004, (now - p.lastTime) / 1000)) : 1 / 60;
      p.lastTime = now;

      if (p.isDragging && p.dragMoved) {
        const prevX = p.x;
        p.x += (p.dragTargetX - p.x) * 0.45;
        p.vx = Math.max(-1800, Math.min(1800, ((p.x - prevX) / dt) * 0.35));

        const lensCenter = p.x + p.w / 2;
        let nearestW = p.targetW;
        let bestDist = Infinity;
        tabMetricsRef.current.forEach((m) => {
          if (m.width <= 0) return;
          const dist = Math.abs(m.left + m.width / 2 - lensCenter);
          if (dist < bestDist) {
            bestDist = dist;
            nearestW = m.width + LENS_PAD_X * 2;
          }
        });
        p.w += (nearestW - p.w) * 0.25;

        applyLensStyles(p.x, p.w, p.vx, p.visible, true);
        p.rafId = window.requestAnimationFrame(step);
        return;
      }

      // Smooth glass pill spring physics
      const stiffness = 240;
      const damping = 22;
      const stiffnessW = 260;
      const dampingW = 24;

      const ax = (p.targetX - p.x) * stiffness - p.vx * damping;
      p.vx += ax * dt;
      p.x += p.vx * dt;

      const aw = (p.targetW - p.w) * stiffnessW - p.vw * dampingW;
      p.vw += aw * dt;
      p.w += p.vw * dt;

      const settled =
        Math.abs(p.targetX - p.x) < 0.15 &&
        Math.abs(p.vx) < 0.5 &&
        Math.abs(p.targetW - p.w) < 0.15 &&
        Math.abs(p.vw) < 0.5;

      if (settled) {
        p.x = p.targetX;
        p.w = p.targetW;
        p.vx = 0;
        p.vw = 0;
        p.rafId = 0;
        applyLensStyles(p.x, p.w, 0, p.visible, false);
        return;
      }

      applyLensStyles(p.x, p.w, p.vx, p.visible, false);
      p.rafId = window.requestAnimationFrame(step);
    };

    p.rafId = window.requestAnimationFrame(step);
  }, [applyLensStyles]);

  const syncLensTarget = useCallback(
    (snapImmediate = false) => {
      measureTabs();
      const idx = activeIdxRef.current;
      const p = physicsRef.current;

      if (idx < 0 || !tabMetricsRef.current[idx] || tabMetricsRef.current[idx].width <= 0) {
        p.visible = false;
        applyLensStyles(p.x, p.w, 0, false, false);
        return;
      }

      const m = tabMetricsRef.current[idx];
      let targetX = m.left - LENS_PAD_X;
      const targetW = m.width + LENS_PAD_X * 2;

      const hIdx = hoveredIdxRef.current;
      if (hIdx !== null && hIdx !== idx && tabMetricsRef.current[hIdx]?.width > 0) {
        const hm = tabMetricsRef.current[hIdx];
        const dir = Math.sign(hm.left + hm.width / 2 - (m.left + m.width / 2));
        targetX += dir * 3.5;
      }

      p.targetX = targetX;
      p.targetW = targetW;
      p.visible = true;

      if (!p.initialized || snapImmediate) {
        if (p.rafId) {
          window.cancelAnimationFrame(p.rafId);
          p.rafId = 0;
        }
        p.x = targetX;
        p.w = targetW;
        p.vx = 0;
        p.vw = 0;
        p.initialized = true;
        applyLensStyles(p.x, p.w, 0, true, false);
      } else {
        startSpringLoop();
      }
    },
    [applyLensStyles, measureTabs, startSpringLoop]
  );

  useEffect(() => {
    syncLensTarget(false);
    setIsMobileMenuOpen(false);
    if (activeIdx >= 0 && typeof window !== 'undefined' && window.innerWidth <= 1180) {
      itemRefs.current[activeIdx]?.scrollIntoView?.({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeIdx, location.pathname, syncLensTarget]);

  useEffect(() => {
    let cancelled = false;
    const physics = physicsRef.current;
    const handleResize = () => syncLensTarget(true);
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      ro = new ResizeObserver(() => syncLensTarget(true));
      ro.observe(navRef.current);
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) syncLensTarget(true);
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
      if (physics.rafId) {
        window.cancelAnimationFrame(physics.rafId);
        physics.rafId = 0;
      }
    };
  }, [syncLensTarget]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const p = physicsRef.current;
      if (!p.isDragging) return;
      const dx = e.clientX - p.dragStartClientX;
      if (!p.dragMoved && Math.abs(dx) > 6) {
        p.dragMoved = true;
        navRef.current?.classList.add('is-scrubbing');
        startSpringLoop();
      }
      if (p.dragMoved && navRef.current) {
        const navW = navRef.current.offsetWidth;
        const minX = 4;
        const maxX = Math.max(minX, navW - p.w - 4);
        p.dragTargetX = Math.max(minX, Math.min(maxX, p.dragLensStartX + dx));
      }
    };

    const handlePointerEnd = () => {
      const p = physicsRef.current;
      if (!p.isDragging) return;
      const wasMoved = p.dragMoved;
      p.isDragging = false;
      p.dragMoved = false;
      navRef.current?.classList.remove('is-scrubbing');

      if (!wasMoved) return;

      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);

      const lensCenter = p.x + p.w / 2;
      let nearestIdx = activeIdxRef.current;
      let bestDist = Infinity;
      tabMetricsRef.current.forEach((m, i) => {
        if (m.width <= 0) return;
        const dist = Math.abs(m.left + m.width / 2 - lensCenter);
        if (dist < bestDist) {
          bestDist = dist;
          nearestIdx = i;
        }
      });

      if (nearestIdx >= 0 && nearestIdx !== activeIdxRef.current) {
        const target = tabMetricsRef.current[nearestIdx];
        p.targetX = target.left - LENS_PAD_X;
        p.targetW = target.width + LENS_PAD_X * 2;
        startSpringLoop();
        navigate(NAV_LINKS[nearestIdx].to);
      } else {
        syncLensTarget(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [navigate, startSpringLoop, syncLensTarget]);

  const handleNavPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch' || e.button !== 0 || activeIdxRef.current < 0) return;
    const p = physicsRef.current;
    p.isDragging = true;
    p.dragMoved = false;
    p.dragStartClientX = e.clientX;
    p.dragLensStartX = p.x;
    p.dragTargetX = p.x;
  };

  const getProjectPalette = (id: number) => {
    const palettes = [
      { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' },
      { bg: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff' },
    ];
    return palettes[id % palettes.length];
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'P';
  };

  const activeTeam = teams.find((t) => t.id === activeTeamId) || teams[0];

  return (
    <>
      <header className="top" id="top">
        {/* Brand logo & Project selector */}
        <div className="top-brand-group">
          <Link to="/landing" className="brand" aria-label="FairShare, về trang chủ" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <FairShareLogo size={22} textClassName={isAuthenticated ? 'hidden sm:inline-block' : ''} />
          </Link>

          {isAuthenticated && (user || token) && (
            <div ref={projectDropdownRef} className="relative min-w-0 flex-1 max-w-[165px] sm:max-w-[210px]">
              {teams.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsProjectOpen((prev) => !prev)}
                    className={`w-full flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl border transition-all text-xs font-semibold select-none cursor-pointer min-w-0 shadow-sm ${
                      isProjectOpen
                        ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/25 bg-white dark:bg-[#222632] text-zinc-950 dark:text-white'
                        : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1c1f28] hover:bg-zinc-100 dark:hover:bg-[#262a36] hover:border-slate-400 dark:hover:border-white/35 text-zinc-800 dark:text-zinc-200'
                    }`}
                    title={`Dự án đang chọn: ${activeTeam?.name || ''}`}
                  >
                    {/* Project Avatar */}
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm"
                      style={{
                        background: getProjectPalette(activeTeam?.id || 1).bg,
                        color: getProjectPalette(activeTeam?.id || 1).color,
                      }}
                    >
                      {getInitials(activeTeam?.name || 'K')}
                    </span>

                    {/* Project Name */}
                    <span className="truncate flex-1 min-w-0 text-left font-bold tracking-tight">
                      {activeTeam?.name || 'Chọn dự án'}
                    </span>

                    {/* Chevron Icon */}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isProjectOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Popup Menu */}
                  {isProjectOpen && (
                    <div
                      className="fixed left-3 right-3 top-[calc(var(--top-row1,52px)+6px)] sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+14px)] sm:w-[320px] z-[100] rounded-2xl border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1d26] overflow-hidden"
                      style={{
                        boxShadow:
                          theme === 'dark'
                            ? '0 24px 50px -10px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.16), 0 8px 24px -4px rgba(0, 0, 0, 0.6)'
                            : '0 20px 45px -12px rgba(15, 23, 42, 0.22), 0 6px 18px -4px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      {/* Header */}
                      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.03]">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
                          DỰ ÁN CỦA BẠN
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                          {teams.length}
                        </span>
                      </div>

                      {/* Project List */}
                      <div className="max-h-64 overflow-y-auto p-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
                        {teams.map((t) => {
                          const isActive = (activeTeamId || teams[0]?.id) === t.id;
                          const palette = getProjectPalette(t.id);
                          const initials = getInitials(t.name);

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setActiveTeamId(t.id);
                                setIsProjectOpen(false);
                                setIsNotifOpen(false);
                                showToast(`Đã chuyển sang dự án: ${t.name}`);
                                navigate(`${location.pathname}?teamId=${t.id}`);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left cursor-pointer group ${
                                isActive
                                  ? 'bg-cyan-500/10 dark:bg-cyan-500/20 border border-cyan-500/40 text-cyan-950 dark:text-cyan-200 font-semibold shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                              }`}
                            >
                              {/* Project Avatar */}
                              <span
                                className="w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm transition-transform group-hover:scale-105"
                                style={{ background: palette.bg, color: palette.color }}
                              >
                                {initials}
                              </span>

                              {/* Project Info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                  {t.name}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {isActive ? 'Đang hoạt động' : 'Chuyển không gian làm việc'}
                                </div>
                              </div>

                              {/* Active Checkmark */}
                              {isActive && (
                                <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Bottom Action: Create Project */}
                      <div className="p-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-black/30">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProjectOpen(false);
                            setIsModalOpen(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-white dark:bg-cyan-500/10 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 border border-dashed border-cyan-500/40 hover:border-cyan-500 transition-all cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tạo dự án mới...</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <Plus size={13} />
                  <span>+ Tạo dự án</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Main navigation links - 3D Liquid Glass Capsule */}
        <div className="liquid-nav-outer">
          <nav
            ref={navRef}
            className="links liquid-nav-track"
            id="nav"
            aria-label="Chính"
            onPointerDown={handleNavPointerDown}
            onPointerLeave={() => {
              if (hoveredIdxRef.current !== null) {
                hoveredIdxRef.current = null;
                syncLensTarget(false);
              }
            }}
          >
            <div ref={lensRef} className="liquid-glass-lens" aria-hidden="true">
              <div className="liquid-glass-lens-backdrop" />
              <div className="liquid-glass-lens-rim" />
              <div className="liquid-glass-lens-shine" />
            </div>

            {NAV_LINKS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === activeIdx;

              return (
                <Link
                  key={item.to}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`liquid-nav-item ${isActive ? 'is-active' : ''}`}
                  onPointerEnter={() => {
                    if (!physicsRef.current.isDragging && hoveredIdxRef.current !== index) {
                      hoveredIdxRef.current = index;
                      syncLensTarget(false);
                    }
                  }}
                  onClick={(e) => {
                    if (suppressClickRef.current) {
                      e.preventDefault();
                      suppressClickRef.current = false;
                    }
                  }}
                >
                  <Icon
                    className="liquid-nav-icon"
                    size={14}
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />
                  <span className="liquid-nav-label">{item.label}</span>
                  {item.hasDot && teams.length > 0 && hasUnseenBadge && unreadNotifCount > 0 && (
                    <span className="dot" title={`${unreadNotifCount} cảnh báo mới`} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action buttons */}
        <div className="acts">
          {/* Nút Chuông thông báo (bên cạnh theme toggle) */}
          <div className="notif-anchor" ref={notifRef} style={{ position: 'relative' }}>
            <button
              className={`icon-btn notif-btn-trigger ${isNotifOpen ? 'active' : ''}`}
              id="notifBtn"
              data-testid="notif-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const next = !isNotifOpen;
                setIsNotifOpen(next);
                if (next) {
                  markBellAsSeen();
                  const userScope = buildUserScopeKey(user);
                  const matchedTeam = activeTeamId
                    ? teams.find((t) => t.id === activeTeamId)
                    : undefined;
                  if (isAuthenticated && userScope && activeTeamId && matchedTeam) {
                    syncWithBackend(activeTeamId, {
                      userScope,
                      memberNameMap: buildMemberNameMap(matchedTeam),
                    });
                  }
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Thông báo"
              title={unreadNotifCount > 0 ? `${unreadNotifCount} thông báo mới` : 'Thông báo'}
            >
              <Bell size={18} />
              {hasUnseenBadge && unreadNotifCount > 0 && (
                <span
                  className="notif-badge-count"
                  style={{ pointerEvents: 'none' }}
                  title={`${unreadNotifCount} thông báo mới`}
                >
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <NotificationPopover onClose={() => setIsNotifOpen(false)} />
            )}
          </div>

          <button
            className="icon-btn"
            id="themeBtn"
            type="button"
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện sáng/tối"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link
            className="icon-btn hidden md:grid"
            id="setBtn"
            to="/profile"
            aria-label="Cài đặt và hồ sơ"
            title="Cài đặt và hồ sơ"
            aria-current={location.pathname === '/profile' ? 'page' : undefined}
          >
            <Settings size={18} />
          </Link>

          {isAuthenticated && user ? (
            <button
              className="btn sm hidden md:inline-flex"
              onClick={() => {
                logout();
                showToast('Đã đăng xuất');
                navigate('/login');
              }}
              title={`Đang đăng nhập: ${user.fullName || user.email}`}
            >
              Đăng xuất
            </button>
          ) : (
            <Link className="btn sm hidden md:inline-flex" to="/login">
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            className="icon-btn md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Mở menu điều hướng"
            aria-expanded={isMobileMenuOpen}
            title="Menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {isMobileMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="mobile-nav-backdrop md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)]">
                <FairShareLogo size={20} />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="icon-btn"
                  aria-label="Đóng menu"
                >
                  <X size={18} />
                </button>
              </div>

              {isAuthenticated && activeTeam && (
                <div className="mb-4 px-3 py-2.5 rounded-xl bg-[var(--surface2)] border border-[var(--line)]">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg3)]">
                    Dự án đang chọn
                  </div>
                  <div className="text-sm font-bold text-[var(--fg)] truncate mt-0.5">
                    {activeTeam.name}
                  </div>
                </div>
              )}

              <nav className="flex flex-col gap-1 flex-1" aria-label="Điều hướng di động">
                {NAV_LINKS.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(item.to, location.pathname);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`mobile-nav-item ${active ? 'is-active' : ''}`}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      {item.hasDot && teams.length > 0 && hasUnseenBadge && unreadNotifCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Cảnh báo mới" />
                      )}
                    </Link>
                  );
                })}

                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`mobile-nav-item ${location.pathname === '/profile' ? 'is-active' : ''}`}
                >
                  <Settings size={18} />
                  <span>Cài đặt &amp; Hồ sơ</span>
                </Link>
              </nav>

              <div className="pt-4 mt-4 border-t border-[var(--line)] space-y-2.5">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-2 text-xs text-[var(--fg2)] truncate">
                      <div className="font-semibold text-[var(--fg)] truncate">{user.fullName || 'Thành viên'}</div>
                      <div className="text-[11px] text-[var(--fg3)] truncate">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                        showToast('Đã đăng xuất');
                        navigate('/login');
                      }}
                      className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 font-semibold text-sm cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn w-full justify-center min-h-[44px]"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
