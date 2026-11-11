export interface Achievement {
  id: string
  name: string
  description: string
  glyph: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    name: 'First Steps on Starlight',
    description: 'Set foot in a lost world and answer the beacon.',
    glyph: '✦',
  },
  {
    id: 'fully-equipped',
    name: 'Fully Equipped',
    description: 'Recover all five gadgets in a single expedition.',
    glyph: '◆',
  },
  {
    id: 'shardkeeper',
    name: 'Shardkeeper',
    description: 'Collect every Star Shard in one expedition.',
    glyph: '✧',
  },
  {
    id: 'archivist',
    name: 'Meadow Archivist',
    description: 'Find both hidden data capsules in one expedition.',
    glyph: '▤',
  },
  {
    id: 'untouched',
    name: 'Untouched',
    description: 'Complete the expedition without taking damage.',
    glyph: '◇',
  },
  {
    id: 'beacon-lit',
    name: 'Beacon Lit',
    description: 'Recover a Starlight Engine fragment.',
    glyph: '★',
  },
]

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id)
}
