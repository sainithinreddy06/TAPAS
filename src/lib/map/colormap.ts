export type HeatMetric = 'utci' | 'heat_index' | 'temperature'
export type Colour = [number, number, number]
export type ColourStop = [number, Colour]
export const UTCI_STOPS: ColourStop[] = [
  [9, [46,84,140]], [20, [62,134,160]], [26, [84,166,140]], [30, [130,180,100]],
  [32, [196,190,70]], [35, [232,176,52]], [38, [232,130,44]], [42, [212,78,46]],
  [46, [176,42,46]], [52, [110,24,36]],
]
export const HI_STOPS: ColourStop[] = [
  [20, [46,84,140]], [27, [84,166,140]], [32, [196,190,70]],
  [41, [232,130,44]], [54, [176,42,46]], [62, [110,24,36]],
]
// Air temperature is a physical temperature scale, not a UTCI stress category.
export const TEMPERATURE_STOPS: ColourStop[] = [
  [0,[46,84,140]], [15,[62,134,160]], [25,[84,166,140]], [30,[196,190,70]],
  [35,[232,176,52]], [40,[232,130,44]], [45,[176,42,46]], [50,[110,24,36]],
]
export const metricLabel = (metric: HeatMetric) => metric === 'utci' ? 'UTCI' : metric === 'heat_index' ? 'Heat Index' : 'Air temperature'
export const colourStops = (metric: HeatMetric) => metric === 'utci' ? UTCI_STOPS : metric === 'heat_index' ? HI_STOPS : TEMPERATURE_STOPS

export function colourFor(value: number, metric: HeatMetric): Colour {
  const stops = colourStops(metric)
  if (!Number.isFinite(value)) return [0,0,0]
  if (value <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [v1,c1] = stops[i], [v0,c0] = stops[i-1]
    if (value <= v1) {
      const t = (value-v0)/(v1-v0)
      return c0.map((c,j) => Math.round(c + (c1[j]-c)*t)) as Colour
    }
  }
  return stops[stops.length-1][1]
}
export const colourCss = (value: number, metric: HeatMetric) => `rgb(${colourFor(value, metric).join(',')})`
export function colourGradient(metric: HeatMetric) {
  const stops = colourStops(metric), min = stops[0][0], span = stops[stops.length-1][0]-min
  return `linear-gradient(to right, ${stops.map(([v,c]) => `rgb(${c.join(',')}) ${(v-min)/span*100}%`).join(', ')})`
}
export function stressLabel(value: number | null, metric: HeatMetric): string {
  if (value === null || !Number.isFinite(value)) return 'Unavailable'
  if (metric === 'temperature') return 'Air temperature'
  if (metric === 'heat_index') return value >= 54 ? 'Extreme danger' : value >= 41 ? 'Danger' : value >= 32 ? 'Extreme caution' : value >= 27 ? 'Caution' : 'Below caution'
  return value >= 46 ? 'Extreme' : value >= 38 ? 'Very strong' : value >= 32 ? 'Strong' : value >= 26 ? 'Moderate' : value >= 9 ? 'No thermal stress' : 'Cold stress'
}
export const legendTicks = (metric: HeatMetric): [number,string][] => metric === 'utci'
  ? [[9,'none'],[26,'moderate'],[32,'strong'],[38,'v. strong'],[46,'extreme']]
  : metric === 'heat_index' ? [[20,'below caution'],[27,'caution'],[32,'ext. caution'],[41,'danger'],[54,'ext. danger']]
  : [[0,''],[15,''],[25,''],[35,''],[45,'']]
