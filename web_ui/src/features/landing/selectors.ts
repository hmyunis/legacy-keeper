export const getDisplayFirstName = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const [firstName] = trimmed.split(/\s+/);
  return firstName || '';
};

export const getCurrentYear = (): number => new Date().getFullYear();
