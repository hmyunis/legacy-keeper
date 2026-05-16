export const settingsService = {
  purgeStorage: async (): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 3000));
  },
  updateProfile: async (data: any): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }
};