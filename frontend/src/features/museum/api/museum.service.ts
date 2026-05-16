import { EXHIBITS } from '../data/mockData';
import type { ExhibitData } from '../types';

export const museumService = {
  getExhibits: async (): Promise<ExhibitData[]> => {
    return EXHIBITS;
  }
};