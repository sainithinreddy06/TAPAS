'use client'

import { useQuery } from '@tanstack/react-query'
import { locationKey, type SelectedLocation } from '@/lib/location'
import { fetchResources, recordedResources, OVERPASS_URL, RESOURCE_RADIUS_KM } from '@/lib/resources'

export const resourcesKey = (location: SelectedLocation | null) => ['nearby-resources', OVERPASS_URL, locationKey(location), RESOURCE_RADIUS_KM] as const

export function useResources(location: SelectedLocation | null) {
  return useQuery({
    queryKey: resourcesKey(location),
    queryFn: ({ signal }) => {
      if (!location) throw new Error('Select a location to find nearby help.')
      return fetchResources(location, signal)
    },
    enabled: Boolean(location),
    initialData: () => location ? recordedResources(location) : undefined,
    initialDataUpdatedAt: 0,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    // No previous-location placeholder: list and map always share this exact query.
  })
}
