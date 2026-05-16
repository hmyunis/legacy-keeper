export interface TimelineEvent {
  id: string;
  decade: string;
  year: string;
  title: string;
  location: string;
  desc: string;
  url: string;
}

export interface KinshipNode {
  id: number;
  name: string;
  role: string;
  avatar: string;
}