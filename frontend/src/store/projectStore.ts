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
  createProject: (payload: { name: string; courseName?: string; description?: string }) => Promise<Team>;
  joinProject: (inviteCode: string) => Promise<Team>;
}

const ACTIVE_TEAM_KEY = 'fairshare_active_team_id';

export const useProjectStore = create<ProjectState>((set, get) => ({
  teams: [],
  activeTeamId: null,
  loading: false,
  initialized: false,

  fetchTeams: async () => {
    set({ loading: true });
    try {
      const res = await teamApi.getTeams();
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
      set({ loading: false, initialized: true });
      return [];
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

