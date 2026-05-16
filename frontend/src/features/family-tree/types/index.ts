export interface TreeNode {
  id: string;
  name: string;
  role: string;
  photo?: string;
  deathYear?: string;
  invisible?: boolean;
  isGhost?: boolean;
}

export interface TreeEdge {
  from: string;
  to: string;
}

export interface FamilyTreeData {
  nodes: TreeNode[];
  edges: TreeEdge[];
}