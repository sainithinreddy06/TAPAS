'use client'
import type {DataProvenance as Provenance} from '@/lib/types'
import {dataState} from '@/lib/dataState'
import {DataProvenance} from './DataProvenance'
export function DataStatus({provenance,loading,error,refreshing,label='Data',onRetry}:{provenance?:Provenance;loading?:boolean;error?:Error|null;refreshing?:boolean;label?:string;onRetry?:()=>void}){
 const state=dataState(provenance?{provenance}:undefined,loading,error)
 switch(state.status){
  case 'loading':return <p role="status" className="animate-pulse text-xs tapas-subtext">{label}: loading…</p>
  case 'nocoverage':return <p role="status" className="text-xs tapas-subtext">{label}: unavailable for this location.</p>
  case 'error':return <p role="status" className="text-xs tapas-subtext">{label}: {error?.message??state.reason}{onRetry?<button className="ml-2 min-h-11 underline" onClick={onRetry}>Retry {label.toLowerCase()}</button>:null}</p>
  case 'live':case 'cached':case 'snapshot':return <div className="space-y-1"><p className="text-xs font-medium">{label}{refreshing?' · refreshing':''}</p><DataProvenance status={state.status} source={state.source} timestamp={provenance?.originalAt??provenance?.issuedAt??provenance?.fetchedAt} note={error?`Refresh failed: ${error.message}. Showing previously received data.`:provenance?.validUntil&&Date.parse(provenance.validUntil)<=Date.now()?'Source validity has expired.':provenance?.note}/></div>
 }
}
