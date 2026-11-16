import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { NetworkNodeDto, NetworkLinkDto } from '../../types/contribution';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  Orbit,
  Filter,
  Sparkles,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Award,
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
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

// Category definitions for Middle Column
const CATEGORIES = [
  { id: 'dim-d1', label: 'D1: Sản lượng (Output)', shortLabel: 'D1 Output', count: '14 SP', sub: 'Story points & Tasks', color: '#10b981', icon: Layers },
  { id: 'dim-d2', label: 'D2: Tin cậy & Tiến độ', shortLabel: 'D2 Reliability', count: '85% Đúng hạn', sub: 'Ít rework & đúng hạn', color: '#06b6d4', icon: ShieldCheck },
  { id: 'dim-d3', label: 'D3: Phối hợp & Review', shortLabel: 'D3 Collaboration', count: '8 Hoạt động', sub: 'Review & Hỗ trợ', color: '#8b5cf6', icon: GitBranch },
  { id: 'dim-d4', label: 'D4: Chấm chéo (Peer)', shortLabel: 'D4 Peer Review', count: '8.4 / 10', sub: '≥3 lượt đánh giá', color: '#ec4899', icon: Award },
  { id: 'cat-impediments', label: 'Rào cản & Khả dụng', shortLabel: 'Rào cản', count: '4 Yếu tố', sub: 'Nguyên nhân chậm trễ', color: '#f59e0b', icon: AlertTriangle },
];

