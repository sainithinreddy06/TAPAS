export type EntryRole = 'citizen' | 'officer' | 'authority'

export const ENTRY_ROLES = [
  {
    id: 'citizen',
    label: 'Citizen',
    shortLabel: 'Citizen',
    description: 'Know your local heat risk.',
    cta: 'Open Dashboard',
    href: '/dashboard',
    scaleLabel: 'Human scale',
    topics: ['Thermal stress', 'Local exposure', 'Heat alerts'],
  },
  {
    id: 'officer',
    label: 'Mandal Officer',
    shortLabel: 'Mandal',
    description: 'Turn local heat intelligence into field action.',
    cta: 'Officer Login',
    href: '/login?role=officer',
    scaleLabel: 'Mandal scale',
    topics: ['Local hotspots', 'Field response', 'Vulnerable zones'],
  },
  {
    id: 'authority',
    label: 'District Authority',
    shortLabel: 'District',
    description: 'See district-wide risk before response decisions are made.',
    cta: 'Authority Login',
    href: '/login?role=authority',
    scaleLabel: 'District scale',
    topics: ['District risk', 'Resource priority', 'Operational readiness'],
  },
] as const satisfies ReadonlyArray<{
  id: EntryRole
  label: string
  shortLabel: string
  description: string
  cta: string
  href: string
  scaleLabel: string
  topics: readonly string[]
}>
