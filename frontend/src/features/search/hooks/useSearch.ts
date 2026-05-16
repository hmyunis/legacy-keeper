import { useMutation } from '@tanstack/react-query';
import { searchService } from '../api/search.service';

export const useVibeSearch = () => {
  return useMutation({
    mutationFn: (query: string) => searchService.vibeSearch(query),
  });
};