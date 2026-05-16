import type { TimelineEvent } from '../types';

const MOCK_EVENTS: TimelineEvent[] = [
  { id: '1', decade: '1970s', year: '1975', title: 'The Move to Addis', location: 'Addis Ababa', desc: 'Packing up the old house to move to the city.', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=600' },
  { id: '2', decade: '1970s', year: '1978', title: 'First Car', location: 'Harar', desc: 'Abebe buys his first vehicle, a light blue sedan.', url: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?q=80&w=600' },
  { id: '3', decade: '1980s', year: '1982', title: 'Wedding Anniversary', location: 'Entoto', desc: 'Celebrating 20 years of marriage.', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=600' },
];

export const chroniclesService = {
  getTimeline: async (): Promise<TimelineEvent[]> => MOCK_EVENTS,
  generateStory: async (personId: string): Promise<string> => {
    await new Promise(res => setTimeout(res, 1000));
    return "Born in the walled city of Harar in 1942...";
  }
};