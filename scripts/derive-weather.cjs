// Deterministic compact index: preserve current and original hourly noon values.
// The full, unmodified provider payload remains in weather-snapshot.json.
const fs = require('node:fs')
const raw = JSON.parse(fs.readFileSync('src/data/weather-snapshot.json', 'utf8'))
const result = { provider: raw.provider, note: raw.note, recordings: raw.recordings.map(group => ({
  ...group, data: group.data.map(point => {
    const indices = point.hourly.time.map((time, index) => ({ time, index }))
      .filter(({ time }) => new Date(time * 1000 + point.utc_offset_seconds * 1000).getUTCHours() === 12)
      .map(({ index }) => index)
    return { ...point, hourly: Object.fromEntries(Object.entries(point.hourly).map(([key, values]) => [key, indices.map(index => values[index])])) }
  }),
})) }
fs.writeFileSync('src/data/heat-snapshot.json', JSON.stringify(result))
