import {describe,it,expect} from 'vitest'
import {heatIndexCelsius as hi, fahrenheitToCelsius as c, celsiusToFahrenheit as f, formatHeatIndex, thermalAvailability} from '../index'
describe('NOAA Heat Index physics',()=>{
 it('matches the NWS 96 F / 65% reference near 121 F',()=>expect(f(hi(c(96),65)!)).toBeCloseTo(121,0))
 it('humidity strongly raises heat stress at 36 C',()=>expect(hi(36,70)!-hi(36,20)!).toBeGreaterThan(15))
 it('propagates missing/non-numeric humidity and temperature',()=>{for(const v of [null,undefined,NaN,Infinity,'50']){expect(hi(36,v)).toBeNull();expect(hi(v,50)).toBeNull()}})
 it('guards the model domain',()=>{expect(hi(20,50)).toBeNull();expect(hi(36,-1)).toBeNull();expect(hi(36,101)).toBeNull();expect(hi(60,50)).toBeNull()})
 it('is finite or explicitly unavailable across realistic conditions',()=>{for(let t=0;t<=58;t+=2)for(let r=0;r<=100;r+=5){const v=hi(t,r);expect(v===null||Number.isFinite(v)).toBe(true)}})
 it('converts F and C explicitly',()=>{expect(c(104)).toBe(40);expect(f(40)).toBe(104)})
 it('preserves extreme output without displaying an extrapolated absurd number',()=>{expect(formatHeatIndex(hi(50,85))).toBe('> 55°C · Extreme');expect(formatHeatIndex(null)).toBe('Unavailable')})
 it('does not invent UTCI radiation/night behavior or WBGT physics',()=>{expect(thermalAvailability.utci).toMatch(/mean radiant/);expect(thermalAvailability.wbgt).toMatch(/globe/)})
})
