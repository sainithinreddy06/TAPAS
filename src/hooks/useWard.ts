'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@/components/providers/LocationProvider'
import { api } from '@/lib/api'
import { locationKey } from '@/lib/location'
import { FORECAST_DAYS } from '@/lib/constants'
const options = {staleTime: 15 * 60_000, gcTime: 86400_000, retry: false}
export function useWardForecast(wardId: string | null) {
  const {location, selectedDate} = useLocation()
  return useQuery({ ...options, queryKey: ['ward-forecast', locationKey(location), wardId, selectedDate], queryFn: ({signal}) => api.wardForecast(wardId!, location!, selectedDate, signal), enabled: !!location && !!wardId })
}
export function useWardRisk(wardId: string | null, days = FORECAST_DAYS) {
  const {location, selectedDate} = useLocation()
  return useQuery({ ...options, queryKey: ['ward-risk', locationKey(location), wardId, selectedDate, days], queryFn: ({signal}) => api.wardRisk(wardId!, days, location!, selectedDate, signal), enabled: !!location && !!wardId })
}
export function useWardFacilities(wardId: string | null) {
  const {location} = useLocation()
  return useQuery({ ...options, queryKey: ['ward-facilities', locationKey(location), wardId], queryFn: ({signal}) => api.facilities(wardId!, location!, signal), enabled: !!location && !!wardId })
}
export function useOccupational(wardId: string | null, date: string) {
  const {location} = useLocation()
  return useQuery({ ...options, queryKey: ['occupational', locationKey(location), wardId, date], queryFn: ({signal}) => api.occupational(wardId!, date, location!, signal), enabled: !!location && !!wardId })
}
export function useWard(wardId: string | null, days = FORECAST_DAYS) {
  const forecast = useWardForecast(wardId), risk = useWardRisk(wardId, days), facilities = useWardFacilities(wardId)
  return { forecast, risk, facilities, isLoading: forecast.isLoading || risk.isLoading, isError: forecast.isError || risk.isError }
}
