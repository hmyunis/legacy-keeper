import { describe, expect, it } from 'vitest';
import type { PersonProfile, Relationship } from '@/types';
import {
  birthYearValue,
  buildProfileById,
  buildRelationRows,
  buildTreeLevels,
  sortProfiles,
} from './selectors';

const buildProfile = (overrides: Partial<PersonProfile>): PersonProfile => ({
  id: 'person-1',
  fullName: 'Person One',
  gender: 'MALE',
  birthDate: '1950-01-01',
  biography: '',
  photoUrl: 'https://example.com/photo.jpg',
  isLinkedToUser: false,
  ...overrides,
});

const buildRelationship = (overrides: Partial<Relationship>): Relationship => ({
  id: 'rel-1',
  personAId: 'person-a',
  personBId: 'person-b',
  type: 'PARENT_OF',
  ...overrides,
});

describe('family tree selectors', () => {
  it('reads birth year and sorts profiles by birth year then name', () => {
    const profiles = [
      buildProfile({ id: '2', fullName: 'Zed', birthDate: '1970-01-01' }),
      buildProfile({ id: '1', fullName: 'Ada', birthDate: '1970-01-01' }),
      buildProfile({ id: '3', fullName: 'Bob', birthDate: '1960-01-01' }),
    ];

    expect(birthYearValue(profiles[0])).toBe(1970);
    expect(sortProfiles(profiles).map((profile) => profile.id)).toEqual(['3', '1', '2']);
  });

  it('builds profile map and relation rows with summary labels', () => {
    const profileById = buildProfileById([
      buildProfile({ id: 'a', fullName: 'Alice' }),
      buildProfile({ id: 'b', fullName: 'Bob' }),
    ]);

    const rows = buildRelationRows({
      relationships: [
        buildRelationship({ id: 'rel-1', personAId: 'a', personBId: 'b', type: 'SPOUSE_OF' }),
        buildRelationship({ id: 'rel-2', personAId: 'x', personBId: 'b', type: 'SIBLING_OF' }),
      ],
      profileById,
      unknownLabel: 'Unknown',
      relationshipLabel: (type) => (type === 'SPOUSE_OF' ? 'spouse of' : 'sibling of'),
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].summary).toBe('Alice spouse of Bob');
    expect(rows[1].personAName).toBe('Unknown');
    expect(rows[1].summary).toBe('Unknown sibling of Bob');
  });

  it('groups tree levels from parent and same-generation relationships', () => {
    const profiles = [
      buildProfile({ id: 'a', fullName: 'Parent A', birthDate: '1950-01-01' }),
      buildProfile({ id: 'b', fullName: 'Parent B', birthDate: '1952-01-01' }),
      buildProfile({ id: 'c', fullName: 'Child C', birthDate: '1980-01-01' }),
      buildProfile({ id: 'd', fullName: 'Sibling D', birthDate: '1981-01-01' }),
    ];

    const relationships = [
      buildRelationship({ id: 'rel-1', personAId: 'a', personBId: 'c', type: 'PARENT_OF' }),
      buildRelationship({ id: 'rel-2', personAId: 'a', personBId: 'b', type: 'SPOUSE_OF' }),
      buildRelationship({ id: 'rel-3', personAId: 'c', personBId: 'd', type: 'SIBLING_OF' }),
    ];

    const levels = buildTreeLevels(profiles, relationships);

    expect(levels).toHaveLength(2);
    expect(levels[0].map((profile) => profile.id)).toEqual(['a', 'b']);
    expect(levels[1].map((profile) => profile.id)).toEqual(['c', 'd']);
  });
});
