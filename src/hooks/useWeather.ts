'use client'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from '@/components/providers/LocationProvider'
import { locationKey } from '@/lib/location'
import { fetchWeather, weatherSnapshot } from '@/lib/weather'
export function useWeather() {
  const {location,selectedDate} = useLocation()
  return useQuery({queryKey:['weather',locationKey(location),selectedDate],queryFn:({signal})=>fetchWeather(location!,selectedDate,signal),enabled:!!location,initialData:location?weatherSnapshot(location,selectedDate):undefined,initialDataUpdatedAt:0,staleTime:10 * 60_000,gcTime:86400_000,retry:false})
}
