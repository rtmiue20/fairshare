import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Key } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a: number, b: number, x: number) => {
  const norm = clamp((x - a) / (b - a));
  return norm * norm * (3 - 2 * norm);
};
const eo = (x: number) => 1 - Math.pow(1 - x, 3);
const eio = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

interface Particle {
  ax: number;
  ay: number;
  m: number;
  sx: number;
  sy: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  d: number;
  d1: number;
  w: number;
}

export interface HeroMemberItem {
  id: string | number;
  name: string;
  ini: string;
  role: string;
  pct: number;
  tasks: number;
  edits: number;
  peer: number;
}

const DEFAULT_HERO_MEMBERS: HeroMemberItem[] = [
  { id: 'm1', name: 'Minh Triều', ini: 'MT', role: 'Leader', pct: 34, tasks: 31, edits: 412, peer: 4.3 },
  { id: 'm2', name: 'Lan Anh', ini: 'LA', role: 'Backend', pct: 27, tasks: 26, edits: 338, peer: 4.1 },
  { id: 'm3', name: 'Quốc Bảo', ini: 'QB', role: 'Frontend', pct: 24, tasks: 22, edits: 301, peer: 3.9 },
  { id: 'm4', name: 'Thu Hà', ini: 'TH', role: 'Tài liệu', pct: 15, tasks: 9, edits: 197, peer: 3.2 },
];

const FALLBACK_MEMBER_RGB: [number, number, number][] = [
  [91, 141, 239],
  [192, 107, 224],
  [232, 163, 61],
  [63, 191, 168],
  [76, 195, 138],
  [169, 155, 255],
];

/** Chạy queue marquee từ phải qua trái nếu text quá dài */
const MarqueeText: React.FC<{ text: string; maxLen?: number }> = ({
  text,
  maxLen = 40,
}) => {
  if (!text) return null;
  if (text.length <= maxLen) {
    return <>{text}</>;
  }
  const doubled = text + '    •    ' + text;
  return (
    <span
      className="marquee-wrap"
      aria-label={text}
      style={{
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        verticalAlign: 'bottom',
      }}
    >
      <span className="marquee-inner">{doubled}</span>
    </span>
  );
};

export interface DashboardHeroCanvasProps {
  teamId?: number;
  members?: HeroMemberItem[];
  totalEvents?: number;
  sprintLabel?: string;
}

