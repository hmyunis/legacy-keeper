import axiosClient from '../../../services/axiosClient';
import { extractData, extractList } from '../../../services/responseExtractor';
import type { TimelineEvent, PersonProfile } from '../types';

export const chroniclesService = {
  getPersonProfile: async (vaultId: string, personId: string): Promise<PersonProfile> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/lineage/person/${personId}/profile/`);
    return extractData<PersonProfile>(response);
  },

  generateStory: async (vaultId: string, personId: string): Promise<{ task_id: string }> => {
    const response = await axiosClient.post(
      `/vaults/${vaultId}/lineage/person/${personId}/generate-chronicle/`
    );
    return response.data;
  },

  getTimeline: async (vaultId: string): Promise<TimelineEvent[]> => {
    const response = await axiosClient.get(`/vaults/${vaultId}/memories/`);
    return extractList<TimelineEvent>(response);
  },
};
