import { useQuery, useMutation } from '@tanstack/react-query';
import { chroniclesService } from '../api/chronicles.service';

export const useTimeline = () => {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: chroniclesService.getTimeline,
  });
};

export const useGenerateStory = () => {
  return useMutation({
    mutationFn: (personId: string) => chroniclesService.generateStory(personId),
  });
};