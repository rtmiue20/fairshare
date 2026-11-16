import React, { useEffect, useRef, useState, useMemo } from 'react';
import { NetworkNodeDto, NetworkLinkDto } from '../../types/contribution';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Network,
  Filter,
  Sparkles,
  Plus,
  Send,
  X,
  ArrowUpDown,
} from 'lucide-react';

interface CosmicNetworkCanvasProps {
  nodes: NetworkNodeDto[];
  links: NetworkLinkDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNodeDto) => void;
  activeFilter: string;
  onSelectFilter?: (filter: string) => void;
  onOpenImpactModal?: () => void;
  focusedUserName?: string;
  finalPct?: number;
  sprintName?: string;
  viewMode?: 'overview' | 'detail';
  onSwitchViewMode?: (mode: 'overview' | 'detail') => void;
  sprints?: Array<{ id: number; name: string; isCurrent?: boolean; status?: string }>;
  selectedSprintId?: number | null;
  onSelectSprint?: (sprintId: number) => void;
  compositeScore?: number;
  distanceToCenter?: number;
  availabilityFactor?: number;
  members?: Array<{ id: number; fullName: string; email: string }>;
  selectedUserId?: number | null;
  onSelectUser?: (userId: number) => void;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
}

interface ConstellationHub {
  id: string;
  label: string;
  category: string;
  percentage: number;
  badge: string;
  color: string;
  angle: number;
  distance: number;
  satellites: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    angleOffset: number;
    distOffset: number;
  }>;
}

