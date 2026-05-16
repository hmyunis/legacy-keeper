import type { TreeNode, TreeEdge } from '../types';

export const TREE_NODES: TreeNode[] = [
  { id: '1', name: 'Abebe', role: 'Patriarch', photo: 'https://ui-avatars.com/api/?name=Abebe&background=B88F5B&color=fff', deathYear: '2019' },
  { id: '2', name: 'Fatima', role: 'Matriarch', photo: 'https://ui-avatars.com/api/?name=Fatima&background=DBCFB5&color=2A2522' },
  { id: '3', name: 'Yohannes', role: 'Son', photo: 'https://ui-avatars.com/api/?name=Yohannes&background=3A5F7A&color=fff' },
  { id: '4', name: 'Sara', role: 'Daughter', photo: 'https://ui-avatars.com/api/?name=Sara&background=4A7C59&color=fff' },
  { id: '5', name: 'Dawit', role: 'Grandson', photo: 'https://ui-avatars.com/api/?name=Dawit&background=A0622A&color=fff' },
  { id: '6', name: 'Lia', role: 'Granddaughter', photo: 'https://ui-avatars.com/api/?name=Lia&background=8B3A3A&color=fff' },
  { id: '7', name: 'Elias', role: 'Grandson' },
];

export const TREE_EDGES: TreeEdge[] = [
  { from: '1', to: '2' },
  { from: '1', to: '3' },
  { from: '2', to: '4' },
  { from: '3', to: '5' },
  { from: '3', to: '6' },
  { from: '4', to: '7' },
];