import type { Relationship } from '@/types';

export type TreeConfirmState =
  | { kind: 'relationship'; relationshipId: string; title: string; message: string; confirmLabel: string }
  | { kind: 'person'; profileId: string; title: string; message: string; confirmLabel: string };

export interface TreeRelationRow extends Relationship {
  personAName: string;
  personBName: string;
  summary: string;
}
