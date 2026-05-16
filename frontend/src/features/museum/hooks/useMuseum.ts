import { useQuery } from '@tanstack/react-query';
import { museumService } from '../api/museum.service';
import { EXHIBITS } from '../data/mockData';

export const useMuseumExhibits = () => {
  return useQuery({
    queryKey: ['museumExhibits'],
    queryFn: museumService.getExhibits,
    initialData: EXHIBITS,
  });
};