export const CosmicNetworkCanvas: React.FC<CosmicNetworkCanvasProps> = ({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  activeFilter,
  onSelectFilter,
  onOpenImpactModal,
  focusedUserName,
  finalPct = 0.388,
  sprintName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View Mode: 'TREE' (Horizontal Fan-out as in video) or 'GALAXY' (Starburst as in frame_7)
  const [viewMode, setViewMode] = useState<'TREE' | 'GALAXY'>('TREE');

  // Active Category for fan-out (defaults to 'cat-impediments' or 'dim-d1')
  const [activeCategoryId, setActiveCategoryId] = useState<string>('cat-impediments');

  // Pan and Zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Animation Refs
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);

  // Initialize Cosmic Stars
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 160; i++) {
      stars.push({
        x: Math.random() * 2400 - 1200,
        y: Math.random() * 1800 - 900,
        radius: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }
    starsRef.current = stars;
  }, []);

  // Filter leaf items based on active filter or active category
  const rootNode = useMemo(() => {
    return (
      nodes.find((n) => n.type === 'ROOT') ||
      nodes[0] || {
        id: 'root-default',
        label: focusedUserName || 'Nguyễn Hoàng Nam (Trưởng nhóm)',
        type: 'ROOT',
        category: 'MEMBER',
        weight: finalPct * 100,
        badge: `${(finalPct * 100).toFixed(1)}%`,
        status: 'NORMAL',
        color: '#6366f1',
      }
    );
  }, [nodes, focusedUserName, finalPct]);

  const getLeavesForCategory = useCallback(
    (catId: string) => {
      if (catId === 'cat-impediments') {
        return nodes.filter(
          (n) =>
            n.type === 'IMPEDIMENT' ||
            n.category === 'IMPEDIMENT' ||
            n.id.startsWith('imp-') ||
            n.id.startsWith('delay-')
        );
      }
      if (catId === 'dim-d1') {
        return nodes.filter(
          (n) => (n.type === 'EVENT' || n.category === 'D1') && !n.id.startsWith('imp-')
        );
      }
      if (catId === 'dim-d2') {
        return nodes.filter(
          (n) => n.category === 'D2' || n.id.startsWith('delay-') || n.label.toLowerCase().includes('trễ')
        );
      }
      if (catId === 'dim-d3') {
        return nodes.filter(
          (n) => n.category === 'D3' || n.id.startsWith('collab-') || n.label.toLowerCase().includes('review')
        );
      }
      if (catId === 'dim-d4') {
        return nodes.filter((n) => n.category === 'D4');
      }
      return nodes.filter((n) => n.type === 'EVENT' || n.type === 'IMPEDIMENT');
    },
    [nodes]
  );

  // Handle Canvas Zooming
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'reset') {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    const factor = direction === 'in' ? 1.15 : 0.87;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale * factor)),
    }));
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
      timeRef.current += 0.018;
      const t = timeRef.current;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // 1. Cosmic Background & Nebula Glow
      const bgGrad = ctx.createRadialGradient(
        centerX + transform.x,
        centerY + transform.y,
        100,
        centerX + transform.x,
        centerY + transform.y,
        Math.max(width, height) * 0.9
      );
      bgGrad.addColorStop(0, '#0a1020');
      bgGrad.addColorStop(0.5, '#060a14');
      bgGrad.addColorStop(1, '#04060c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Soft nebula clouds
      ctx.save();
      ctx.translate(centerX + transform.x, centerY + transform.y);
      ctx.scale(transform.scale, transform.scale);

      const nebGrad1 = ctx.createRadialGradient(-200, -100, 20, -200, -100, 420);
      nebGrad1.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      nebGrad1.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = nebGrad1;
      ctx.beginPath();
      ctx.arc(-200, -100, 420, 0, Math.PI * 2);
      ctx.fill();

      const nebGrad2 = ctx.createRadialGradient(250, 150, 20, 250, 150, 380);
      nebGrad2.addColorStop(0, 'rgba(6, 182, 212, 0.07)');
      nebGrad2.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = nebGrad2;
      ctx.beginPath();
      ctx.arc(250, 150, 380, 0, Math.PI * 2);
      ctx.fill();

      // Twinkling Background Stars
      starsRef.current.forEach((st) => {
        const flicker = Math.sin(t * 2 + st.speed * 100) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(226, 232, 240, ${st.alpha * flicker})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. TREE FAN-OUT MODE (Matching Video: frame_0.png)
      if (viewMode === 'TREE') {
        const rootX = -width * 0.32;
        const rootY = 0;

        // --- A. Left Core Entity Orb (Member Root Node) ---
        // Subtle outer boundary circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rootX, rootY, 150, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(rootX, rootY, 95, 0, Math.PI * 2);
        ctx.stroke();

        // Animated Electric / Waveform Soundwave Rings around Orb
        for (let ring = 0; ring < 2; ring++) {
          const ringBaseR = 56 + ring * 16;
          const waveAmp = 4 + ring * 2.5;
          const waveFreq = 14;
          const ringColor = ring === 0 ? 'rgba(56, 189, 248, 0.65)' : 'rgba(129, 140, 248, 0.45)';

          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          const step = Math.PI / 60;
          for (let a = 0; a <= Math.PI * 2 + step; a += step) {
            const r =
              ringBaseR +
              Math.sin(a * waveFreq + t * (ring === 0 ? 3.2 : -2.4)) * waveAmp +
              Math.sin(a * 6 - t * 1.5) * 2;
            const px = rootX + Math.cos(a) * r;
            const py = rootY + Math.sin(a) * r;
            if (a === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }

        // 3D Glowing Core Sphere
        const orbGrad = ctx.createRadialGradient(rootX - 12, rootY - 14, 4, rootX, rootY, 44);
        orbGrad.addColorStop(0, '#c084fc');
        orbGrad.addColorStop(0.35, '#818cf8');
        orbGrad.addColorStop(0.8, '#4338ca');
        orbGrad.addColorStop(1, '#1e1b4b');

        ctx.shadowColor = 'rgba(129, 140, 248, 0.8)';
        ctx.shadowBlur = 24;
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(rootX, rootY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner Core highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(rootX - 12, rootY - 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Member Label & Title above Orb
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('THÀNH VIÊN TRỌNG TÂM', rootX, rootY - 78);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        const displayName = rootNode.label || focusedUserName || 'Nguyễn Hoàng Nam';
        ctx.fillText(displayName, rootX, rootY - 60);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '11px sans-serif';
        ctx.fillText(sprintName || 'Sprint 2 · Tích hợp Đa chiều', rootX, rootY - 44);

        // Status pill below Orb (e.g. GAPS 12 / Đóng góp 38.8%)
        const pillW = 120;
        const pillH = 26;
        const pillX = rootX - pillW / 2;
        const pillY = rootY + 54;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        drawRoundRect(ctx, pillX, pillY, pillW, pillH, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Đóng góp: ${(finalPct * 100).toFixed(1)}%`, rootX, pillY + 17);

        // --- B. Center Column: Category Stack ---
        const catColX = -width * 0.05;
        const catWidth = 210;
        const catHeight = 52;
        const catSpacing = 72;
        const catStartY = -((CATEGORIES.length - 1) * catSpacing) / 2;

        // Connector line from Root Orb to Active Category
        const activeIdx = CATEGORIES.findIndex((c) => c.id === activeCategoryId);
        const safeActiveIdx = activeIdx >= 0 ? activeIdx : 0;
        const activeCatY = catStartY + safeActiveIdx * catSpacing;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rootX + 40, rootY);
        ctx.lineTo(catColX - catWidth / 2, activeCatY);
        ctx.stroke();

        CATEGORIES.forEach((cat, idx) => {
          const cy = catStartY + idx * catSpacing;
          const cx = catColX;
          const isActive = cat.id === activeCategoryId;

          // Category Pill Box
          const bx = cx - catWidth / 2;
          const by = cy - catHeight / 2;

          ctx.save();
          if (isActive) {
            // Radiant Golden/Cyan Border Glow (matching video's gold glowing border)
            ctx.shadowColor = cat.color;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = cat.color;
            ctx.lineWidth = 2.2;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
          }

          drawRoundRect(ctx, bx, by, catWidth, catHeight, 14);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Left icon indicator dot
          ctx.fillStyle = cat.color;
          ctx.beginPath();
          ctx.arc(bx + 20, cy, 6, 0, Math.PI * 2);
          ctx.fill();

          // Category Count
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(cat.count, bx + 36, cy - 3);

          // Category Subtitle
          ctx.fillStyle = isActive ? '#cbd5e1' : '#64748b';
          ctx.font = '11px sans-serif';
          ctx.fillText(cat.shortLabel, bx + 36, cy + 14);

          // Right emission anchor on active category
          if (isActive) {
            ctx.fillStyle = cat.color;
            ctx.shadowColor = cat.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(bx + catWidth, cy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        // --- C. Right Column: Fan-out Curved Bezier Rays & Leaf Nodes ---
        const activeCategory = CATEGORIES[safeActiveIdx];
        const leaves = getLeavesForCategory(activeCategoryId);
        const leafColX = width * 0.26;
        const leafWidth = 240;
        const leafHeight = 38;
        const leafSpacing = 48;
        const leafStartY = -((leaves.length - 1) * leafSpacing) / 2;

        const startBeamX = catColX + catWidth / 2;
        const startBeamY = activeCatY;

        leaves.forEach((leaf, idx) => {
          const ly = leafStartY + idx * leafSpacing;
          const lx = leafColX;

          const isSelectedLeaf = leaf.id === selectedNodeId;
          const endBeamX = lx - leafWidth / 2;
          const endBeamY = ly;

          // Elegant Bezier Path: Category -> Leaf
          const cp1X = startBeamX + 110;
          const cp1Y = startBeamY;
          const cp2X = endBeamX - 80;
          const cp2Y = endBeamY;

          ctx.save();
          if (isSelectedLeaf) {
            ctx.strokeStyle = activeCategory.color;
            ctx.lineWidth = 2.4;
            ctx.shadowColor = activeCategory.color;
            ctx.shadowBlur = 10;
          } else {
            ctx.strokeStyle = `${activeCategory.color}55`;
            ctx.lineWidth = 1.3;
          }

          ctx.beginPath();
          ctx.moveTo(startBeamX, startBeamY);
          if (ctx.bezierCurveTo) {
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endBeamX, endBeamY);
          } else {
            ctx.lineTo(endBeamX, endBeamY);
          }
          ctx.stroke();
          ctx.restore();

          // Animated particle on this bezier curve
          const pProgress = (t * 0.85 + idx * 0.28) % 1.0;
          const particlePos = getCubicBezierPoint(
            startBeamX,
            startBeamY,
            cp1X,
            cp1Y,
            cp2X,
            cp2Y,
            endBeamX,
            endBeamY,
            pProgress
          );

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = activeCategory.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(particlePos.x, particlePos.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Leaf Capsule Card
          const lbx = lx - leafWidth / 2;
          const lby = ly - leafHeight / 2;

          ctx.save();
          if (isSelectedLeaf) {
            ctx.fillStyle = 'rgba(20, 30, 52, 0.95)';
            ctx.strokeStyle = activeCategory.color;
            ctx.lineWidth = 1.8;
            ctx.shadowColor = activeCategory.color;
            ctx.shadowBlur = 12;
          } else {
            ctx.fillStyle = 'rgba(12, 18, 32, 0.85)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
          }

          drawRoundRect(ctx, lbx, lby, leafWidth, leafHeight, 10);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          // Leaf Status Dot / Icon
          const dotColor =
            leaf.type === 'IMPEDIMENT' || leaf.status === 'WARN'
              ? '#f59e0b'
              : leaf.status === 'DONE'
              ? '#10b981'
              : '#38bdf8';
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(lbx + 14, ly, 4, 0, Math.PI * 2);
          ctx.fill();

          // Leaf Label Text (Truncated)
          ctx.fillStyle = isSelectedLeaf ? '#ffffff' : '#e2e8f0';
          ctx.font = '11.5px sans-serif';
          ctx.textAlign = 'left';
          const maxTextW = leafWidth - 95;
          const cleanLabel = leaf.label.length > 24 ? `${leaf.label.substring(0, 22)}...` : leaf.label;
          ctx.fillText(cleanLabel, lbx + 26, ly + 4, maxTextW);

          // Leaf Badge Pill (e.g. 5 SP, 1.5 ngày)
          if (leaf.badge) {
            const badgeW = 54;
            const badgeH = 20;
            const badgeX = lbx + leafWidth - badgeW - 8;
            const badgeY = ly - badgeH / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.8;
            drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = dotColor;
            ctx.font = 'bold 9.5px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(leaf.badge, badgeX + badgeW / 2, badgeY + 13.5);
          }
        });
      }

      // 3. GALAXY 3D CONSTELLATION MODE (Matching frame_7.png)
      else if (viewMode === 'GALAXY') {
        const rootRadius = 45;

        // Concentric Orbit Guides
        [160, 260, 360].forEach((r) => {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Laser Beams radiating outward
        const count = nodes.length;
        nodes.forEach((n, idx) => {
          if (n.type === 'ROOT') return;
          const angle = (idx / (count || 1)) * Math.PI * 2 + t * 0.1;
          const dist = 180 + (idx % 3) * 70;
          const nx = Math.cos(angle) * dist;
          const ny = Math.sin(angle) * dist;

          // Glowing Ray Line
          ctx.strokeStyle = `${n.color || '#38bdf8'}66`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          // Satellite Node
          ctx.fillStyle = n.color || '#38bdf8';
          ctx.shadowColor = n.color || '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(nx, ny, n.type === 'DIMENSION' ? 14 : 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.label.substring(0, 14), nx, ny + 18);
        });

        // Golden Central Sun (Constitution/Root Node in frame_7)
        const sunGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, rootRadius);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.5, '#eab308');
        sunGrad.addColorStop(1, '#854d0e');

        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 30;
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(0, 0, rootRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(rootNode.label.substring(0, 18), 0, 5);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    nodes,
    links,
    selectedNodeId,
    activeCategoryId,
    viewMode,
    transform,
    finalPct,
    focusedUserName,
    sprintName,
    getLeavesForCategory,
    rootNode,
  ]);

  // Click & Hit-Test Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const worldX = (mouseX - centerX - transform.x) / transform.scale;
    const worldY = (mouseY - centerY - transform.y) / transform.scale;

    if (viewMode === 'TREE') {
      const width = canvas.width;
      const rootX = -width * 0.32;
      const rootY = 0;

      // 1. Check Root Orb Click
      const distToRoot = Math.hypot(worldX - rootX, worldY - rootY);
      if (distToRoot <= 45) {
        onSelectNode(rootNode);
        return;
      }

      // 2. Check Category Column Click
      const catColX = -width * 0.05;
      const catWidth = 210;
      const catHeight = 52;
      const catSpacing = 72;
      const catStartY = -((CATEGORIES.length - 1) * catSpacing) / 2;

      for (let i = 0; i < CATEGORIES.length; i++) {
        const cat = CATEGORIES[i];
        const cy = catStartY + i * catSpacing;
        const bx = catColX - catWidth / 2;
        const by = cy - catHeight / 2;

        if (worldX >= bx && worldX <= bx + catWidth && worldY >= by && worldY <= by + catHeight) {
          setActiveCategoryId(cat.id);
          const foundNode = nodes.find((n) => n.id === cat.id);
          if (foundNode) onSelectNode(foundNode);
          return;
        }
      }

      // 3. Check Leaf Column Click
      const leaves = getLeavesForCategory(activeCategoryId);
      const leafColX = width * 0.26;
      const leafWidth = 240;
      const leafHeight = 38;
      const leafSpacing = 48;
      const leafStartY = -((leaves.length - 1) * leafSpacing) / 2;

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        const ly = leafStartY + i * leafSpacing;
        const lbx = leafColX - leafWidth / 2;
        const lby = ly - leafHeight / 2;

        if (worldX >= lbx && worldX <= lbx + leafWidth && worldY >= lby && worldY <= lby + leafHeight) {
          onSelectNode(leaf);
          return;
        }
      }
    }
  };

  // Resize canvas when container size changes
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pan Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }));
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.4, Math.min(2.5, prev.scale * zoomFactor)),
    }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing bg-[#050811]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block w-full h-full"
      />

      {/* Top Floating Control Bar (Exactly matching Video frame_0.png) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
        <div
          className="flex items-center gap-1 p-1 rounded-2xl backdrop-blur-2xl border shadow-2xl"
          style={{
            background: 'rgba(10, 16, 28, 0.85)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          {/* View Mode Toggle: Tree Fan-Out vs 3D Constellation */}
          <button
            type="button"
            title="Dạng Cây Tác Động (Tree Fan-out)"
            onClick={() => setViewMode('TREE')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'TREE'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GitBranch className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Dạng Ngân Hà 3D (3D Constellation)"
            onClick={() => setViewMode('GALAXY')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'GALAXY'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Orbit className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Zoom Controls */}
          <button
            type="button"
            title="Phóng to (+)"
            onClick={() => handleZoom('in')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Thu nhỏ (-)"
            onClick={() => handleZoom('out')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Cân bằng khung nhìn"
            onClick={() => handleZoom('reset')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Filter Pills button */}
          <button
            type="button"
            title="Bộ lọc trục vector"
            onClick={() => {
              if (onSelectFilter) {
                const nextFilter = activeFilter === 'ALL' ? 'IMPEDIMENT' : 'ALL';
                onSelectFilter(nextFilter);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-1.5 transition"
          >
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Bộ lọc</span>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
              5
            </span>
          </button>

          {/* AI Simulation / Sparkle button */}
          <button
            type="button"
            title="Mô phỏng vector AI"
            className="p-2 rounded-xl text-purple-400 hover:bg-purple-500/10 transition"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>

        {/* Action Button: + Ghi nhận rào cản (matching "+ New Simulation" in video) */}
        {onOpenImpactModal && (
          <button
            type="button"
            onClick={onOpenImpactModal}
            className="px-3.5 py-2 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5 shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>+ Khai báo rào cản</span>
          </button>
        )}
      </div>

      {/* Top Right Subtitle Pill (matching video top bar info) */}
      <div
        className="absolute top-4 right-6 z-20 hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border text-[11px] text-zinc-300"
        style={{
          background: 'rgba(10, 16, 28, 0.75)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Mô hình 4 Tầng Vector Đa Chiều · <strong>MariaDB Live Sync</strong></span>
      </div>
    </div>
  );
};

// Helper: Draw Rounded Rectangle
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  if (ctx.quadraticCurveTo) {
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.closePath();
}

// Helper: Calculate Point along Cubic Bezier Curve at progress t [0, 1]
function getCubicBezierPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number
) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  const x = uuu * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + ttt * x3;
  const y = uuu * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + ttt * y3;
  return { x, y };
}
