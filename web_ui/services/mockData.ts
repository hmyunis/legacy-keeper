import { 
  MediaItem, 
  MediaType, 
  MediaStatus, 
  PersonProfile, 
  UserRole, 
  Relationship,
  FamilyMember,
  MemberStatus
} from '../types';

export const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'm1',
    vaultId: 'v1',
    uploaderId: 'u1',
    type: MediaType.PHOTO,
    title: "Kassa's Portrait in Gondar 1962",
    description: "Our patriarch Kassa Belay at the Fasil Ghebbi complex.",
    dateTaken: '1962-01-15',
    uploadTimestamp: '2024-01-20T10:00:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/ethio1/400/400',
    tags: ['Portrait', 'Gondar', 'Orthodox'],
    status: MediaStatus.COMPLETED,
    location: 'Gondar, Amhara',
    detectedFaces: [
      {
        id: 'face1',
        personId: 'p1',
        name: 'Kassa Belay',
        confidence: 0.98,
        thumbnailUrl: 'https://picsum.photos/seed/kassa/100/100'
      }
    ]
  },
  {
    id: 'm2',
    vaultId: 'v1',
    uploaderId: 'u1',
    type: MediaType.PHOTO,
    title: "Meskel Festival Celebration",
    description: "The Lighting of the Demera in Addis Ababa. Christian heritage gathering.",
    dateTaken: '1975-09-27',
    uploadTimestamp: '2024-01-21T14:30:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/meskel/400/400',
    tags: ['Addis Ababa', 'Meskel', 'Christian'],
    status: MediaStatus.COMPLETED,
    location: 'Meskel Square, Addis Ababa',
    detectedFaces: [
      {
        id: 'face2',
        confidence: 0.85,
        thumbnailUrl: 'https://picsum.photos/seed/tek/100/100'
      }
    ]
  },
  {
    id: 'm3',
    vaultId: 'v1',
    uploaderId: 'u1',
    type: MediaType.PHOTO,
    title: "Eid Al-Fitr in Harar",
    description: "Gathering near the Jugol Walls with Fatuma's side of the family.",
    dateTaken: '1988-05-12',
    uploadTimestamp: '2024-01-22T09:15:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/harar/400/400',
    tags: ['Harar', 'Muslim', 'Eid'],
    status: MediaStatus.COMPLETED,
    location: 'Harar, Harari Region'
  },
  {
    id: 'm4',
    vaultId: 'v1',
    uploaderId: 'u1',
    type: MediaType.DOCUMENT,
    title: "Archival Bible from Lalibela",
    description: "17th Century manuscript preserved in the family archives.",
    dateTaken: '1955-04-20',
    uploadTimestamp: '2024-01-23T16:00:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/bible/400/300',
    tags: ['Lalibela', 'Archives', 'Christian'],
    status: MediaStatus.COMPLETED,
    location: 'Lalibela, Amhara'
  },
  {
    id: 'm5',
    vaultId: 'v1',
    uploaderId: 'u1',
    type: MediaType.VIDEO,
    title: "Timkat Gondar 2010",
    description: "Traditional Epiphany celebration at Fasilides' Bath.",
    dateTaken: '2010-01-19',
    uploadTimestamp: '2024-01-24T12:00:00Z',
    thumbnailUrl: 'https://picsum.photos/seed/timkat/400/400',
    tags: ['Gondar', 'Timkat', 'Video', 'Orthodox'],
    status: MediaStatus.COMPLETED,
    location: 'Gondar, Amhara'
  }
];

export const INITIAL_PROFILES: PersonProfile[] = [
  {
    id: 'p1',
    fullName: 'Kassa Belay',
    gender: 'MALE',
    birthDate: '1935-05-10',
    deathDate: '2015-02-14',
    birthPlace: 'Gondar, Ethiopia',
    biography: 'Patriarch and traditional school teacher in Gondar.',
    photoUrl: 'https://picsum.photos/seed/kassa/200/200',
    isLinkedToUser: false
  },
  {
    id: 'p2',
    fullName: 'Fatuma Ahmed',
    gender: 'FEMALE',
    birthDate: '1942-08-22',
    deathDate: '2018-11-30',
    birthPlace: 'Harar, Ethiopia',
    biography: 'Known for her legendary coffee ceremonies and Harari textile knowledge.',
    photoUrl: 'https://picsum.photos/seed/fatuma/200/200',
    isLinkedToUser: false
  },
  {
    id: 'p3',
    fullName: 'Mohammed Tadesse',
    gender: 'MALE',
    birthDate: '1968-12-01',
    birthPlace: 'Addis Ababa, Ethiopia',
    biography: 'Bridging cultural heritages as a community leader in Addis.',
    photoUrl: 'https://picsum.photos/seed/mohammed/200/200',
    isLinkedToUser: false
  },
  {
    id: 'p4',
    fullName: 'Abebe Tadesse',
    gender: 'MALE',
    birthDate: '1992-03-15',
    birthPlace: 'Addis Ababa, Ethiopia',
    biography: 'The current family archivist, preserving our mixed heritage.',
    photoUrl: 'https://picsum.photos/seed/abebe/200/200',
    isLinkedToUser: true
  },
  {
    id: 'p5',
    fullName: 'Leyla Ahmed',
    gender: 'FEMALE',
    birthDate: '1995-06-20',
    birthPlace: 'Harar, Ethiopia',
    biography: 'Historian focused on the trade routes of Harar.',
    photoUrl: 'https://picsum.photos/seed/leyla/200/200',
    isLinkedToUser: true
  }
];

export const INITIAL_RELATIONSHIPS: Relationship[] = [
  { id: 'r1', personAId: 'p1', personBId: 'p2', type: 'SPOUSE_OF' },
  { id: 'r2', personAId: 'p1', personBId: 'p3', type: 'PARENT_OF' },
  { id: 'r3', personAId: 'p3', personBId: 'p4', type: 'PARENT_OF' },
  { id: 'r4', personAId: 'p3', personBId: 'p5', type: 'PARENT_OF' }
];

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: 'u1',
    fullName: 'Abebe Tadesse',
    email: 'abebe.t@legacy.et',
    role: UserRole.ADMIN,
    status: MemberStatus.ACTIVE,
    joinedDate: '2023-05-12',
    profilePhoto: 'https://picsum.photos/seed/abebe/100/100',
    // Add missing properties required by FamilyMember/User interface
    subscriptionTier: 'DYNASTY',
    storageUsed: 2.4
  }
];