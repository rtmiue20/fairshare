import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultidimensionalVectorPage } from '../features/integration/MultidimensionalVectorPage';
import { contributionApi } from '../api/contribution.api';
import { teamApi } from '../api/team.api';

// Mock API calls
vi.mock('../api/contribution.api', () => ({
  contributionApi: {
    getNetworkGraph: vi.fn(),
    logImpactEvent: vi.fn(),
    updateAvailability: vi.fn(),
    resolveSuspicion: vi.fn(),
    calculateSprintScores: vi.fn(),
  },
}));

vi.mock('../api/team.api', () => ({
  teamApi: {
    getMembers: vi.fn(),
  },
}));

vi.mock('../store/projectStore', () => ({
  useProjectStore: () => ({
    activeTeamId: 1,
    teams: [{ id: 1, name: 'KINGSHA' }],
  }),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, fullName: 'Nguyễn Văn Minh Triệu', email: 'trieu@ueh.edu.vn' },
    isAuthenticated: true,
  }),
}));

// Mock ResizeObserver & HTMLCanvasElement getContext
beforeEach(() => {
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillText: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    setLineDash: vi.fn(),
  });
});

describe('MultidimensionalVectorPage Component Tests', () => {
  it('renders the 4-tier multidimensional model and timeline scrubber', async () => {
    vi.mocked(teamApi.getMembers).mockResolvedValue({
      success: true,
      message: 'OK',
      data: [{ id: 1, fullName: 'Nguyễn Văn Minh Triệu', email: 'trieu@ueh.edu.vn' }],
    } as never);

    vi.mocked(contributionApi.getNetworkGraph).mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        teamId: 1,
        sprintId: 4,
        sprintName: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng',
        focusedUserId: 1,
        focusedUserName: 'Nguyễn Văn Minh Triệu',
        finalPct: 0.36,
        score: 36.0,
        d1Output: 0.82,
        d2Reliability: -0.45,
        d3Collaboration: 0.7,
        d4Peer: 0.65,
        compositeScore: 68.4,
        availabilityFactor: 0.85,
        confidenceIntervalLow: 31.2,
        confidenceIntervalHigh: 42.0,
        distanceToCenter: 1.15,
        isSuspicious: false,
        hasSufficientEvidence: true,
        totalEventsCount: 18,
        tierBreakdown: {
          rawFeatures: { cardsCompleted: 6, totalStoryPoints: 14.0, onTimeRate: 0.68, manualPoints: 3.0 },
          logFeatures: { ln_1_sp: 2.708, ln_1_cards: 1.945, ln_1_manual: 1.386 },
          robustZScores: { z_sp: 0.82, z_ontime: -0.45, z_collab: 0.7, z_peer: 0.65 },
          dimensions: { D1_Output: 0.82, D2_Reliability: -0.45, D3_Collaboration: 0.7, D4_Peer: 0.65 },
          availabilityFactor: 0.85,
          availabilityBonusFactor: 1.075,
          adjustedDimensions: { D1_prime: 0.881, D2_prime: -0.483, D3_prime: 0.752, D4_prime: 0.698 },
          compositeScore: 68.4,
          finalPercentage: 0.36,
        },
        nodes: [
          { id: 'root-1', label: 'Nguyễn Văn Minh Triệu', type: 'ROOT', category: 'MEMBER', weight: 68.4, color: '#6366f1' },
          { id: 'dim-d1', label: 'D1 - Sản lượng (Output)', type: 'DIMENSION', category: 'D1', weight: 0.82, color: '#10b981' },
          { id: 'cat-impediments', label: 'Yếu tố tác động & Rào cản', type: 'CATEGORY', category: 'IMPEDIMENT', weight: 1.0, color: '#f59e0b' },
        ],
        links: [
          { source: 'root-1', target: 'dim-d1', weight: 1.0, type: 'PRIMARY', color: '#10b981' },
        ],
        sprints: [
          { id: 4, name: 'Sprint 4: Tích hợp Đa chiều & Bằng chứng', isCurrent: true, status: 'ACTIVE' },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof contributionApi.getNetworkGraph>>);

    render(<MultidimensionalVectorPage />);

    // Check timeline scrubber and header
    await waitFor(() => {
      expect(screen.getByText(/Dòng Thời Gian Sprint/i)).toBeInTheDocument();
      expect(screen.getByText(/Mô Hình 4 Tầng Công Thức/i)).toBeInTheDocument();
    });

    // Check 4 dimension names
    expect(screen.getByText(/D1 Output \(Sản lượng\):/i)).toBeInTheDocument();
    expect(screen.getByText(/D2 Reliability \(Độ tin cậy\):/i)).toBeInTheDocument();

    // Check availability button
    expect(screen.getByText(/Chỉnh Khả Dụng \(a_i\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Tính Lại Vector \(DB\)/i)).toBeInTheDocument();

    // Test switching to Tầng 1
    const tier1Btn = screen.getByRole('button', { name: 'Tầng 1' });
    fireEvent.click(tier1Btn);
    expect(screen.getByText(/Vector đặc trưng thô x_i/i)).toBeInTheDocument();

    // Test switching to Tầng 2
    const tier2Btn = screen.getByRole('button', { name: 'Tầng 2' });
    fireEvent.click(tier2Btn);
    expect(screen.getByText(/Giảm dần lợi ích phi tuyến/i)).toBeInTheDocument();

    // Test switching to Tầng 4
    const tier4Btn = screen.getByRole('button', { name: 'Tầng 4' });
    fireEvent.click(tier4Btn);
    expect(screen.getByText(/Bù khả dụng một phần & Sigmoid/i)).toBeInTheDocument();
  });
});
