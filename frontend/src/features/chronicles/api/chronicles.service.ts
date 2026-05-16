import axiosClient from '../../../services/axiosClient';
import type { TimelineEvent } from '../types';

export const chroniclesService = {
  getPersonProfile: async (vaultId: string, personId: string) => {
    const response = await axiosClient.get(`/vaults/${vaultId}/lineage/person/${personId}/profile/`);
    return response.data;
  },

  generateStory: async (vaultId: string, personId: string): Promise<{ task_id: string }> => {
    const response = await axiosClient.post(
      `/vaults/${vaultId}/lineage/person/${personId}/generate-chronicle/`
    );
    return response.data;
  },

  getTimeline: async (vaultId: string): Promise<TimelineEvent[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/`);
    return response.data.results || response.data;
  },
};