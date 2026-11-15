import React, { useEffect, useRef, useState } from 'react';
import { NetworkNodeDto, NetworkLinkDto } from '../../types/contribution';

interface CosmicNetworkCanvasProps {
  nodes: NetworkNodeDto[];
  links: NetworkLinkDto[];
  selectedNodeId: string | null;
  onSelectNode: (node: NetworkNodeDto) => void;
  activeFilter: string; // 'ALL' | 'D1' | 'D2' | 'D3' | 'D4' | 'IMPEDIMENT'
}

interface InternalNode extends NetworkNodeDto {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  isDragging?: boolean;
}

interface Particle {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
}

export const CosmicNetworkCanvas: React.FC<CosmicNetworkCanvasProps> = ({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  activeFilter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Transform states (pan and zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<InternalNode | null>(null);

  // Simulation internal nodes & particles
  const internalNodesRef = useRef<InternalNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize stars once
  useEffect(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 140; i++) {
      stars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        radius: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.015 + 0.005,
      });
    }
    starsRef.current = stars;
  }, []);

  // Compute node layouts when nodes or filter change
  useEffect(() => {
    if (!nodes || nodes.length === 0) {
      internalNodesRef.current = [];
      return;
    }

    const width = containerRef.current?.clientWidth || 900;
    const height = containerRef.current?.clientHeight || 650;
    const centerX = width / 2;
    const centerY = height / 2;

    const rootNode = nodes.find((n) => n.type === 'ROOT') || nodes[0];
    const dimNodes = nodes.filter((n) => n.type === 'DIMENSION' || n.type === 'CATEGORY');
    const leafNodes = nodes.filter((n) => n.type === 'EVENT' || n.type === 'IMPEDIMENT');

    const mapped: InternalNode[] = [];

    // 1. Root Node (Center)
    mapped.push({
      ...rootNode,
      x: centerX,
      y: centerY,
      targetX: centerX,
      targetY: centerY,
      vx: 0,
      vy: 0,
      radius: 36,
    });

    // 2. Dimension / Category Orbit (radius ~ 180px)
    const dimRadius = Math.min(width, height) * 0.28;
    const dimAngles: Record<string, number> = {
      'dim-d1': -Math.PI / 2,             // Top: Output
      'dim-d2': -Math.PI / 10,            // Top-Right: Reliability
      'dim-d3': Math.PI * 0.35,           // Bottom-Right: Collaboration
      'dim-d4': Math.PI * 0.75,           // Bottom-Left: Peer Review
      'cat-impediments': Math.PI * 1.25,  // Top-Left: Impediments
    };

    dimNodes.forEach((dn, index) => {
      const angle = dimAngles[dn.id] !== undefined
        ? dimAngles[dn.id]
        : (index / dimNodes.length) * Math.PI * 2 - Math.PI / 2;
      const targetX = centerX + Math.cos(angle) * dimRadius;
      const targetY = centerY + Math.sin(angle) * dimRadius;

      mapped.push({
        ...dn,
        x: targetX,
        y: targetY,
        targetX,
        targetY,
        vx: 0,
        vy: 0,
        radius: 26,
      });
    });

    // 3. Leaf Nodes Fan-out (grouped by parent link)
    const leavesByParent: Record<string, NetworkNodeDto[]> = {};
    leafNodes.forEach((leaf) => {
      const parentLink = links.find((l) => l.target === leaf.id);
      const parentId = parentLink ? parentLink.source : 'dim-d1';
      if (!leavesByParent[parentId]) {
        leavesByParent[parentId] = [];
      }
      leavesByParent[parentId].push(leaf);
    });

    Object.entries(leavesByParent).forEach(([parentId, leaves]) => {
      const parent = mapped.find((m) => m.id === parentId) || mapped[0];
      const baseAngle = Math.atan2(parent.y - centerY, parent.x - centerX);
      const leafCount = leaves.length;
      const arcSpread = Math.min(Math.PI * 0.9, 0.25 * leafCount + 0.3);
      const leafDistance = 140;

      leaves.forEach((leaf, idx) => {
        const offset = leafCount > 1
          ? (idx / (leafCount - 1) - 0.5) * arcSpread
          : 0;
        const angle = baseAngle + offset;
        const targetX = parent.x + Math.cos(angle) * leafDistance;
        const targetY = parent.y + Math.sin(angle) * leafDistance;

        mapped.push({
          ...leaf,
          x: targetX,
          y: targetY,
          targetX,
          targetY,
          vx: 0,
          vy: 0,
          radius: leaf.type === 'IMPEDIMENT' ? 18 : 14,
        });
      });
    });

    internalNodesRef.current = mapped;

    // Reset particles on link structure
    const particles: Particle[] = [];
    links.forEach((l, i) => {
      particles.push({
        sourceId: l.source,
        targetId: l.target,
        progress: (i * 0.17) % 1.0,
        speed: 0.006 + (i % 3) * 0.002,
        color: l.color || '#38bdf8',
      });
    });
    particlesRef.current = particles;
  }, [nodes, links]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Space Cosmic Background
      const bgGrad = ctx.createRadialGradient(
        width / 2, height / 2, 50,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#0c1322');
      bgGrad.addColorStop(0.5, '#070b14');
      bgGrad.addColorStop(1, '#030509');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Apply Pan & Zoom Transform
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // 2. Ambient Stars (twinkling)
      starsRef.current.forEach((star) => {
        star.alpha += star.speed;
        const currentAlpha = 0.3 + 0.7 * Math.abs(Math.sin(star.alpha));
        ctx.fillStyle = `rgba(226, 232, 240, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x + width / 2, star.y + height / 2, star.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Central Ambient Cosmic Aura
      const centralAura = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, 280
      );
      centralAura.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
      centralAura.addColorStop(0.4, 'rgba(6, 182, 212, 0.08)');
      centralAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centralAura;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 280, 0, Math.PI * 2);
      ctx.fill();

      const currentNodes = internalNodesRef.current;
      const nodeMap = new Map<string, InternalNode>();
      currentNodes.forEach((n) => nodeMap.set(n.id, n));

      // 4. Render Glowing Energy Filament Links
      links.forEach((link) => {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (!source || !target) return;

        // Filter opacity check
        const isSourceVisible = activeFilter === 'ALL' || source.category === activeFilter || source.type === 'ROOT';
        const isTargetVisible = activeFilter === 'ALL' || target.category === activeFilter || target.type === 'ROOT';
        const alpha = isSourceVisible && isTargetVisible ? 0.75 : 0.12;

        const isHighlighted = selectedNodeId === source.id || selectedNodeId === target.id;
        const strokeColor = link.color || '#38bdf8';

        // Draw curved Bezier path
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);

        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Subtle curve offset
        const normalX = -dy / (dist || 1);
        const normalY = dx / (dist || 1);
        const curveOffset = Math.sin((source.x + target.y) * 0.01) * 14;

        const ctrlX = midX + normalX * curveOffset;
        const ctrlY = midY + normalY * curveOffset;

        ctx.quadraticCurveTo(ctrlX, ctrlY, target.x, target.y);

        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = isHighlighted ? 1.0 : alpha;
        ctx.lineWidth = isHighlighted ? 2.5 : Math.max(1, (link.weight || 1) * 1.4);
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = isHighlighted ? 14 : 6;
        ctx.stroke();
        ctx.restore();
      });

      // 5. Render Animated Energy Pulse Particles
      particlesRef.current.forEach((p) => {
        const source = nodeMap.get(p.sourceId);
        const target = nodeMap.get(p.targetId);
        if (!source || !target) return;

        p.progress += p.speed;
        if (p.progress >= 1.0) p.progress = 0.0;

        // Quadratic bezier position
        const t = p.progress;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normalX = -dy / (dist || 1);
        const normalY = dx / (dist || 1);
        const curveOffset = Math.sin((source.x + target.y) * 0.01) * 14;
        const ctrlX = midX + normalX * curveOffset;
        const ctrlY = midY + normalY * curveOffset;

        const px = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * ctrlX + t * t * target.x;
        const py = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * ctrlY + t * t * target.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });

      // 6. Render Nodes (Orbs with Multi-layer Glow & Badges)
      currentNodes.forEach((node) => {
        const isSelected = selectedNodeId === node.id;
        const isDimOrRoot = node.type === 'ROOT' || node.type === 'DIMENSION' || node.type === 'CATEGORY';
        const isVisible = activeFilter === 'ALL' || node.category === activeFilter || node.type === 'ROOT';

        ctx.save();
        ctx.globalAlpha = isVisible ? 1.0 : 0.25;

        const baseColor = node.color || '#6366f1';

        // Outer glow aura
        const auraGrad = ctx.createRadialGradient(
          node.x, node.y, node.radius * 0.3,
          node.x, node.y, node.radius * (isSelected ? 2.2 : 1.6)
        );
        auraGrad.addColorStop(0, hexToRgba(baseColor, isSelected ? 0.6 : 0.35));
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (isSelected ? 2.2 : 1.6), 0, Math.PI * 2);
        ctx.fill();

        // Core Solid Orb
        const orbGrad = ctx.createRadialGradient(
          node.x - node.radius * 0.3, node.y - node.radius * 0.3, 2,
          node.x, node.y, node.radius
        );
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.3, baseColor);
        orbGrad.addColorStop(1, '#060a12');

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = isSelected ? 20 : 10;
        ctx.fill();

        // Border outline
        ctx.strokeStyle = isSelected ? '#ffffff' : hexToRgba(baseColor, 0.9);
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Pulsing Accent Ring for Selected Node
        if (isSelected) {
          const time = Date.now() * 0.003;
          const pulseRadius = node.radius + 6 + Math.sin(time) * 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Inner Icon / Text
        if (node.type === 'ROOT') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('CORE', node.x, node.y - 1);
        } else if (node.type === 'DIMENSION') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.category, node.x, node.y);
        } else if (node.type === 'IMPEDIMENT') {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', node.x, node.y);
        }

        // Node Label Pill below
        ctx.save();
        ctx.font = isDimOrRoot ? '600 12px Inter, sans-serif' : '500 10px Inter, sans-serif';
        const labelText = node.label;
        const textWidth = ctx.measureText(labelText).width;
        const pillY = node.y + node.radius + (isDimOrRoot ? 14 : 10);

        // Glassy label background
        ctx.fillStyle = 'rgba(11, 15, 25, 0.85)';
        ctx.strokeStyle = isSelected ? '#ffffff' : hexToRgba(baseColor, 0.4);
        ctx.lineWidth = 1;
        roundRect(ctx, node.x - textWidth / 2 - 8, pillY - 10, textWidth + 16, 20, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#ffffff' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, pillY);

        // Badge pill (e.g. "+0.85", "3 SP", "Trễ hạn")
        if (node.badge) {
          ctx.font = 'bold 9px Inter, sans-serif';
          const badgeWidth = ctx.measureText(node.badge).width;
          const badgeY = pillY + 16;
          ctx.fillStyle = hexToRgba(baseColor, 0.25);
          ctx.strokeStyle = hexToRgba(baseColor, 0.6);
          roundRect(ctx, node.x - badgeWidth / 2 - 6, badgeY - 8, badgeWidth + 12, 16, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = baseColor;
          ctx.fillText(node.badge, node.x, badgeY);
        }

        ctx.restore();
        ctx.restore();
      });

      ctx.restore(); // Restore Pan & Zoom
      ctx.restore(); // Restore DPR

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [transform, selectedNodeId, activeFilter]);

  // Helpers
  const hexToRgba = (hex: string, alpha: number) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    if (typeof ctx.arcTo === 'function') {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    if (typeof ctx.closePath === 'function') {
      ctx.closePath();
    }
  };

  // Canvas Mouse Interactions (Pan, Zoom, Drag node, Click node)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;

    // Check if clicked on a node
    const clickedNode = internalNodesRef.current.find((n) => {
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 12;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      clickedNode.isDragging = true;
      onSelectNode(clickedNode);
    } else {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - transform.x) / transform.scale;
      const mouseY = (e.clientY - rect.top - transform.y) / transform.scale;
      draggedNodeRef.current.x = mouseX;
      draggedNodeRef.current.y = mouseY;
    } else if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.isDragging = false;
      draggedNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => {
      const nextScale = Math.min(2.5, Math.max(0.4, prev.scale * zoomFactor));
      return { ...prev, scale: nextScale };
    });
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: '#070b14' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Floating Canvas Controls (Reset Zoom, Pan hint) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetView}
          className="px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md transition-all shadow-lg"
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94a3b8',
          }}
          title="Đặt lại góc nhìn trung tâm"
        >
          Căn giữa (Reset View)
        </button>
        <span
          className="text-[11px] px-2.5 py-1 rounded-md text-zinc-400 backdrop-blur-md hidden sm:inline-block"
          style={{ background: 'rgba(15, 23, 42, 0.5)' }}
        >
          Cuộn chuột để Phóng to/Thu nhỏ · Giữ kéo để Di chuyển
        </span>
      </div>
    </div>
  );
};
