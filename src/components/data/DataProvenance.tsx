'use client'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatDateTime } from '@/lib/utils'
export function DataProvenance({status,source,timestamp,note}:{status:'live'|'cached'|'snapshot'|'unavailable';source?:string|null;timestamp?:string|null;note?:string}){
 const online=useOnlineStatus(),state=status==='live'&&!online?'cached':status
 return <div role="status" data-testid="data-provenance" data-status={state} className="text-xs leading-relaxed"><span className={`inline-flex items-center gap-1 font-semibold ${state==='live'?'text-emerald-400':state==='unavailable'?'text-[var(--text-muted)]':'text-amber-400'}`}><span aria-hidden="true">●</span>{state.toUpperCase()}</span>{state==='unavailable'?' · No data for this location':` · ${source ?? 'Source not supplied'} · ${state==='snapshot'?'Recorded sample':state==='cached'?'Data from':'Valid at'} ${formatDateTime(timestamp)}`}{note?<p className="mt-1 tapas-subtext">{note}</p>:null}</div>
}
