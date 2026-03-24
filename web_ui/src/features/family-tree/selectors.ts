import type { PersonProfile, Relationship } from '@/types';
import type { TreeRelationRow } from './types';

const parentRelationshipTypes = new Set<Relationship['type']>(['PARENT_OF', 'ADOPTIVE_PARENT_OF']);
const sameGenerationTypes = new Set<Relationship['type']>(['SPOUSE_OF', 'SIBLING_OF']);

export const birthYearValue = (profile: PersonProfile): number => {
  const year = Number((profile.birthDate || '').split('-')[0]);
  return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER;
};

export const sortProfiles = (items: PersonProfile[]): PersonProfile[] =>
  [...items].sort((a, b) => {
    const byYear = birthYearValue(a) - birthYearValue(b);
    if (byYear !== 0) return byYear;
    return a.fullName.localeCompare(b.fullName);
  });

export const buildProfileById = (profiles: PersonProfile[]): Map<string, PersonProfile> =>
  new Map(profiles.map((profile) => [profile.id, profile]));

export const buildRelationRows = (params: {
  relationships: Relationship[];
  profileById: Map<string, PersonProfile>;
  unknownLabel: string;
  relationshipLabel: (type: Relationship['type']) => string;
}): TreeRelationRow[] => {
  const { relationships, profileById, unknownLabel, relationshipLabel } = params;
  return relationships.map((relationship) => {
    const personAName = profileById.get(relationship.personAId)?.fullName || unknownLabel;
    const personBName = profileById.get(relationship.personBId)?.fullName || unknownLabel;
    const summary = `${personAName} ${relationshipLabel(relationship.type)} ${personBName}`;

    return {
      ...relationship,
      personAName,
      personBName,
      summary,
    };
  });
};

export const buildTreeLevels = (
  profiles: PersonProfile[],
  relationships: Relationship[],
): PersonProfile[][] => {
  if (!profiles.length) return [];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  profiles.forEach((profile) => {
    indegree.set(profile.id, 0);
    children.set(profile.id, []);
  });

  relationships.forEach((relationship) => {
    if (!parentRelationshipTypes.has(relationship.type)) return;
    if (!profileById.has(relationship.personAId) || !profileById.has(relationship.personBId)) return;

    children.get(relationship.personAId)?.push(relationship.personBId);
    indegree.set(relationship.personBId, (indegree.get(relationship.personBId) || 0) + 1);
  });

  const pendingInDegree = new Map(indegree);
  const levelById = new Map<string, number>();
  const queue = Array.from(indegree.entries())
    .filter(([, value]) => value === 0)
    .map(([id]) => id)
    .sort((a, b) => {
      const profileA = profileById.get(a)!;
      const profileB = profileById.get(b)!;
      const byYear = birthYearValue(profileA) - birthYearValue(profileB);
      if (byYear !== 0) return byYear;
      return profileA.fullName.localeCompare(profileB.fullName);
    });

  queue.forEach((id) => levelById.set(id, 0));

  while (queue.length) {
    const currentId = queue.shift()!;
    const parentLevel = levelById.get(currentId) || 0;

    (children.get(currentId) || []).forEach((childId) => {
      const nextLevel = parentLevel + 1;
      const previousLevel = levelById.get(childId);
      if (previousLevel === undefined || nextLevel > previousLevel) {
        levelById.set(childId, nextLevel);
      }

      const nextDegree = (pendingInDegree.get(childId) || 0) - 1;
      pendingInDegree.set(childId, nextDegree);
      if (nextDegree <= 0) {
        queue.push(childId);
      }
    });
  }

  let iterations = 0;
  let didChange = true;
  while (didChange && iterations < profiles.length) {
    didChange = false;
    iterations += 1;

    relationships.forEach((relationship) => {
      if (!sameGenerationTypes.has(relationship.type)) return;
      const levelA = levelById.get(relationship.personAId);
      const levelB = levelById.get(relationship.personBId);
      if (levelA === undefined || levelB === undefined) return;

      const nextLevel = Math.max(levelA, levelB);
      if (levelA !== nextLevel) {
        levelById.set(relationship.personAId, nextLevel);
        didChange = true;
      }
      if (levelB !== nextLevel) {
        levelById.set(relationship.personBId, nextLevel);
        didChange = true;
      }
    });
  }

  profiles.forEach((profile) => {
    if (!levelById.has(profile.id)) {
      levelById.set(profile.id, 0);
    }
  });

  const grouped = new Map<number, PersonProfile[]>();
  profiles.forEach((profile) => {
    const level = levelById.get(profile.id) || 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level)!.push(profile);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, members]) => sortProfiles(members));
};
