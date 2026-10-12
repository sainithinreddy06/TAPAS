import { latitudeAtRow, validBounds, type FieldBounds } from './sampling'

export interface FieldJob { id: number; samples: Float64Array; bbox: FieldBounds; outW: number; outH: number; power: number }
export interface FieldResult { id: number; field: Float32Array; outW: number; outH: number; durationMs: number }

/** Packed samples are lat, lon, value. Runs only in the Web Worker in the app. */
export function interpolateField({samples,bbox,outW,outH,power}: Omit<FieldJob,'id'>): Float32Array {
  if (!validBounds(bbox) || outW < 2 || outH < 2 || outW*outH > 250_000 || !Number.isFinite(power) || power <= 0) throw new Error('Invalid field specification')
  const field = new Float32Array(outW*outH)
  field.fill(NaN)
  const valid: [number,number,number][] = []
  const seen = new Set<string>()
  for (let i = 0; i+2 < samples.length; i += 3) {
    const lat=samples[i], lon=samples[i+1], value=samples[i+2], key=`${lat},${lon}`
    if ([lat,lon,value].every(Number.isFinite) && Math.abs(lat)<85 && Math.abs(lon)<=180 && !seen.has(key)) {
      seen.add(key); valid.push([lat,lon,value])
    }
  }
  if (valid.length < 3) return field
  const [west,south,east,north]=bbox, cos=Math.cos((north+south)*Math.PI/360)
  const spacing=Math.sqrt((north-south)*(east-west)*cos/valid.length), radius=spacing*1.6, radiusSq=radius*radius
  // Spatial buckets avoid scanning the entire sample set for every output pixel.
  const buckets = new Map<string, [number,number,number][]>()
  const bucketKey = (lat:number,lon:number) => `${Math.floor((lon-west)*cos/radius)},${Math.floor((lat-south)/radius)}`
  for (const sample of valid) {
    const key=bucketKey(sample[0],sample[1]), bucket=buckets.get(key) ?? []
    bucket.push(sample); buckets.set(key,bucket)
  }
  for (let y=0;y<outH;y++) {
    const lat=latitudeAtRow(y,outH,bbox), rowCos=Math.cos(lat*Math.PI/180), by=Math.floor((lat-south)/radius)
    const reachX=Math.ceil(cos/rowCos)
    for (let x=0;x<outW;x++) {
      const lon=west+x/(outW-1)*(east-west), bx=Math.floor((lon-west)*cos/radius)
      let numerator=0, denominator=0, exact=NaN
      for(let dy=-1;dy<=1;dy++) for(let dx=-reachX;dx<=reachX;dx++) {
        const bucket=buckets.get(`${bx+dx},${by+dy}`)
        if (!bucket) continue
        for (const [slat,slon,value] of bucket) {
          const dLat=lat-slat, dLon=(lon-slon)*rowCos, d2=dLat*dLat+dLon*dLon
          if (d2<1e-12) { exact=value; continue }
          if (d2>radiusSq) continue
          const weight=Math.pow(d2,-power/2)
          numerator+=weight*value; denominator+=weight
        }
      }
      field[y*outW+x]=Number.isFinite(exact) ? exact : denominator>0 ? numerator/denominator : NaN
    }
  }
  return field
}
