export interface Person {
  id: string;
  name: string;
  role: string;
  photo?: string;
  birthYear?: string;
  deathYear?: string;
  biography?: string;
  vaultId?: string;
  vaultName?: string;
}

export interface KinshipEdge {
  from: string;
  to: string;
  type: string; // 'PARENT_OF' | 'SPOUSE_OF'
}

export interface FamilyTreeData {
  nodes: Person[];
  edges: KinshipEdge[];
}
