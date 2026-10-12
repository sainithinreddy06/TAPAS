import type {DataProvenance} from './types'
import {ApiError} from './client'
export type DataState<T> =
 | {status:'loading'}
 | {status:'live';data:T;source:string;fetchedAt:string}
 | {status:'cached'|'snapshot';data:T;source:string;originalAt:string;note?:string}
 | {status:'nocoverage'}
 | {status:'error';reason:'timeout'|'offline'|'malformed'|'provider'}
export function dataState<T extends {provenance?:DataProvenance}>(data:T|undefined,loading=false,error?:Error|null):DataState<T>{
 if(data){const p=data.provenance,status=p?.status==='snapshot'?'snapshot':p?.fromCache||error||(p?.validUntil&&Date.parse(p.validUntil)<=Date.now())?'cached':p?.status ?? 'live',source=p?.source ?? 'Source not supplied';return status==='live'?{status,data,source,fetchedAt:p?.fetchedAt ?? ''}:{status,data,source,originalAt:p?.originalAt ?? p?.issuedAt ?? p?.fetchedAt ?? '',note:p?.note}}
 if(loading)return {status:'loading'}
 if(error instanceof ApiError){if(['configuration','no-coverage'].includes(error.kind))return {status:'nocoverage'};return {status:'error',reason:error.kind==='timeout'?'timeout':error.kind==='offline'?'offline':error.kind==='invalid'?'malformed':'provider'}}
 return error?{status:'error',reason:'provider'}:{status:'nocoverage'}
}
