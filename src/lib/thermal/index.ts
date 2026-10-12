// NOAA/NWS Rothfusz regression, including the NWS low/high humidity corrections.
// https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml
// https://www.weather.gov/safety/heat-index (96 F, 65% RH -> about 121 F).
// Heat Index describes shade/light-wind conditions; it is not UTCI or outdoor WBGT.
export const celsiusToFahrenheit = (c: number) => c * 9 / 5 + 32
export const fahrenheitToCelsius = (f: number) => (f - 32) * 5 / 9
export function heatIndexCelsius(temperature: unknown, humidity: unknown): number | null {
  if (typeof temperature !== 'number' || typeof humidity !== 'number' || !Number.isFinite(temperature) || !Number.isFinite(humidity) || temperature < 26.7 || temperature > 58 || humidity < 0 || humidity > 100) return null
  const t = celsiusToFahrenheit(temperature), r = humidity
  // NWS first screens with the simple Steadman approximation averaged with T.
  const simple = (0.5 * (t + 61 + (t - 68) * 1.2 + r * .094) + t) / 2
  if (simple < 80) return null
  let hi = -42.379 + 2.04901523*t + 10.14333127*r - .22475541*t*r - .00683783*t*t - .05481717*r*r + .00122874*t*t*r + .00085282*t*r*r - .00000199*t*t*r*r
  if (r < 13 && t >= 80 && t <= 112) hi -= (13-r)/4 * Math.sqrt((17-Math.abs(t-95))/17)
  if (r > 85 && t >= 80 && t <= 87) hi += (r-85)/10 * (87-t)/5
  const result = fahrenheitToCelsius(hi)
  return Number.isFinite(result) ? result : null
}
// NWS heat-index chart bands, Fahrenheit cutoffs 80/90/103/125.
// These are HI guidance categories, never IMD warnings or a TAPAS mortality-risk level.
export function heatIndexBand(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return null
  const f=celsiusToFahrenheit(value)
  if(f>=125)return {label:'Extreme danger',color:'#741E29',severity:4 as const}
  if(f>=103)return {label:'Danger',color:'#D3443F',severity:3 as const}
  if(f>=90)return {label:'Extreme caution',color:'#EA762B',severity:2 as const}
  if(f>=80)return {label:'Caution',color:'#F6C453',severity:1 as const}
  return null
}
export function formatHeatIndex(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? 'Unavailable' : value > 55 ? '> 55°C · Extreme' : `${value.toFixed(1)}°C`
}
// No vetted MRT/solar-geometry model or natural-wet-bulb/globe inputs are present.
// Radiation alone is not MRT. Do not ship a fabricated sixth-order UTCI input or WBGT proxy.
export const thermalAvailability = {utci:'Unavailable: validated mean radiant temperature model is not connected.',wbgt:'Unavailable: natural wet-bulb and globe temperatures are not supplied.'} as const
