import { TREE_NODES, TREE_EDGES } from '../data/mockData';
import type { FamilyTreeData } from '../types';

export const familyTreeService = {
  getTree: async (): Promise<FamilyTreeData> => {
    return { nodes: TREE_NODES, edges: TREE_EDGES };
  }
};