/**
 * Seed contacts for the officer "Prepare Response" demo workflow.
 * These are fictional placeholders for a UI walkthrough, not real people.
 * No message is ever sent to them — see PrepareResponseTrigger.
 */
export interface DemoContact {
  id: string
  role: string
}

export const DEMO_COMMUNITY_CONTACTS: DemoContact[] = [
  { id: 'demo-contact-1', role: 'Ward volunteer coordinator (demo)' },
  { id: 'demo-contact-2', role: 'Local ASHA worker (demo)' },
  { id: 'demo-contact-3', role: 'Resident welfare association lead (demo)' },
]