export const DashboardHeroCanvas: React.FC<DashboardHeroCanvasProps> = ({
  teamId: propTeamId,
  members: propMembers,
  totalEvents,
  sprintLabel,
}) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [scrollS, setScrollS] = useState(0);

  // ── Dynamic team data ──────────────────────────────────────────
  const teams = useProjectStore((s) => s.teams);
  const activeTeamId = useProjectStore((s) => s.activeTeamId);
  const targetId = propTeamId || activeTeamId;
  const currentTeam = teams.find((t) => t.id === targetId) ?? teams[0] ?? null;

  // Tên hiển thị trên Canvas: giữ gọn phần mã / tên dự án chính để kích thước chữ hạt particle lớn và sắc nét
  const rawTeamName = currentTeam?.name?.trim() || 'FAIRSHARE';
  const shortBrand = rawTeamName.split(/\s*[—–-]\s*/)[0]?.trim() || rawTeamName;
  const projectLabel = shortBrand.toUpperCase().slice(0, 14);
  const inviteCode = currentTeam?.inviteCode ?? null;
  const courseName = currentTeam?.courseName ?? null;
  const description = currentTeam?.description ?? null;

  // Chuẩn hóa danh sách thành viên (tối đa 6 người) với reference ổn định tránh flicker khi scroll
  const membersKey = JSON.stringify(propMembers ?? []);
  const activeMembers = useMemo<HeroMemberItem[]>(() => {
    try {
      const parsed = JSON.parse(membersKey) as HeroMemberItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 6);
      }
    } catch {
      // Fallback sang mẫu mặc định
    }
    return DEFAULT_HERO_MEMBERS;
  }, [membersKey]);

  const computedActivities = activeMembers.reduce(
    (sum, m) => sum + (m.edits || 0) + (m.tasks || 0),
    0
  );
  const totalActivities =
    totalEvents && totalEvents > 0
      ? totalEvents
      : computedActivities > 0
        ? computedActivities
        : 1248;
  const totalActivitiesLabel = totalActivities.toLocaleString('vi-VN');

  useEffect(() => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    const cv = canvasRef.current;
    if (!hero || !stage || !cv) return;

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const LABEL = projectLabel;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let tw = 0;
    let fs = 0;
    let asc = 0;
    let narrow = false;
    let pts: Particle[] = [];
    let ring = { R: 0, ri: 0, arcs: [] as [number, number][] };
    let bars = { bh: 0, bg: 0, K: 0, xs: 0, ys: 0, labW: 0, pctW: 0 };
    let s = 0;
    let dirty = true;
    const t0 = performance.now();
    type ColorRGB = [number, number, number];
    let col: {
      fg: ColorRGB;
      fg3: ColorRGB;
      line: ColorRGB;
      acc: ColorRGB;
      guide: ColorRGB;
      m: ColorRGB[];
    } = {
      fg: [244, 244, 242],
      fg3: [116, 116, 111],
      line: [48, 48, 48],
      acc: [91, 141, 239],
      guide: [181, 54, 201],
      m: FALLBACK_MEMBER_RGB,
    };
    let ready = false;
    let animId = 0;
    let lastUiScroll = -1;
    let lastTab: 0 | 1 | 2 = 0;

    const parseColor = (c: string, fallback: ColorRGB): ColorRGB => {
      const clean = c.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
        return [
          parseInt(clean.slice(1, 3), 16),
          parseInt(clean.slice(3, 5), 16),
          parseInt(clean.slice(5, 7), 16),
        ];
      }
      const rgbMatch = clean.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
      if (rgbMatch) {
        return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
      }
      return fallback;
    };

    const rgba = (c: ColorRGB, a: number) =>
      `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

    function getColors() {
      const cs = getComputedStyle(document.documentElement);
      const g = (n: string) => cs.getPropertyValue(n).trim();
      const memberVars = ['--m1', '--m2', '--m3', '--m4', '--ok', '--ital'];
      col = {
        fg: parseColor(g('--fg'), [244, 244, 242]),
        fg3: parseColor(g('--fg3'), [116, 116, 111]),
        line: parseColor(g('--line'), [48, 48, 48]),
        acc: parseColor(g('--accent'), [91, 141, 239]),
        guide: parseColor(g('--guide'), [181, 54, 201]),
        m: memberVars.map((n, idx) =>
          parseColor(g(n), FALLBACK_MEMBER_RGB[idx % FALLBACK_MEMBER_RGB.length])
        ),
      };
      dirty = true;
    }

    function build() {
      if (!stage || !cv) return;
      const r = stage.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width;
      H = r.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      const top = 64;
      narrow = W < 640;
      cx = W / 2;
      cy = top + (H - top) * (narrow ? 0.36 : 0.42);
      tw = Math.min(W * (narrow ? 0.84 : 0.7), 860);

      const off = document.createElement('canvas');
      off.width = Math.round(W);
      off.height = Math.round(H);
      const o = off.getContext('2d', { willReadFrequently: true });
      if (!o) return;

      const fam = '"Krona One","Arial Black",sans-serif';
      o.font = `400 100px ${fam}`;
      fs = (100 * tw) / (o.measureText(LABEL).width || 100);
      o.font = `400 ${fs}px ${fam}`;
      o.textAlign = 'center';
      o.textBaseline = 'alphabetic';
      asc = o.measureText(LABEL).actualBoundingBoxAscent || fs * 0.72;
      o.fillText(LABEL, cx, cy + asc / 2);

      const st = Math.max(2, Math.round(fs / 15));
      const y0 = Math.max(0, Math.floor(cy - asc / 2 - 3));
      const y1 = Math.min(off.height, Math.ceil(cy + asc / 2 + 3));
      const x0 = Math.max(0, Math.floor(cx - tw / 2 - 3));
      const x1 = Math.min(off.width, Math.ceil(cx + tw / 2 + 3));

      const img = o.getImageData(0, 0, off.width, off.height).data;
      const A: { x: number; y: number }[] = [];
      for (let y = y0; y < y1; y += st) {
        for (let x = x0; x < x1; x += st) {
          if (img[(y * off.width + x) * 4 + 3] > 140) {
            A.push({
              x: x + (Math.random() - 0.5) * st * 0.5,
              y: y + (Math.random() - 0.5) * st * 0.5,
            });
          }
        }
      }
      A.sort((a, b) => a.x - b.x || a.y - b.y);

      const pctSum = activeMembers.reduce((sum, item) => sum + Math.max(0, item.pct), 0);
      const weights = activeMembers.map((item) =>
        pctSum > 0 ? Math.max(0, item.pct) / pctSum : 1 / activeMembers.length
      );

      const N = A.length;
      let acc = 0;
      const own: { m: number; k: number; n: number }[] = [];
      activeMembers.forEach((_, i) => {
        const n = i === activeMembers.length - 1 ? Math.max(0, N - acc) : Math.round(N * weights[i]);
        for (let k = 0; k < n; k++) own.push({ m: i, k, n: Math.max(1, n) });
        acc += n;
      });

      const R = Math.min(W * (narrow ? 0.34 : 0.3), (H - top) * 0.27, 240);
      const ri = R * 0.66;
      ring = { R, ri, arcs: [] };
      let f = 0;
      const gap = activeMembers.length > 4 ? 0.01 : 0.012;
      weights.forEach((w) => {
        const start = f + gap / 2;
        const end = Math.max(start + 0.01, f + w - gap / 2);
        ring.arcs.push([start, end]);
        f += w;
      });

      const count = activeMembers.length;
      const bh = Math.min(34, H * 0.055);
      const bg = bh * (count > 4 ? 0.62 : 0.9);
      const tot = count * bh + Math.max(0, count - 1) * bg;
      const labW = narrow ? 88 : 168;
      const pctW = narrow ? 48 : 64;
      const barMax = Math.min(W - labW - pctW - (narrow ? 32 : 220), 600);
      const maxPct = Math.max(40, ...activeMembers.map((item) => item.pct));
      const K = barMax / (maxPct / 100);
      const xs = cx - (labW + barMax + pctW) / 2 + labW;
      const ys = cy - tot / 2 - (count > 4 ? 14 : 0);
      bars = { bh, bg, K, xs, ys, labW, pctW };

      pts = A.map((a, i) => {
        const o2 = own[i] || { m: 0, k: 0, n: 1 };
        const mItem = activeMembers[o2.m] || activeMembers[0];
        const [a0, a1] = ring.arcs[o2.m] || [0, 0.25];
        const ff = a0 + ((o2.k + 0.5) / Math.max(1, o2.n)) * (a1 - a0);
        const th = -Math.PI / 2 - ff * Math.PI * 2;
        const rr = ri + Math.random() * (R - ri);
        const bw = (K * Math.max(2, mItem.pct)) / 100;

        return {
          ax: a.x,
          ay: a.y,
          m: o2.m,
          sx: cx + (Math.random() - 0.5) * Math.min(W * 1.1, tw * 1.5),
          sy: cy + (Math.random() - 0.5) * Math.min(160, H * 0.3),
          bx: cx + rr * Math.cos(th),
          by: cy + rr * Math.sin(th),
          cx: xs + ((o2.k + Math.random()) / Math.max(1, o2.n)) * bw,
          cy: ys + o2.m * (bh + bg) + Math.random() * bh,
          d: Math.random(),
          d1: Math.random(),
          w: (Math.random() - 0.5) * 110,
        };
      });

      ready = true;
      dirty = true;
    }

    function calc() {
      if (!hero) return 0;
      const r = hero.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      return clamp(-r.top / total);
    }

    function draw(now: number) {
      if (!ready || !ctx) return;
      ctx.clearRect(0, 0, W, H);
      const intro = reduce ? 1 : clamp((now - t0) / 2400);
      const wText = sm(0.6, 0.95, intro) * (1 - sm(0.06, 0.16, s));
      const wGuide = sm(0.3, 0.9, intro) * (1 - sm(0.04, 0.14, s));
      const wB = sm(0.3, 0.42, s) * (1 - sm(0.52, 0.62, s));
      const wC = sm(0.8, 0.92, s);

      const fg = col.fg;
      const acc = col.acc;
      const gd = col.guide;

      if (wGuide > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(gd, 0.55 * wGuide);
        const gy = [cy - asc / 2, cy + asc / 2];
        const gx = [cx - tw / 2, cx + tw / 2];
        const pr = sm(0.3, 0.9, intro);
        ctx.beginPath();
        gy.forEach((y) => {
          ctx.moveTo(cx - (W / 2) * pr, y);
          ctx.lineTo(cx + (W / 2) * pr, y);
        });
        gx.forEach((x) => {
          ctx.moveTo(x, cy - H * 0.34 * pr);
          ctx.lineTo(x, cy + H * 0.34 * pr);
        });
        ctx.stroke();
      }

      if (wText > 0.01) {
        ctx.font = `400 ${fs}px "Krona One","Arial Black",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = rgba(fg, wText);
        ctx.fillText(LABEL, cx, cy + asc / 2);
      }

      if (wB > 0.01) {
        const { R, ri, arcs } = ring;
        const mid = (R + ri) / 2;
        ctx.lineWidth = R - ri;
        ctx.lineCap = 'butt';
        arcs.forEach((a, i) => {
          const mc = col.m[i % col.m.length];
          ctx.beginPath();
          ctx.strokeStyle = rgba(mc, 0.18 * wB);
          ctx.arc(cx, cy, mid, -Math.PI / 2 - a[0] * Math.PI * 2, -Math.PI / 2 - a[1] * Math.PI * 2, true);
          ctx.stroke();
        });
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `400 ${Math.round(R * 0.19)}px "Krona One",sans-serif`;
        ctx.fillStyle = rgba(fg, wB);
        ctx.fillText(totalActivitiesLabel, cx, cy - 4);
        ctx.font = `500 11px "JetBrains Mono",monospace`;
        ctx.fillStyle = rgba(col.fg3, wB);
        ctx.fillText('HOẠT ĐỘNG', cx, cy + R * 0.17);

        arcs.forEach((a, i) => {
          const mc = col.m[i % col.m.length];
          const mItem = activeMembers[i];
          if (!mItem) return;
          const th = -Math.PI / 2 - a[0] * Math.PI * 2;
          const hx = cx + R * Math.cos(th);
          const hy = cy + R * Math.sin(th);
          ctx.fillStyle = rgba(acc, wB);
          ctx.fillRect(Math.round(hx - 4), Math.round(hy - 4), 8, 8);
          const mt = -Math.PI / 2 - ((a[0] + a[1]) / 2) * Math.PI * 2;
          const lx = cx + (R + 26) * Math.cos(mt);
          const ly = cy + (R + 26) * Math.sin(mt);
          ctx.font = `500 12px "JetBrains Mono",monospace`;
          ctx.fillStyle = rgba(mc, wB);
          ctx.fillText(`${Math.round(mItem.pct)}%`, lx, ly);
        });
      }

      if (wC > 0.01) {
        const { bh, bg, K, xs, ys, labW } = bars;
        ctx.textBaseline = 'middle';
        activeMembers.forEach((mItem, i) => {
          const mc = col.m[i % col.m.length];
          const y = ys + i * (bh + bg);
          const bw = Math.max(8, (K * mItem.pct) / 100);
          ctx.fillStyle = rgba(mc, 0.16 * wC);
          ctx.fillRect(xs, y, bw, bh);
          ctx.textAlign = 'left';
          ctx.font = `500 ${narrow ? 11 : 13}px "Be Vietnam Pro",sans-serif`;
          ctx.fillStyle = rgba(fg, wC);
          ctx.fillText(mItem.name, xs - labW, y + bh / 2 - (narrow ? 0 : 7));
          if (!narrow) {
            ctx.font = `400 11px "JetBrains Mono",monospace`;
            ctx.fillStyle = rgba(col.fg3, wC);
            ctx.fillText(`${mItem.tasks} task · ${mItem.edits} hoạt động`, xs - labW, y + bh / 2 + 9);
          }
          ctx.font = `500 12px "JetBrains Mono",monospace`;
          ctx.fillStyle = rgba(mc, wC);
          ctx.fillText(`${Number(mItem.pct.toFixed(1))}%`, xs + bw + 10, y + bh / 2);
        });
      }

      const ps = narrow ? 2.2 : 2.6;
      const hollow = intro < 1;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const ie = eo(clamp((intro - p.d1 * 0.4) / 0.6));
        let x = p.sx + (p.ax - p.sx) * ie;
        let y = p.sy + (p.ay - p.sy) * ie;
        const eb = eio(clamp((s - 0.08 - p.d * 0.1) / 0.26));
        const ec = eio(clamp((s - 0.56 - p.d * 0.1) / 0.26));
        x = x + (p.bx - x) * eb;
        y = y + (p.by - y) * eb;
        x += Math.sin(Math.PI * eb) * p.w * 0.6;
        x = x + (p.cx - x) * ec;
        y = y + (p.cy - y) * ec;
        y += Math.sin(Math.PI * ec) * p.w * 0.5;

        const mc = col.m[p.m % col.m.length];
        const c: ColorRGB = [
          fg[0] + (mc[0] - fg[0]) * eb,
          fg[1] + (mc[1] - fg[1]) * eb,
          fg[2] + (mc[2] - fg[2]) * eb,
        ];
        if (hollow) {
          ctx.strokeStyle = rgba(col.fg3, 0.9);
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.round(x - ps / 2) + 0.5, Math.round(y - ps / 2) + 0.5, ps, ps);
        } else {
          ctx.fillStyle = rgba(c, 1);
          ctx.fillRect(x - ps / 2, y - ps / 2, ps, ps);
        }
      }
    }

    function loop(now: number) {
      animId = requestAnimationFrame(loop);
      const tgt = calc();
      if (Math.abs(tgt - s) > 0.0003) {
        s += (tgt - s) * 0.16;
        dirty = true;
      } else if (s !== tgt) {
        s = tgt;
        dirty = true;
      }

      if (Math.abs(s - lastUiScroll) > 0.002) {
        lastUiScroll = s;
        setScrollS(s);
      }
      const nextTab: 0 | 1 | 2 = s < 0.25 ? 0 : s < 0.7 ? 1 : 2;
      if (nextTab !== lastTab) {
        lastTab = nextTab;
        setActiveTab(nextTab);
      }

      const introRunning = !reduce && now - t0 < 2450;
      if (dirty || introRunning) {
        draw(now);
        dirty = false;
      }
    }

    getColors();
    build();
    animId = requestAnimationFrame(loop);

    const handleResize = () => build();
    const handleScroll = () => {
      dirty = true;
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', getColors);
    const mo = new MutationObserver(getColors);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      mq.removeEventListener('change', getColors);
      mo.disconnect();
    };
  }, [projectLabel, activeMembers, totalActivitiesLabel]);

  const scrollToPhase = (targetS: number) => {
    if (!heroRef.current) return;
    const r = heroRef.current.getBoundingClientRect();
    const total = Math.max(1, r.height - window.innerHeight);
    window.scrollTo({
      top: window.scrollY + r.top + total * targetS,
      behavior: 'smooth',
    });
  };

  const a = Math.max(0, Math.min(1, 1 - sm(0.04, 0.14, scrollS)));
  const b = Math.max(0, Math.min(1, sm(0.3, 0.4, scrollS) - sm(0.5, 0.6, scrollS)));
  const c = Math.max(0, Math.min(1, sm(0.82, 0.92, scrollS)));

  return (
    <div className="hero" id="hero" ref={heroRef}>
      <div
        className="stage"
        id="stage"
        ref={stageRef}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          id="cv"
          aria-label="Biểu đồ điểm neo chuyển động theo thanh cuộn: tên dự án, tỷ lệ đóng góp, bằng chứng từng người"
          role="img"
        />

        <div className="hero-top pad">
          <div className="crumb">
            <span className="eyebrow">Dashboard</span>
            <span className="chip">{sprintLabel || 'Sprint hiện tại'}</span>
            <span className="chip acc">{courseName || 'Dữ liệu trực tiếp'}</span>
          </div>
        </div>

        <div className="caps" style={{ bottom: 'calc(var(--nav-b, 0px) + 11.5vh)', height: '132px' }}>
          <div
            className="cap"
            id="capA"
            style={{
              opacity: a,
              transform: `translateY(${(1 - a) * 10}px)`,
              pointerEvents: a > 0.5 ? 'auto' : 'none',
            }}
          >
            <span className="eyebrow">
              DỰ ÁN ĐỒ ÁN • {(courseName || projectLabel).toUpperCase()}
            </span>

            <h2
              style={{
                fontSize: 'clamp(18px, 2.1vw, 25px)',
                fontWeight: 600,
                maxWidth: '56ch',
                margin: '2px 0',
              }}
            >
              <MarqueeText
                text={
                  description ||
                  'Ai làm gì, bao nhiêu, khi nào — minh bạch trên từng Sprint.'
                }
                maxLen={68}
              />
            </h2>

            <p className="hero-invite-code" style={{ margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span className="hero-invite-label" style={{ color: 'var(--accent)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Key size={14} /> Mã mời:
              </span>
              <code
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 600,
                  fontSize: '14px',
                  letterSpacing: '0.18em',
                  color: 'var(--accent)',
                  background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)',
                }}
              >
                {inviteCode || (currentTeam ? `FS${(currentTeam.name + '12345678').slice(0, 10).toUpperCase()}` : 'FS3CB46178AB')}
              </code>
              <span className="hero-invite-hint" style={{ color: 'var(--fg3)', fontSize: '12px' }}>
                (Chia sẻ mã này cho bạn bè để tham gia nhóm)
              </span>
            </p>
          </div>

          <div
            className="cap"
            id="capB"
            style={{
              opacity: b,
              transform: `translateY(${(1 - b) * 10}px)`,
              pointerEvents: b > 0.5 ? 'auto' : 'none',
            }}
          >
            <span className="eyebrow">Tỷ lệ đóng góp</span>
            <h2>{totalActivitiesLabel} hoạt động chia cho {activeMembers.length} thành viên</h2>
            <p>Tỷ lệ tính từ task hoàn thành, điểm ngoài board, phối hợp và đánh giá chéo.</p>
          </div>

          <div
            className="cap"
            id="capC"
            style={{
              opacity: c,
              transform: `translateY(${(1 - c) * 10}px)`,
              pointerEvents: c > 0.5 ? 'auto' : 'none',
            }}
          >
            <span className="eyebrow">Bằng chứng truy vết</span>
            <h2>Mỗi thanh có thể mở ra từng hành động</h2>
            <p>Cuộn tiếp để xem bảng tỷ lệ từng người, hoạt động mới nhất và cảnh báo sớm.</p>
          </div>
        </div>

        <div className="pager" id="pager">
          <button
            type="button"
            className={activeTab === 0 ? 'on' : ''}
            onClick={() => scrollToPhase(0)}
          >
            <span>Tổng quan</span>
            <i />
          </button>
          <button
            type="button"
            className={activeTab === 1 ? 'on' : ''}
            onClick={() => scrollToPhase(0.46)}
          >
            <span>Tỷ lệ</span>
            <i />
          </button>
          <button
            type="button"
            className={activeTab === 2 ? 'on' : ''}
            onClick={() => scrollToPhase(0.95)}
          >
            <span>Bằng chứng</span>
            <i />
          </button>
        </div>

        <div
          className="cue"
          id="cue"
          style={{ opacity: Math.max(0, 1 - sm(0, 0.05, scrollS)) }}
        >
          <span>Cuộn xuống</span>
          <i />
        </div>
      </div>
    </div>
  );
};
