/** Mock archive for the 3D vault orbit — Kebede family narrative. */

export interface VaultMemory {
  id: number;
  url: string;
  title: string;
  location: string;
  year: string;
  date: string;
  caption: string;
  people: string[];
  tags: string[];
}

export interface VaultCluster {
  name: string;
  angle: number;
  memories: VaultMemory[];
}

const SAFE_IDS = [
  '1542038784456-1ea8e935640e',
  '1582213782179-e0d53f98f2ca',
  '1511895426328-dc8714191300',
  '1532274402911-5a369e4c4bb5'
];

const img = (id: number) => `https://images.unsplash.com/photo-${SAFE_IDS[id % SAFE_IDS.length]}?auto=format&fit=crop&w=1200&q=80`;

export const VAULT_MEMORY_CLUSTERS: VaultCluster[] = [
  {
    name: 'Milestones',
    angle: 0,
    memories: [
      {
        id: 1,
        url: img(1),
        title: 'Abebe’s Graduation',
        location: 'Harar',
        year: '1962',
        date: '12 June 1962',
        caption:
          'Abebe Kebede in cap and gown outside the school gates. Uncle Tomas pinned a gold ribbon on his lapel while the family applauded from the steps.',
        people: ['Abebe Kebede', 'Tomas Kebede'],
        tags: ['Education', 'Harar', 'Pride'],
      },
      {
        id: 2,
        url: img(2),
        title: 'First Automobile',
        location: 'Addis Ababa',
        year: '1968',
        date: '3 March 1968',
        caption:
          'The family’s first Volkswagen parked outside the house on Churchill Avenue. Yohannes insisted everyone pose before the first drive to Entoto.',
        people: ['Abebe Kebede', 'Fatima Kebede', 'Yohannes Kebede'],
        tags: ['Milestone', 'Transport'],
      },
      {
        id: 3,
        url: img(3),
        title: 'Shop Opening Day',
        location: 'Mercato, Addis Ababa',
        year: '1971',
        date: '18 September 1971',
        caption:
          'Ribbon-cutting at Abebe’s textile stall. Neighbors brought injera baskets; someone hung a hand-painted sign that read “Kebede & Sons.”',
        people: ['Abebe Kebede', 'Fatima Kebede'],
        tags: ['Work', 'Celebration'],
      },
      {
        id: 4,
        url: img(4),
        title: 'Golden Anniversary',
        location: 'Family Home, Addis Ababa',
        year: '2004',
        date: '22 January 2004',
        caption:
          'Fifty years of marriage marked with candlelight and grandchildren circling the garden. Fatima wore the same shawl from their wedding portrait.',
        people: ['Abebe Kebede', 'Fatima Kebede', 'Extended Kebede kin'],
        tags: ['Anniversary', 'Lineage'],
      },
    ],
  },
  {
    name: 'Gatherings',
    angle: Math.PI * 0.4,
    memories: [
      {
        id: 5,
        url: img(5),
        title: 'The Wedding Feast',
        location: 'Addis Ababa',
        year: '1954',
        date: '8 July 1954',
        caption:
          'Abebe and Fatima seated beneath woven umbrellas while guests share wat and honey wine. Someone’s camera caught the moment the drums began.',
        people: ['Abebe Kebede', 'Fatima Kebede'],
        tags: ['Wedding', 'Tradition', 'Feast'],
      },
      {
        id: 6,
        url: img(6),
        title: 'Entoto Picnic',
        location: 'Entoto Hills',
        year: '1975',
        date: '15 August 1975',
        caption:
          'A spread of mangoes and doro wat on a gabi blanket. The children chased each other through eucalyptus while elders told stories of the old capital.',
        people: ['Kebede children', 'Abebe Kebede', 'Fatima Kebede'],
        tags: ['Summer', 'Outdoors', 'Children'],
      },
      {
        id: 7,
        url: img(7),
        title: 'Timkat Morning',
        location: 'Gondar',
        year: '1985',
        date: '19 January 1985',
        caption:
          'White-clad procession near the baths at Fasil Ghebbi. Cousins traveled north by bus; this frame caught the mist and the crosses held high.',
        people: ['Kebede cousins', 'Church community'],
        tags: ['Timkat', 'Faith', 'Travel'],
      },
      {
        id: 8,
        url: img(8),
        title: 'Coffee Ceremony',
        location: 'Addis Ababa',
        year: '1992',
        date: '4 December 1992',
        caption:
          'Fatima roasting beans on the mitad while grandchildren practiced Amharic homework at the table. Frankincense smoke softened the afternoon light.',
        people: ['Fatima Kebede', 'Grandchildren'],
        tags: ['Daily life', 'Coffee', 'Home'],
      },
    ],
  },
  {
    name: 'Homelands',
    angle: Math.PI * 0.8,
    memories: [
      {
        id: 9,
        url: img(9),
        title: 'Harar Gate at Dawn',
        location: 'Harar',
        year: '1948',
        date: 'Unknown spring 1948',
        caption:
          'Young Abebe standing by the old city wall before the family moved west. Faded ink on the back reads “first journey away from mother’s house.”',
        people: ['Abebe Kebede (youth)'],
        tags: ['Harar', 'Childhood', 'Archive'],
      },
      {
        id: 10,
        url: img(10),
        title: 'Palm Sunday',
        location: 'Holy Trinity Cathedral',
        year: '1960',
        date: 'April 1960',
        caption:
          'Palm fronds and polished shoes outside the cathedral steps. The Kebedes always saved a place in the third row for grandmother’s hymn book.',
        people: ['Kebede family'],
        tags: ['Faith', 'Addis Ababa'],
      },
      {
        id: 11,
        url: img(11),
        title: 'Train to Dire Dawa',
        location: 'Ethio-Djibouti Railway',
        year: '1982',
        date: '11 March 1982',
        caption:
          'Suitcases lashed with rope on the platform. The family was relocating for work; Yohannes waved from the window as the whistle blew.',
        people: ['Yohannes Kebede', 'Abebe Kebede'],
        tags: ['Migration', 'Railway'],
      },
      {
        id: 12,
        url: img(12),
        title: 'Rain over Entoto',
        location: 'Entoto',
        year: '1994',
        date: '30 July 1994',
        caption:
          'Mist rolling through pines during Abebe’s fiftieth birthday picnic—the same day this archive labels “summer in the hills.”',
        people: ['Kebede family', 'Friends'],
        tags: ['Entoto', 'Birthday', 'On this day'],
      },
    ],
  },
  {
    name: 'Portraits',
    angle: Math.PI * 1.2,
    memories: [
      {
        id: 13,
        url: img(13),
        title: 'Studio Portrait',
        location: 'Addis Ababa',
        year: '1956',
        date: 'Winter 1956',
        caption:
          'Formal sitting for the wedding album: Abebe in a dark suit, Fatima in netela. The photographer asked them not to smile “so the silver plate lasts.”',
        people: ['Abebe Kebede', 'Fatima Kebede'],
        tags: ['Portrait', 'Wedding album'],
      },
      {
        id: 14,
        url: img(14),
        title: 'Grandmother Selam',
        location: 'Harar',
        year: '1938',
        date: 'c. 1938',
        caption:
          'The only surviving print of Selam Kebede, seamstress and keeper of family names. Creases show it was folded inside a Bible for decades.',
        people: ['Selam Kebede'],
        tags: ['Ancestor', 'Restored'],
      },
      {
        id: 15,
        url: img(15),
        title: 'Cousins on the Porch',
        location: 'Dire Dawa',
        year: '1978',
        date: 'Easter 1978',
        caption:
          'Three cousins in matching dresses sewn by Fatima. Someone wrote “Fasika” in blue ink along the white border.',
        people: ['Kebede cousins'],
        tags: ['Children', 'Easter', 'Fasika'],
      },
    ],
  },
  {
    name: 'Keepsakes',
    angle: Math.PI * 1.6,
    memories: [
      {
        id: 16,
        url: img(16),
        title: 'Passport & Letters',
        location: 'Family archive',
        year: '1979',
        date: 'Archived 1979',
        caption:
          'Scanned pages from Abebe’s travel folder: a visa stamp, two aerograms in Amharic, and a pressed eucalyptus leaf from Entoto.',
        people: ['Abebe Kebede'],
        tags: ['Documents', 'Scan'],
      },
      {
        id: 17,
        url: img(17),
        title: 'Album Spread',
        location: 'Kebede vault',
        year: '2010',
        date: 'Digitized 2010',
        caption:
          'Flat-bed scan of a leather album opened to the wedding feast. Tape marks and handwritten captions were preserved during restoration.',
        people: ['Various Kebede kin'],
        tags: ['Album', 'Restoration'],
      },
      {
        id: 18,
        url: img(18),
        title: 'Festival Night',
        location: 'Gondar',
        year: '1985',
        date: 'September 1985',
        caption:
          'Lanterns and drums after Timkat eve. Long exposure blurred the dancers; Abebe kept this frame for the glow on the children’s faces.',
        people: ['Kebede cousins', 'Neighbors'],
        tags: ['Festival', 'Night'],
      },
      {
        id: 19,
        url: img(19),
        title: 'New Grandchild',
        location: 'Black Lion Hospital, Addis Ababa',
        year: '2018',
        date: '2 May 2018',
        caption:
          'First photograph of the newest Kebede: swaddled and passed carefully between generations in the waiting room.',
        people: ['Kebede grandchildren', 'Parents'],
        tags: ['Birth', 'Recent'],
      },
    ],
  },
];