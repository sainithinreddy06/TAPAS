'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@/components/providers/LocationProvider'
import { api } from '@/lib/api'
import { fetchGeometry } from '@/lib/geometry'
import { locationKey } from '@/lib/location'
import type { RiskMapResponse, WardRisk } from '@/lib/types'
export const riskMapKey = (date: string, key = 'unselected') => ['risk-map', key, date] as const
export function useRiskMap(date: string) {
  const { location } = useLocation()
  return useQuery({ queryKey: riskMapKey(date, locationKey(location)), queryFn: ({signal}) => api.riskMap(date, location!, signal), enabled: !!location, staleTime: 15 * 60_000, gcTime: 86400_000, retry: false })
}
export function useRiskRanking(date: string, limit = 10) {
  const query = useRiskMap(date)
  return { ...query, data: query.data ? { ...query.data, wards: [...query.data.wards].sort((a,b) => (b.risk_level ?? -1) - (a.risk_level ?? -1) || (b.utci_max ?? -Infinity) - (a.utci_max ?? -Infinity) || a.ward_id.localeCompare(b.ward_id)).slice(0, limit) } : undefined }
}
export function useWardGeojson() {
  const {location} = useLocation()
  return useQuery({ queryKey: ['geometry', locationKey(location)], queryFn: ({signal}) => fetchGeometry(location!, signal), enabled: !!location, staleTime: 86400_000, gcTime: 86400_000, retry: false })
}
export function findWard(data: RiskMapResponse | undefined, wardId: string | null): WardRisk | undefined { return data?.wards.find(w => w.ward_id === wardId) }
