import { create } from 'zustand';
import { Team } from '../types/team';
import { teamApi } from '../api/team.api';

interface ProjectState {
  teams: Team[];
  activeTeamId: number | null;
  loading: boolean;
  initialized: boolean;
  fetchTeams: () => Promise<Team[]>;
  setActiveTeamId: (id: number | null) => void;
  resetProjects: () => void;
  createProject: (payload: { name: string; courseName?: string; description?: string; startDate?: string; endDate?: string }) => Promise<Team>;
  joinProject: (inviteCode: string) => Promise<Team>;
}

const ACTIVE_TEAM_KEY = 'fairshare_active_team_id';
let fetchTeamsSeq = 0;

const OFFLINE_DEMO_TEAMS: Team[] = [
  {
    id: 1,
    name: 'EduConnect',
    courseName: 'Quản lý Dự án Công nghệ Thông tin',
    description: 'Nền tảng học tập nhóm, quản lý tiến độ Kanban và đo lường đóng góp đa chiều minh bạch.',
    inviteCode: 'FS1E04FC',
    createdAt: '2026-10-15T08:00:00Z',
  },
  {
    id: 2,
    name: 'EKLA',
    courseName: 'Học máy & Trí tuệ Nhân tạo (ML)',
    description: 'Hệ thống gợi ý lộ trình học tập thông minh cá nhân hóa theo năng lực sinh viên.',
    inviteCode: 'FS3CB46178AB',
    createdAt: '2026-10-20T08:00:00Z',
  },
  {
    id: 3,
    name: 'KINGSHA',
    courseName: 'Công nghệ Y Dược & Kiểm thử (KINGSHA2012)',
    description: 'Nền tảng quản lý lô dược phẩm, chuẩn bảo mật HIPAA và hồ sơ lâm sàng thời gian thực.',
    inviteCode: 'FS8F5661827D',
    createdAt: '2026-10-25T08:00:00Z',
  },
];

export const useProjectStore = create<ProjectState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  loading: false,
  initialized: false,

  fetchTeams: async () => {
    const reqSeq = ++fetchTeamsSeq;
    set({ loading: true });
    try {
      const res = await teamApi.getTeams();
      if (reqSeq !== fetchTeamsSeq) {
        return [];
      }
      const list = Array.isArray(res?.data) ? res.data : [];
      const currentActive = get().activeTeamId;

      let nextActiveId: number | null = null;
      if (list.length > 0) {
        const storedId = localStorage.getItem(ACTIVE_TEAM_KEY);
        const parsedStored = storedId ? Number(storedId) : null;
        if (parsedStored && list.some((t) => t.id === parsedStored)) {
          nextActiveId = parsedStored;
        } else if (currentActive && list.some((t) => t.id === currentActive)) {
          nextActiveId = currentActive;
        } else {
          nextActiveId = list[0].id;
        }
      }

      if (nextActiveId) {
        localStorage.setItem(ACTIVE_TEAM_KEY, String(nextActiveId));
      } else {
        localStorage.removeItem(ACTIVE_TEAM_KEY);
      }

      set({
        teams: list,
        activeTeamId: nextActiveId,
        loading: false,
        initialized: true,
      });
      return list;
    } catch {
      if (reqSeq !== fetchTeamsSeq) {
        return [];
      }
      const storedId = localStorage.getItem(ACTIVE_TEAM_KEY);
      const parsedStored = storedId ? Number(storedId) : null;
      const fallbackActiveId =
        parsedStored && OFFLINE_DEMO_TEAMS.some((t) => t.id === parsedStored)
          ? parsedStored
          : OFFLINE_DEMO_TEAMS[0].id;
      localStorage.setItem(ACTIVE_TEAM_KEY, String(fallbackActiveId));
      set({
        teams: OFFLINE_DEMO_TEAMS,
        activeTeamId: fallbackActiveId,
        loading: false,
        initialized: true,
      });
      return OFFLINE_DEMO_TEAMS;
    }
  },

  setActiveTeamId: (id) => {
    if (id) {
      localStorage.setItem(ACTIVE_TEAM_KEY, String(id));
    } else {
      localStorage.removeItem(ACTIVE_TEAM_KEY);
    }
    set({ activeTeamId: id });
  },

  resetProjects: () => {
    fetchTeamsSeq++;
    try {
      localStorage.removeItem(ACTIVE_TEAM_KEY);
    } catch {
      // Ignore storage error
    }
    set({ teams: [], activeTeamId: null, loading: false, initialized: false });
  },

  createProject: async (payload) => {
    const res = await teamApi.createTeam(payload);
    const newTeam = res.data;
    if (newTeam && newTeam.id) {
      localStorage.setItem(ACTIVE_TEAM_KEY, String(newTeam.id));
      set((state) => ({
        teams: [newTeam, ...state.teams],
        activeTeamId: newTeam.id,
      }));
    }
    return newTeam;
  },

  joinProject: async (inviteCode) => {
    const res = await teamApi.joinTeam({ inviteCode: inviteCode.trim().toUpperCase() });
    const joinedTeam = res.data;
    if (joinedTeam && joinedTeam.id) {
      localStorage.setItem(ACTIVE_TEAM_KEY, String(joinedTeam.id));
      set((state) => ({
        teams: [...state.teams.filter((t) => t.id !== joinedTeam.id), joinedTeam],
        activeTeamId: joinedTeam.id,
      }));
    }
    return joinedTeam;
  },
}));

