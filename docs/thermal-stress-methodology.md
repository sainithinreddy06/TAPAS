# Human Thermal Stress Index & Biometeorological Methodology

**TAPAS — Thermal Analytics & Public-health Advisory System**  
*SIH26083: Ministry of Earth Sciences / NCMRWF*

---

## 1. Executive Summary

Standard meteorological applications report dry-bulb air temperature, which measures sensible heat in shade. In the human body, thermoregulation relies primarily on evaporative sweat loss and convective heat dissipation. Under conditions of high humidity, elevated mean radiant temperature (MRT), and stagnant air velocity, air temperature drastically understates true physiological strain.

TAPAS calculates the **Human Thermal Stress Index (0–10)**, mapping the Universal Thermal Climate Index (UTCI) and WBGT physical biometeorology into a normalised, operational scale.

---

## 2. Universal Thermal Climate Index (UTCI) Framework

- **Standard**: COST Action 730 / WMO Commission for Climatology.
- **Biometeorological Engine**: Multi-node human heat balance model coupled with the Fiala thermal physiology model (187 tissue nodes).
- **Reference Activity**: Walking at 4 km/h (metabolic heat production rate $M = 135 \text{ W/m}^2 \approx 2.3 \text{ MET}$).

### 2.1 Governing Variables & Units

1. **Air Temperature ($T_a$)**: Dry-bulb temperature in degrees Celsius (°C). Range valid: $-50^\circ\text{C}$ to $+50^\circ\text{C}$.
2. **Relative Humidity ($RH$)** or **Water Vapour Pressure ($p_a$)**: % or kPa. Determines the evaporative resistance and maximum sweat vaporization rate $E_{max}$.
3. **Wind Speed ($v_{10m}$ or $v_{a}$)**: Relative air velocity at $10\text{ m}$ elevation transformed to human torso height ($1.1\text{ m}$).
4. **Mean Radiant Temperature ($T_{mrt}$)**: Uniform temperature of an imaginary enclosure radiating the same energy as shortwave direct solar radiation, diffuse atmospheric radiation, and longwave ground radiation.

---

## 3. Normalised 0–10 Index Presentation

To provide immediate operational clarity for municipal officers and citizens, UTCI (°C) is normalised to a 0–10 scale:

| UTCI (°C) | Normalised Scale (0–10) | Physiological Category | Human Heat Stress Reaction |
|:---:|:---:|:---:|:---|
| $< +26^\circ\text{C}$ | $0.0 - 3.9$ | **LOW / NO STRESS** | Thermal neutrality; basal sweating. |
| $+26^\circ\text{C} \text{ to } +32^\circ\text{C}$ | $4.0 - 5.9$ | **MODERATE** | Increased skin blood flow; light sweating. |
| $+32^\circ\text{C} \text{ to } +38^\circ\text{C}$ | $6.0 - 7.4$ | **HIGH** | Elevated cardiac output; heavy sweating; dehydration risk. |
| $+38^\circ\text{C} \text{ to } +46^\circ\text{C}$ | $7.5 - 8.9$ | **VERY HIGH** | Impaired sweat evaporation; heat exhaustion threshold. |
| $> +46^\circ\text{C}$ | $9.0 - 10.0$ | **EXTREME** | Acute cardiovascular collapse; fatal heat stroke threat. |

---

## 4. Factor Percentage Contributions

The relative contribution of each parameter to total excess thermal strain is calculated dynamically via partial derivatives of the polynomial regression:

$$\Delta \text{Strain} \propto w_{T_a} \cdot \Delta T_a + w_{RH} \cdot \Delta RH - w_{v} \cdot \Delta v + w_{MRT} \cdot \Delta T_{mrt}$$

Example in high-humidity conditions (e.g. 41.2°C, 68% RH):
- **Air Temperature**: Contributes **34%**
- **Relative Humidity**: Contributes **31%** (suppressing sweat dissipation)
- **Wind Speed Deficit**: Contributes **19%**
- **Radiant Heat (MRT)**: Contributes **16%**

---

## 5. Occupational Standards (ACGIH TLV & ISO 7243)

For industrial and mining operations (e.g., Singareni Block C), work/rest cycles are derived from Wet Bulb Globe Temperature (WBGT) and metabolic work rates:

| WBGT Index (°C) | Light Work (200W) | Moderate Work (300W) | Heavy Outdoor Labour (415W) |
|:---:|:---:|:---:|:---:|
| $\le 28.0^\circ\text{C}$ | Continuous work | Continuous work | Continuous work |
| $28.0 - 30.0^\circ\text{C}$ | Continuous work | 75% work / 25% rest | 50% work / 50% rest |
| $30.1 - 31.5^\circ\text{C}$ | 75% work / 25% rest | 50% work / 50% rest | 25% work / 75% rest |
| $\ge 32.0^\circ\text{C}$ | 50% work / 50% rest | 25% work / 75% rest | **MANDATORY WORK SUSPENSION** (15m work / 45m rest) |

---

## 6. Software & Calculation Provenance

- **Implementation**: ECMWF `thermofeel` v0.2 / COST Action 730.
- **Weather Model**: Open-Meteo API (ECMWF IFS / GFS ensemble feeds).
- **Timezone Calibration**: Asia/Kolkata (IST = UTC+5:30).
- **Operational Rule**: Live, cached, and simulated datasets are explicitly tagged with `is_demo` and provenance attributes.
