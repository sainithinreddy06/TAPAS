import { Phone, TriangleAlert } from 'lucide-react'
import { EMERGENCY_SOURCE, HEALTH_GUIDANCE_SOURCE, HEAT_FIRST_AID_SOURCE } from '@/lib/guidance'

export function EmergencyHelp() {
  return (
    <section id="emergency-help" aria-labelledby="emergency-heading" className="rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="emergency-heading" className="flex items-center gap-2 text-base font-semibold text-red-950"><TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />Heat illness: get help early</h2>
        <a href="tel:112" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Phone className="h-4 w-4" aria-hidden="true" />Call 112 · India emergency</a>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div><h3 className="text-sm font-semibold">Possible heat exhaustion</h3><p className="mt-1 text-sm">Weakness, heavy sweating, headache, dizziness or nausea can signal heat illness. Stop activity, move somewhere cool and seek medical help if unwell. Vomiting needs urgent medical attention.</p></div>
        <div><h3 className="text-sm font-semibold text-red-950">Emergency signs — act immediately</h3><p className="mt-1 text-sm">Confusion, seizures or unconsciousness during heat exposure need urgent medical assistance. Call 112. Move the person to a cool place if possible and apply cool water to skin or clothing while waiting. Do not give an unconscious person drinks.</p></div>
      </div>
      <p className="mt-3 text-xs text-red-950">Symptoms need professional assessment. The phone action opens your dialler; TAPAS does not dispatch an ambulance.</p>
      <p className="mt-2 text-xs text-red-950">Official references: <a className="underline" href={HEALTH_GUIDANCE_SOURCE} target="_blank" rel="noopener noreferrer">NDMA</a> · <a className="underline" href={HEAT_FIRST_AID_SOURCE} target="_blank" rel="noopener noreferrer">IMD first aid</a> · <a className="underline" href={EMERGENCY_SOURCE} target="_blank" rel="noopener noreferrer">Government of India ERSS 112</a></p>
    </section>
  )
}
