import type { Capsule } from '../types';

const MOCK_CAPSULES: Capsule[] = [
  { id: '1', title: "Abebe's 80th", unlockDate: 'Dec 2028', daysRemaining: 942, status: 'locked', sealedBy: 'Abebe' },
  { id: '2', title: 'Graduation Day', unlockDate: 'READY', daysRemaining: 0, status: 'ready', sealedBy: 'Abebe', message: "To whoever finds this, know that this day was the happiest of my life. I hope you are all well, and that our family still gathers here in the garden." },
];

export const capsulesService = {
  getCapsules: async (): Promise<Capsule[]> => {
    return MOCK_CAPSULES;
  },
  sealCapsule: async (data: any): Promise<void> => {
    console.log('Sealing capsule...', data);
    return new Promise((res) => setTimeout(res, 2000));
  }
};