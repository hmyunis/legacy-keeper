import { useQuery } from '@tanstack/react-query';
import { familyTreeService } from '../api/familyTree.service';
import { TREE_NODES, TREE_EDGES } from '../data/mockData';

export const useFamilyTreeData = () => {
  return useQuery({
    queryKey: ['familyTree'],
    queryFn: familyTreeService.getTree,
    initialData: { nodes: TREE_NODES, edges: TREE_EDGES },
  });
};