export const CosmicNetworkCanvas: React.FC<CosmicNetworkCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  activeFilter,
  onSelectFilter,
  onOpenImpactModal,
  focusedUserName = 'Minh Trieu',
  finalPct = 0.35,
  sprintName = 'Sprint 3: Hoàn thiện MVP & UI Chấm chéo',
  viewMode = 'overview',
  onSwitchViewMode,
  sprints = [
    { id: 1, name: 'Sprint 1', isCurrent: false, status: 'COMPLETED' },
    { id: 2, name: 'Sprint 2', isCurrent: false, status: 'COMPLETED' },
    { id: 3, name: 'Sprint 3', isCurrent: true, status: 'ACTIVE' },
    { id: 4, name: 'Sprint 4', isCurrent: false, status: 'PLANNED' },
    { id: 5, name: 'Sprint 5', isCurrent: false, status: 'PLANNED' },
  ],
  selectedSprintId = 3,
  onSelectSprint,
  compositeScore = 99.1,
  distanceToCenter = 2.52,
  availabilityFactor = 1.0,
  members = [
    { id: 1, fullName: 'Minh Trieu', email: 'trieu@kingsha.com' },
    { id: 2, fullName: 'Ngọc Anh', email: 'anh@kingsha.com' },
    { id: 3, fullName: 'Quốc Bảo', email: 'bao@kingsha.com' },
    { id: 4, fullName: 'Thu Hà', email: 'ha@kingsha.com' },
    { id: 5, fullName: 'Đức Long', email: 'long@kingsha.com' },
  ],
  selectedUserId = 1,
  onSelectUser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Pan and Zoom Transform
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });

  // AI & Filter popup toggles
  const [showAiCard, setShowAiCard] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  // Animation Refs
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);

  // Initialize Cosmic Twinkling Stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * 3000 - 1500,
        y: Math.random() * 2000 - 1000,
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.75 + 0.25,
        speed: Math.random() * 0.03 + 0.008,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Hub definitions mapped to project 4-tier model & members (Constellation layout)
  const constellationHubs = useMemo<ConstellationHub[]>(() => {
    // 1. Nhận diện vai trò & profile của thành viên được quan sát
    const nameLower = (focusedUserName || '').toLowerCase();
    const isFrontend = nameLower.includes('trang') || nameLower.includes('frontend') || selectedUserId === 110;
    const isLeader = nameLower.includes('nam') || nameLower.includes('trưởng') || nameLower.includes('leader') || selectedUserId === 109;
    const isBackend = nameLower.includes('bảo') || nameLower.includes('backend') || selectedUserId === 111;
    const isDevOps = nameLower.includes('đức') || nameLower.includes('devops') || selectedUserId === 112;
    const isQA = nameLower.includes('vy') || nameLower.includes('qa') || selectedUserId === 113;

    const pctVal = Math.round((finalPct || 0.22) * 100);
    const availVal = Math.round((availabilityFactor || 1.0) * 100);

    // 2. Dữ liệu số lượng task / Story Point / Đúng hạn thích ứng với từng thành viên đồ án
    const d1TaskCount = isLeader ? 10 : isFrontend ? 7 : isQA ? 8 : isBackend ? 6 : 5;
    const d1SpCount = isLeader ? '18.0 SP' : isFrontend ? '12.5 SP' : isQA ? '10.0 SP' : isBackend ? '11.0 SP' : '9.5 SP';
    const d1ManualCount = isLeader ? '+5.0 SP' : isFrontend ? '+3.0 SP' : isBackend ? '+2.5 SP' : '+2.0 SP';
    const d2OnTimePct = isLeader ? 95 : isFrontend ? 88 : isQA ? 92 : isBackend ? 82 : 90;
    const d2Latency = isBackend ? '0.5 ngày' : '0.2 ngày';
    const d2Rework = isBackend ? 'Rework 8%' : 'Rework 0%';
    const d3Reviews = isLeader ? '12 Lượt' : isFrontend ? '5 Lượt' : isQA ? '8 Lượt' : '4 Lượt';
    const d3Comments = isLeader ? '28 Thảo luận' : isFrontend ? '16 Thảo luận' : isQA ? '22 Thảo luận' : '12 Thảo luận';
    const d4PeerScore = isLeader ? '9.6 / 10' : isFrontend ? '8.8 / 10' : isQA ? '9.0 / 10' : '8.5 / 10';
    const d4ReviewCount = '4/4 Lượt';

    return [
      {
        id: 'hub-d1-tasks',
        label: 'Thẻ hoàn thành (Tasks)',
        category: 'D1',
        percentage: Math.min(100, Math.round(pctVal * 1.5)),
        badge: `${d1TaskCount} Thẻ`,
        color: '#10b981', // green
        angle: -2.35,
        distance: 280,
        satellites: isFrontend
          ? [
              { id: 'sat-1', label: 'Giao diện Chấm chéo', count: 5, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Tích hợp API Axios', count: 4, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Form khai báo thủ công', count: 3, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ]
          : isLeader
          ? [
              { id: 'sat-1', label: 'Kiến trúc Spring Boot 3', count: 8, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Cấu hình Docker Compose', count: 5, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Tối ưu Stored Procedure', count: 5, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ]
          : isBackend
          ? [
              { id: 'sat-1', label: 'RESTful API Swagger', count: 5, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Migration Flyway V21-V23', count: 3, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Mô hình 4 tầng scoring', count: 3, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ]
          : isQA
          ? [
              { id: 'sat-1', label: 'Đóng defect DEF-16/17/22', count: 4, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Test scenarios UAT', count: 3, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Kiểm thử hồi quy API', count: 3, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ]
          : isDevOps
          ? [
              { id: 'sat-1', label: 'Pipeline GitHub Actions', count: 4, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Deploy Docker Staging', count: 3, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Cấu hình Testcontainers', count: 3, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ]
          : [
              { id: 'sat-1', label: 'Thực thi nhiệm vụ Sprint', count: 4, color: '#38bdf8', angleOffset: -0.28, distOffset: 70 },
              { id: 'sat-2', label: 'Cập nhật tiến độ Board', count: 3, color: '#34d399', angleOffset: 0.25, distOffset: 65 },
              { id: 'sat-3', label: 'Tương tác thảo luận nhóm', count: 3, color: '#a78bfa', angleOffset: 0.6, distOffset: 85 },
            ],
      },
      {
        id: 'hub-d1-sp',
        label: 'Story Points & Trọng số',
        category: 'D1',
        percentage: Math.min(100, Math.round(pctVal * 2.2)),
        badge: d1SpCount,
        color: '#34d399', // bright emerald
        angle: -2.9,
        distance: 290,
        satellites: [
          { id: 'sat-4', label: 'Độ khó thẻ SP', count: 5, color: '#34d399', angleOffset: -0.3, distOffset: 65 },
          { id: 'sat-5', label: 'Checklist item hoàn thành', count: 18, color: '#c084fc', angleOffset: 0.35, distOffset: 75 },
        ],
      },
      {
        id: 'hub-d1-manual',
        label: 'Đóng góp ngoài Board',
        category: 'D1',
        percentage: Math.min(100, Math.round(pctVal * 1.2)),
        badge: d1ManualCount,
        color: '#059669', // deep teal
        angle: -1.45,
        distance: 270,
        satellites: isFrontend
          ? [
              { id: 'sat-6', label: 'Figma Design System', count: 24, color: '#38bdf8', angleOffset: -0.35, distOffset: 65 },
              { id: 'sat-7', label: 'Tài liệu UX Guidelines', count: 12, color: '#a78bfa', angleOffset: 0.3, distOffset: 60 },
              { id: 'sat-8', label: 'Prototype tương tác', count: 16, color: '#34d399', angleOffset: 0.7, distOffset: 75 },
            ]
          : [
              { id: 'sat-6', label: 'Đặc tả yêu cầu SRS', count: 18, color: '#38bdf8', angleOffset: -0.35, distOffset: 65 },
              { id: 'sat-7', label: 'Nghiên cứu kiến trúc', count: 10, color: '#a78bfa', angleOffset: 0.3, distOffset: 60 },
              { id: 'sat-8', label: 'Khai báo duyệt hợp lệ', count: 14, color: '#34d399', angleOffset: 0.7, distOffset: 75 },
            ],
      },
      {
        id: 'hub-d2-ontime',
        label: 'Tỷ lệ đúng hạn bàn giao',
        category: 'D2',
        percentage: d2OnTimePct,
        badge: `${d2OnTimePct}%`,
        color: '#06b6d4', // cyan
        angle: -0.92,
        distance: 310,
        satellites: [
          { id: 'sat-9', label: 'Giao đúng Deadline', count: d1TaskCount, color: '#fbbf24', angleOffset: 0.2, distOffset: 60 },
          { id: 'sat-10', label: '0 Thẻ trễ hạn nghiêm trọng', count: 0, color: '#34d399', angleOffset: 0.5, distOffset: 70 },
        ],
      },
      {
        id: 'hub-d2-latency',
        label: 'Độ trễ trung vị (Lead Time)',
        category: 'D2',
        percentage: 92,
        badge: d2Latency,
        color: '#22d3ee', // sky blue
        angle: -0.48,
        distance: 360,
        satellites: [
          { id: 'sat-11', label: 'Độ trễ trung vị (ngày)', count: 1, color: '#38bdf8', angleOffset: -0.25, distOffset: 60 },
          { id: 'sat-12', label: 'Chuẩn hóa Robust MAD', count: 12, color: '#c084fc', angleOffset: 0.25, distOffset: 65 },
          { id: 'sat-13', label: 'Cắt biên Z-score [-3, 3]', count: 3, color: '#34d399', angleOffset: 0.6, distOffset: 70 },
        ],
      },
      {
        id: 'hub-d2-rework',
        label: 'Kiểm thử & Rework',
        category: 'D2',
        percentage: 96,
        badge: d2Rework,
        color: '#0891b2', // teal cyan
        angle: -0.15,
        distance: 400,
        satellites: [
          { id: 'sat-14', label: 'Số lần mở lại thẻ (0)', count: 0, color: '#34d399', angleOffset: -0.28, distOffset: 65 },
          { id: 'sat-15', label: 'Pass kiểm thử QA/CI', count: 24, color: '#f472b6', angleOffset: 0.32, distOffset: 70 },
        ],
      },
      {
        id: 'hub-d3-reviews',
        label: 'Review chéo đồng đội',
        category: 'D3',
        percentage: Math.min(100, Math.round(pctVal * 1.4)),
        badge: d3Reviews,
        color: '#8b5cf6', // purple violet
        angle: 0.35,
        distance: 270,
        satellites: [
          { id: 'sat-16', label: 'Review Pull Request Git', count: isLeader ? 12 : 5, color: '#c084fc', angleOffset: -0.3, distOffset: 55 },
          { id: 'sat-17', label: 'Duyệt thẻ Task Board', count: 8, color: '#38bdf8', angleOffset: 0.4, distOffset: 60 },
        ],
      },
      {
        id: 'hub-d3-collab',
        label: 'Thảo luận & Hỗ trợ (@Mentions)',
        category: 'D3',
        percentage: Math.min(100, Math.round(pctVal * 1.6)),
        badge: d3Comments,
        color: '#a78bfa', // soft purple
        angle: 0.75,
        distance: 330,
        satellites: [
          { id: 'sat-18', label: 'Bình luận xây dựng', count: isFrontend ? 16 : 22, color: '#38bdf8', angleOffset: -0.25, distOffset: 55 },
          { id: 'sat-19', label: 'Được @mention hỗ trợ', count: 7, color: '#34d399', angleOffset: 0.3, distOffset: 60 },
        ],
      },
      {
        id: 'hub-d4-peer',
        label: 'Điểm chấm chéo ẩn danh',
        category: 'D4',
        percentage: Math.min(100, Math.round(parseFloat(d4PeerScore) * 10)),
        badge: d4PeerScore,
        color: '#ec4899', // pink
        angle: 1.15,
        distance: 390,
        satellites: [
          { id: 'sat-20', label: 'Thái độ hợp tác (4.9/5)', count: 5, color: '#34d399', angleOffset: -0.2, distOffset: 60 },
          { id: 'sat-21', label: 'Chất lượng bàn giao (4.8/5)', count: 5, color: '#fbbf24', angleOffset: 0.35, distOffset: 70 },
        ],
      },
      {
        id: 'hub-d4-valid',
        label: 'Lượt chấm hợp lệ (≥3)',
        category: 'D4',
        percentage: 100,
        badge: d4ReviewCount,
        color: '#f472b6', // soft pink
        angle: 1.62,
        distance: 270,
        satellites: [
          { id: 'sat-22', label: 'Ẩn danh chống thiên vị', count: 4, color: '#c084fc', angleOffset: -0.3, distOffset: 60 },
          { id: 'sat-23', label: 'Độ đồng thuận nhóm cao', count: 9, color: '#38bdf8', angleOffset: 0.3, distOffset: 65 },
        ],
      },
      {
        id: 'hub-impediments',
        label: 'Rào cản ngoại cảnh & Khả dụng',
        category: 'IMPEDIMENT',
        percentage: availVal,
        badge: availVal === 100 ? 'a_i = 1.00' : 'a_i = 0.90',
        color: '#f59e0b', // amber gold
        angle: 2.35,
        distance: 280,
        satellites: [
          { id: 'sat-24', label: 'Bù khả dụng D\' hợp lệ', count: 1, color: '#38bdf8', angleOffset: -0.35, distOffset: 60 },
          { id: 'sat-25', label: isBackend ? 'Trùng lịch thi học phần' : 'Không có rào cản cản trở', count: isBackend ? 2 : 0, color: '#34d399', angleOffset: 0.3, distOffset: 65 },
        ],
      },
    ];
  }, [focusedUserName, selectedUserId, finalPct, availabilityFactor]);

  // Filter hubs according to activeFilter
  const filteredHubs = useMemo(() => {
    if (activeFilter === 'ALL') return constellationHubs;
    return constellationHubs.filter((h) => h.category === activeFilter);
  }, [constellationHubs, activeFilter]);

  // Handle Canvas Zoom
  const handleZoom = (dir: 'in' | 'out' | 'fit') => {
    if (dir === 'fit') {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    const factor = dir === 'in' ? 1.2 : 0.83;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.8, prev.scale * factor)),
    }));
  };

  // Helper: Draw round rectangle
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      timeRef.current += 0.015;
      const t = timeRef.current;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Deep space cosmic gradient background matching Image 1
      const bgGrad = ctx.createRadialGradient(
        centerX + transform.x,
        centerY + transform.y,
        120,
        centerX + transform.x,
        centerY + transform.y,
        Math.max(width, height) * 0.9
      );
      bgGrad.addColorStop(0, '#0c222c'); // deep dark cyan/teal core
      bgGrad.addColorStop(0.35, '#07161e');
      bgGrad.addColorStop(0.7, '#040d13');
      bgGrad.addColorStop(1, '#020609');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft ambient celestial glow nebulae
      const neb1 = ctx.createRadialGradient(
        centerX - 120 + transform.x,
        centerY - 80 + transform.y,
        30,
        centerX - 120 + transform.x,
        centerY - 80 + transform.y,
        480
      );
      neb1.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
      neb1.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, width, height);

      // World Space Transformation
      ctx.save();
      ctx.translate(centerX + transform.x, centerY + transform.y);
      ctx.scale(transform.scale, transform.scale);

      // 1. Twinkling Background Stardust
      starsRef.current.forEach((st) => {
        const flicker = Math.sin(t * 1.5 + st.phase) * 0.35 + 0.65;
        ctx.fillStyle = `rgba(190, 240, 255, ${st.alpha * flicker})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Inter-hub Constellation Curved Mesh Lines (Collaboration Network)
      ctx.save();
      ctx.setLineDash([3, 7]);
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.16)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < filteredHubs.length; i++) {
        const h1 = filteredHubs[i];
        const h2 = filteredHubs[(i + 1) % filteredHubs.length];
        const x1 = Math.cos(h1.angle) * h1.distance;
        const y1 = Math.sin(h1.angle) * h1.distance;
        const x2 = Math.cos(h2.angle) * h2.distance;
        const y2 = Math.sin(h2.angle) * h2.distance;
        const midX = (x1 + x2) * 0.48;
        const midY = (y1 + y2) * 0.48;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Volumetric Radiant Light Beams (Center Core -> Every Major Hub)
      filteredHubs.forEach((hub, hIdx) => {
        const hx = Math.cos(hub.angle) * hub.distance;
        const hy = Math.sin(hub.angle) * hub.distance;
        const beamL = Math.hypot(hx, hy);
        const nx = -hy / beamL;
        const ny = hx / beamL;
        const baseW = 18; // wide near core
        const endW = 4; // tapered near hub

        // Radiant Volumetric Light Shaft (Polygon Beam)
        const beamGrad = ctx.createLinearGradient(0, 0, hx, hy);
        beamGrad.addColorStop(0, 'rgba(255, 226, 170, 0.75)');
        beamGrad.addColorStop(0.35, 'rgba(245, 194, 100, 0.45)');
        beamGrad.addColorStop(0.8, 'rgba(244, 114, 182, 0.25)');
        beamGrad.addColorStop(1, 'rgba(167, 139, 250, 0)');

        ctx.save();
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(nx * (baseW / 2), ny * (baseW / 2));
        ctx.lineTo(hx + nx * (endW / 2), hy + ny * (endW / 2));
        ctx.lineTo(hx - nx * (endW / 2), hy - ny * (endW / 2));
        ctx.lineTo(-nx * (baseW / 2), -ny * (baseW / 2));
        ctx.closePath();
        ctx.fill();

        // Central High-Intensity Laser Core Line
        ctx.strokeStyle = 'rgba(255, 235, 180, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Animated Energy Particle Packets traveling along the beam
        for (let p = 0; p < 2; p++) {
          const u = (t * 0.12 + p * 0.5 + hIdx * 0.15) % 1;
          const px = hx * u;
          const py = hy * u;
          const pSize = 3.5 * (1 - u * 0.3);

          const sparkGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 2.5);
          sparkGrad.addColorStop(0, '#ffffff');
          sparkGrad.addColorStop(0.4, 'rgba(255, 230, 160, 0.9)');
          sparkGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');

          ctx.fillStyle = sparkGrad;
          ctx.beginPath();
          ctx.arc(px, py, pSize * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Satellite Leaf Nodes Clustered Around Each Hub
      filteredHubs.forEach((hub) => {
        const hx = Math.cos(hub.angle) * hub.distance;
        const hy = Math.sin(hub.angle) * hub.distance;

        hub.satellites.forEach((sat) => {
          const satAngle = hub.angle + sat.angleOffset;
          const satDist = hub.distance + sat.distOffset;
          const sx = Math.cos(satAngle) * satDist;
          const sy = Math.sin(satAngle) * satDist;

          // Connector line from Hub to Satellite
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          // Satellite Glowing Aura
          const satGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 18);
          satGlow.addColorStop(0, `${sat.color}88`);
          satGlow.addColorStop(1, `${sat.color}00`);
          ctx.fillStyle = satGlow;
          ctx.beginPath();
          ctx.arc(sx, sy, 18, 0, Math.PI * 2);
          ctx.fill();

          // Satellite Node Sphere
          const satSphere = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 7);
          satSphere.addColorStop(0, '#ffffff');
          satSphere.addColorStop(0.4, sat.color);
          satSphere.addColorStop(1, `${sat.color}cc`);
          ctx.fillStyle = satSphere;
          ctx.beginPath();
          ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
          ctx.fill();

          // Number Badge Pill next to satellite (e.g. 11, 39, 27)
          const badgeText = String(sat.count);
          ctx.font = 'bold 9px monospace';
          const textW = ctx.measureText(badgeText).width;
          const bw = textW + 10;
          const bh = 14;
          const bx = sx + 9;
          const by = sy - 7;

          ctx.fillStyle = 'rgba(6, 20, 28, 0.88)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 0.8;
          drawRoundRect(ctx, bx, by, bw, bh, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, bx + bw / 2, by + bh / 2 + 0.5);
        });
      });

      // 5. Major Constellation Hubs (Planetary 3D Shaded Orbs)
      filteredHubs.forEach((hub) => {
        const hx = Math.cos(hub.angle) * hub.distance;
        const hy = Math.sin(hub.angle) * hub.distance;
        const hr = 24; // hub radius
        const isSelected = selectedNodeId && (hub.id.includes(selectedNodeId) || hub.category === selectedNodeId);

        // Outer Aura Glow
        const auraGrad = ctx.createRadialGradient(hx, hy, hr * 0.4, hx, hy, hr * (isSelected ? 3.4 : 2.8));
        auraGrad.addColorStop(0, `${hub.color}${isSelected ? '88' : '55'}`);
        auraGrad.addColorStop(1, `${hub.color}00`);
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, hr * (isSelected ? 3.4 : 2.8), 0, Math.PI * 2);
        ctx.fill();

        // Solid Outer Ring
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(215, 195, 255, 0.75)';
        ctx.lineWidth = isSelected ? 2.4 : 1.6;
        ctx.beginPath();
        ctx.arc(hx, hy, hr + 7, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating Dashed Outer Orbit Ring
        ctx.save();
        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(215, 195, 255, 0.4)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -t * 12;
        ctx.beginPath();
        ctx.arc(hx, hy, hr + 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 3D Shaded Sphere Orb (Specular highlight top-left, rich mid-tone, dark shade bottom-right)
        const sphereGrad = ctx.createRadialGradient(
          hx - hr * 0.35,
          hy - hr * 0.35,
          1,
          hx,
          hy,
          hr * 1.05
        );
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, hub.color);
        sphereGrad.addColorStop(0.85, '#6b21a8');
        sphereGrad.addColorStop(1, '#2e1065');

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fill();

        // Percentage Badge Floating Under Hub (e.g. 31%, 38%)
        const badgeW = 34;
        const badgeH = 16;
        const badgeX = hx - badgeW / 2;
        const badgeY = hy + hr + 4;

        ctx.fillStyle = 'rgba(8, 22, 32, 0.88)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.8;
        drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hub.badge, hx, badgeY + badgeH / 2 + 0.5);

        // Hub Title Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(hub.label, hx + hr + 8, hy + 4);
      });

      // 6. Central Radiant Core ("Constitution" / "FairShare Core")
      const coreR = 48;

      // Volumetric Core Radial Glow
      const coreAura = ctx.createRadialGradient(0, 0, coreR * 0.5, 0, 0, coreR * 3.6);
      coreAura.addColorStop(0, 'rgba(255, 214, 130, 0.6)');
      coreAura.addColorStop(0.4, 'rgba(245, 180, 80, 0.2)');
      coreAura.addColorStop(1, 'rgba(245, 180, 80, 0)');
      ctx.fillStyle = coreAura;
      ctx.beginPath();
      ctx.arc(0, 0, coreR * 3.6, 0, Math.PI * 2);
      ctx.fill();

      // Rotating 56 Fiery Solar Flare Spikes
      ctx.save();
      ctx.rotate(t * 0.08);
      for (let i = 0; i < 56; i++) {
        const spikeAng = (i / 56) * Math.PI * 2;
        const wave = Math.sin(i * 2.3 + t * 0.5) * Math.sin(i * 0.8 - t * 0.7);
        const spikeLen = coreR * (1.25 + 0.35 * wave);

        ctx.strokeStyle = 'rgba(255, 218, 140, 0.7)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(spikeAng) * (coreR * 1.02), Math.sin(spikeAng) * (coreR * 1.02));
        ctx.lineTo(Math.cos(spikeAng) * spikeLen, Math.sin(spikeAng) * spikeLen);
        ctx.stroke();
      }
      ctx.restore();

      // 3D Shaded Sun Core Orb
      const sunGrad = ctx.createRadialGradient(
        -coreR * 0.35,
        -coreR * 0.35,
        2,
        0,
        0,
        coreR
      );
      sunGrad.addColorStop(0, '#fffdf0');
      sunGrad.addColorStop(0.35, '#f7c768');
      sunGrad.addColorStop(0.8, '#b9701f');
      sunGrad.addColorStop(1, '#5b320d');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Outer golden corona rim
      ctx.strokeStyle = 'rgba(255, 235, 180, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, coreR + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Central Constitution Core Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(focusedUserName ? `${focusedUserName}` : 'Constitution', 0, coreR + 24);

      // Subtitle pill under core
      const coreSubW = 160;
      const coreSubH = 18;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      drawRoundRect(ctx, -coreSubW / 2, coreR + 34, coreSubW, coreSubH, 5);
      ctx.fill();

      ctx.fillStyle = '#fce7b8';
      ctx.font = '500 10.5px sans-serif';
      ctx.fillText(sprintName ? sprintName.split(':')[0] : 'FairShare Core · Sprint 3', 0, coreR + 44);

      ctx.restore(); // end world scale/translate

      // 7. Left Vertical Timeline Rail & Audio Soundwave Edge (Overlay on Canvas)
      const railX = 48;
      const waveStartX = 18;

      // Subtle Vertical Audio Soundwave / Frequency Texture along the left border
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 200, 220, 0.22)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      const waveSteps = 60;
      for (let s = 0; s <= waveSteps; s++) {
        const sy = (s / waveSteps) * height;
        const amp = Math.sin(s * 0.8 + t * 2) * 5 + Math.sin(s * 2.2 - t * 1.5) * 3;
        const wx = waveStartX + amp;
        if (s === 0) ctx.moveTo(wx, sy);
        else ctx.lineTo(wx, sy);
      }
      ctx.stroke();

      // Vertical Sprint Years / Sprint Capsules
      const railItems = sprints && sprints.length > 0
        ? sprints.map((s) => {
            const shortMatch = s.name.match(/Sprint\s*\d+/i);
            const shortLabel = shortMatch ? shortMatch[0] : s.name.split(/[-:–]/)[0].trim();
            return {
              id: s.id,
              label: shortLabel,
              isCurrent: s.id === selectedSprintId || s.isCurrent,
            };
          })
        : [
            { id: 1, label: 'Sprint 1', isCurrent: false },
            { id: 2, label: 'Sprint 2', isCurrent: false },
            { id: 3, label: 'Sprint 3', isCurrent: true },
            { id: 4, label: 'Sprint 4', isCurrent: false },
            { id: 5, label: 'Sprint 5', isCurrent: false },
          ];

      const railStartY = height * 0.12;
      const railSpacing = (height * 0.68) / Math.max(1, railItems.length - 1);

      railItems.forEach((sp, idx) => {
        const sy = railStartY + idx * railSpacing;

        if (sp.isCurrent) {
          // Highlighted Illuminated Rounded Capsule (like 2020 in Image 1)
          const capW = 76;
          const capH = 30;
          const capX = railX - 8;
          const capY = sy - capH / 2;

          ctx.fillStyle = 'rgba(15, 30, 40, 0.9)';
          ctx.strokeStyle = 'rgba(245, 194, 100, 0.8)';
          ctx.lineWidth = 1.8;
          drawRoundRect(ctx, capX, capY, capW, capH, 15);
          ctx.fill();
          ctx.stroke();

          // Golden glow
          ctx.shadowColor = 'rgba(245, 194, 100, 0.6)';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Capsule text
          ctx.fillStyle = '#ffdf99';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sp.label, capX + capW / 2, sy);

          // Connector line from active capsule toward constellation
          ctx.strokeStyle = 'rgba(245, 194, 100, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(capX + capW, sy);
          ctx.lineTo(capX + capW + 22, sy);
          ctx.stroke();
        } else {
          // Normal Sprint Year Label
          ctx.fillStyle = 'rgba(157, 181, 189, 0.45)';
          ctx.font = '500 11.5px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(sp.label, railX, sy);
        }
      });
      ctx.restore();

      ctx.restore(); // end frame restore

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [transform, filteredHubs]);

  // Pan canvas on drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: transform.x,
      camY: transform.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setTransform((prev) => ({
      ...prev,
      x: dragStartRef.current.camX + dx,
      y: dragStartRef.current.camY + dy,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.8, prev.scale * factor)),
    }));
  };

  // Canvas click to select node or switch to detail
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Check hit on sprint rail
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    if (screenX >= 20 && screenX <= 130 && onSelectSprint && sprints && sprints.length > 0) {
      const railStartY = rect.height * 0.12;
      const railSpacing = (rect.height * 0.68) / Math.max(1, sprints.length - 1);
      const clickedIdx = Math.round((screenY - railStartY) / railSpacing);
      if (
        clickedIdx >= 0 &&
        clickedIdx < sprints.length &&
        Math.abs(screenY - (railStartY + clickedIdx * railSpacing)) < 24
      ) {
        onSelectSprint(sprints[clickedIdx].id);
        return;
      }
    }

    const px = e.clientX - rect.left - rect.width / 2 - transform.x;
    const py = e.clientY - rect.top - rect.height / 2 - transform.y;
    const scaledX = px / transform.scale;
    const scaledY = py / transform.scale;

    // Check hit on any hub
    for (const hub of filteredHubs) {
      const hx = Math.cos(hub.angle) * hub.distance;
      const hy = Math.sin(hub.angle) * hub.distance;
      if (Math.hypot(scaledX - hx, scaledY - hy) < 32) {
        const matched = nodes.find((n) => n.id.includes(hub.category.toLowerCase())) || nodes[0];
        if (matched) {
          onSelectNode(matched);
        }
        if (onSwitchViewMode) {
          onSwitchViewMode('detail');
        }
        return;
      }
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    const q = questionInput.toLowerCase();
    const currentName = focusedUserName || 'Thành viên';
    const pctStr = `${((finalPct || 0.22) * 100).toFixed(1)}%`;
    const scoreStr = `${(compositeScore || 33.1).toFixed(1)}/100`;

    if (q.includes('ai') || q.includes('hoạt động') || q.includes('chậm') || q.includes('ít')) {
      setAiAnswer('Lê Quốc Bảo (Backend) có 2 ngày bị chậm tiến độ do trùng lịch thi học phần. Hệ thống đã kích hoạt hệ số bù khả dụng a_i = 0.90 để bảo vệ quyền lợi thành viên.');
    } else if (q.includes('cao nhất') || q.includes('nhiều nhất') || q.includes('top') || q.includes('dẫn đầu')) {
      setAiAnswer('Nguyễn Hoàng Nam (Trưởng nhóm) đang dẫn đầu với p = 39.0% (C_i = 65.6), theo sau là Trần Thu Trang 22.0% (C_i = 33.1).');
    } else if (q.includes('rào cản') || q.includes('bù') || q.includes('khả dụng')) {
      setAiAnswer(`Thành viên ${currentName} có hệ số khả dụng a_i = ${(availabilityFactor * 100).toFixed(0)}%. Đã kích hoạt công thức bù một phần D' = D * (1 + 0.5(1 - a_i)).`);
    } else {
      setAiAnswer(`Đóng góp Sprint hiện tại: ${currentName} đạt tỷ lệ p_i = ${pctStr} (Điểm tổng hợp C_i = ${scoreStr}), khoảng cách Mahalanobis tới tâm nhóm δ_i = ${(distanceToCenter || 2.20).toFixed(2)}.`);
    }
    setQuestionInput('');
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden select-none bg-[#020609]">
      {/* 1. Full Screen Interactive Cosmic Canvas */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      />

      {/* 2. Top-Center Floating Toolbar Pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-[#08161e]/85 backdrop-blur-xl border border-cyan-500/25 shadow-2xl text-slate-300">
        {/* View Mode Switcher */}
        <button
          type="button"
          title="Sơ đồ tổng quan (Overview Galaxy)"
          onClick={() => onSwitchViewMode?.('overview')}
          className={`p-2 rounded-xl transition ${
            viewMode === 'overview'
              ? 'bg-amber-400/20 text-amber-300 shadow-[0_0_15px_rgba(245,194,100,0.3)]'
              : 'hover:bg-white/10 text-slate-400'
          }`}
        >
          <Network className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Chi tiết neuron (Neuron Detail)"
          onClick={() => onSwitchViewMode?.('detail')}
          className={`p-2 rounded-xl transition ${
            viewMode === 'detail'
              ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
              : 'hover:bg-white/10 text-slate-400'
          }`}
        >
          <GitBranch className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-cyan-500/25 mx-1" />

        {/* Zoom Controls */}
        <button
          type="button"
          title="Phóng to (+)"
          onClick={() => handleZoom('in')}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Thu nhỏ (-)"
          onClick={() => handleZoom('out')}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Vừa khung nhìn"
          onClick={() => handleZoom('fit')}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 transition"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-cyan-500/25 mx-1" />

        {/* Filter Toggle */}
        <button
          type="button"
          title="Bộ lọc trục tác động"
          onClick={() => setShowFilterMenu((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition ${
            activeFilter !== 'ALL'
              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
              : 'hover:bg-white/10 text-slate-300'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-mono bg-cyan-400/20 px-1.5 py-0.2 rounded-full text-cyan-300">
            {activeFilter === 'ALL' ? '5' : '1'}
          </span>
        </button>

        {/* Ordering Icon */}
        <button
          type="button"
          title="Sắp xếp phân cấp"
          onClick={() => {
            const next = activeFilter === 'ALL' ? 'D1' : activeFilter === 'D1' ? 'D2' : 'ALL';
            onSelectFilter?.(next);
          }}
          className="p-2 rounded-xl hover:bg-white/10 text-slate-400 transition"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        {/* AI Analysis Toggle */}
        <button
          type="button"
          title="AI Nhận xét nhóm"
          onClick={() => setShowAiCard((prev) => !prev)}
          className={`p-2 rounded-xl transition ${
            showAiCard
              ? 'bg-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'hover:bg-white/10 text-purple-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      {/* Top Right Simulation / Impact Button */}
      <div className="absolute top-4 right-6 z-30 pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenImpactModal}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(59,130,246,0.4)] flex items-center gap-1.5 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Khai báo rào cản</span>
        </button>
      </div>

      {/* Filter Dropdown (When Filter button is clicked) */}
      {showFilterMenu && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#071720]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2 shadow-2xl flex flex-wrap gap-1.5 max-w-md">
          {['ALL', 'D1', 'D2', 'D3', 'D4', 'IMPEDIMENT'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                onSelectFilter?.(cat);
                setShowFilterMenu(false);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                activeFilter === cat
                  ? 'bg-cyan-500 text-slate-900 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {cat === 'ALL'
                ? 'Tất cả các trục'
                : cat === 'D1'
                ? 'D1: Sản lượng'
                : cat === 'D2'
                ? 'D2: Tin cậy'
                : cat === 'D3'
                ? 'D3: Phối hợp'
                : cat === 'D4'
                ? 'D4: Chấm chéo'
                : 'Rào cản'}
            </button>
          ))}
        </div>
      )}

      {/* AI Insight Flyout Panel */}
      {showAiCard && (
        <div className="absolute top-16 right-6 z-40 w-80 p-4 rounded-2xl bg-[#091524]/90 backdrop-blur-xl border border-purple-500/40 shadow-2xl text-xs space-y-2 text-slate-200 animate-in fade-in">
          <div className="flex items-center justify-between font-bold text-purple-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI NHẬN XÉT NHÓM
            </span>
            <button type="button" onClick={() => setShowAiCard(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 border-l-2 border-purple-400 leading-relaxed text-[11.5px]">
            Phân bố đóng góp đồng bộ theo đồ án EduConnect: <b>{focusedUserName}</b> đạt tỷ lệ đóng góp <b>{((finalPct || 0.22) * 100).toFixed(1)}%</b> (Điểm chuẩn hóa C_i = {(compositeScore || 33.1).toFixed(1)}/100).
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border-l-2 border-amber-400 leading-relaxed text-[11.5px]">
            Hệ số khả dụng a_i = <b>{(availabilityFactor * 100).toFixed(0)}%</b>. Đã kích hoạt bảo vệ quyền lợi thành viên theo Mô hình 4 tầng.
          </div>
        </div>
      )}

      {/* 3. Bottom-Left Floating Legend Card (Matching Image 1) */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto p-4 rounded-2xl bg-[#06151f]/85 backdrop-blur-xl border border-cyan-500/25 shadow-2xl text-[11px] text-slate-300 w-64 space-y-2.5">
        <h4 className="font-bold text-[10px] tracking-wider text-slate-400 uppercase">
          CHÚ THÍCH MÔ HÌNH ĐA CHIỀU
        </h4>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
            <span className="text-slate-200">Thành viên trọng tâm (Hạt nhân)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>D1: Sản lượng (Thẻ xong & SP)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span>D2: Tin cậy & Đúng hạn (Rework)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a78bfa]" />
            <span>D3: Phối hợp (Review PR & @mentions)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]" />
            <span>D4: Chấm chéo đồng đội (≥ 3 lượt)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span>Rào cản & Khả dụng (Bù điểm D')</span>
          </div>
        </div>

        <div className="w-full h-[1px] bg-cyan-500/20 my-2" />

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>⚙ Chuẩn hóa: <b className="text-cyan-300">ln(1+x) · MAD</b></span>
          <span>📊 Khoảng tin cậy: <b className="text-emerald-300">95% CI</b></span>
        </div>
      </div>

      {/* 4. Bottom-Right Floating KPI & Ask AI Dock (Matching Image 1) */}
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto w-[460px] max-w-[92vw] flex flex-col rounded-3xl bg-[#091b24]/90 backdrop-blur-2xl border-t-2 border-t-cyan-400 border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] overflow-hidden">
        {/* Top 4 KPI Metrics Bar */}
        <div className="grid grid-cols-4 divide-x divide-cyan-500/20 px-4 py-3 bg-cyan-950/20 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block">Đóng góp p_i</span>
            <strong className="text-sm font-extrabold text-cyan-300 flex items-center justify-center gap-0.5">
              ↗ {(finalPct * 100).toFixed(1)}%
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Điểm C_i</span>
            <strong className="text-sm font-extrabold text-white flex items-center justify-center gap-0.5">
              ◎ {compositeScore.toFixed(1)}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Khoảng cách δ_i</span>
            <strong className="text-sm font-extrabold text-emerald-400 flex items-center justify-center gap-0.5">
              👥 {distanceToCenter.toFixed(2)}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Khả dụng a_i</span>
            <strong className="text-sm font-extrabold text-amber-300 flex items-center justify-center gap-0.5">
              👍 {(availabilityFactor * 100).toFixed(0)}%
            </strong>
          </div>
        </div>

        {/* AI Answer Bubble if any */}
        {aiAnswer && (
          <div className="px-4 py-2.5 mx-3 mt-2 rounded-xl bg-cyan-950/60 border border-cyan-400/30 text-xs text-cyan-100 flex items-start justify-between gap-2">
            <span>{aiAnswer}</span>
            <button type="button" onClick={() => setAiAnswer(null)} className="text-slate-400 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Center: Search / Ask a Question Input */}
        <form onSubmit={handleAskSubmit} className="px-3 py-2 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/95 rounded-2xl px-3 py-2 text-slate-900 shadow-inner">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Ask a question... (vd: Ai đang đóng góp cao nhất?)"
              className="w-full bg-transparent text-xs font-medium focus:outline-none placeholder-slate-500"
            />
          </div>
          <button
            type="submit"
            className="w-9 h-9 rounded-full bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white flex items-center justify-center shadow-lg transition"
          >
            <Send className="w-4 h-4 -rotate-45" />
          </button>
        </form>

        {/* Bottom Actions Row */}
        <div className="px-4 py-2.5 bg-black/30 border-t border-cyan-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <select
              aria-label="Chọn thành viên quan sát"
              value={selectedUserId || ''}
              onChange={(e) => onSelectUser?.(Number(e.target.value))}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  👤 {m.fullName}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              +3
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSwitchViewMode?.('detail')}
            className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>RI Analysis / Chi tiết</span>
          </button>
        </div>
      </div>
    </div>
  );
};
