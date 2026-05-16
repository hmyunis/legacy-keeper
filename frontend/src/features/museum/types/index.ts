export interface ExhibitData {
  id: number;
  url: string;
  title: string;
  location: string;
  year: string;
  position: [number, number, number];
  faces: { name: string; avatar: string }[];
}