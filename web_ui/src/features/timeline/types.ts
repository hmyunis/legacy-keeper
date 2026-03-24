export type TimelineSort = 'newest' | 'oldest';

export interface TimelineSearchState {
  decade?: string;
  sort?: TimelineSort;
}
