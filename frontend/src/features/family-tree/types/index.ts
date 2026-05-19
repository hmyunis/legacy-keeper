export interface Person {
  id: string;
  name: string;
  role: string;
  photo?: string;
  birthYear?: string;
  deathYear?: string;
  biography?: string;
}

export interface KinshipEdge {
  from: string;
  to: string;
  type: string;
}

export interface FamilyTreeData {
  nodes: Person[];
  edges: KinshipEdge[];
}