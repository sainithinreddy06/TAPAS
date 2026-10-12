'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@/components/providers/LocationProvider'
import { locationKey } from '@/lib/location'
import { api } from '@/lib/api'
export function useAlerts(level = 1, limit = 50) {
  const {location, selectedDate} = useLocation()
  return useQuery({ queryKey: ['alerts', locationKey(location), selectedDate, level, limit], queryFn: ({signal}) => api.alerts(level, limit, location!, selectedDate, signal), enabled: !!location, staleTime: 600_000, gcTime: 86400_000, retry: false })
}
export function useHindcast() { return useQuery({queryKey: ['hindcast'], queryFn: () => api.hindcast(), retry: false, staleTime: Infinity}) }
