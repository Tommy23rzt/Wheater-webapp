import axios from 'axios'

const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY
const GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0/direct'
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather'
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast'
const IP_GEO_URL = 'https://ipwho.is/'
const REVERSE_GEO_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

export class NotFoundError extends Error {
  constructor(message = 'Città non trovata. Riprova con un altro nome.') {
    super(message)
    this.name = 'NotFoundError'
  }
}

// L'API /forecast dà 40 slot da 3h. Li raggruppiamo per giorno locale,
// usando lo shift del timezone della città per NON far doppio calcolo.
// currentTemp serve per il primo giorno, che è parziale (solo gli slot
// futuri): non contiene le 12:00, quindi la sua temperatura rappresentativa
// è quella corrente e non il primo slot disponibile.
function toDaily({ list = [], city = {} }, currentTemp = null) {
  const tz = city.timezone || 0
  const buckets = new Map()

  for (const item of list) {
    const shifted = new Date((item.dt + tz) * 1000)
    const key = shifted.toISOString().slice(0, 10)
    const hour = shifted.getUTCHours()

    if (!buckets.has(key)) {
      buckets.set(key, {
        dt: item.dt,
        icon: item.weather?.[0]?.icon,
        id: item.weather?.[0]?.id,
        description: item.weather?.[0]?.description,
        temps: [],
        noonTemp: null,
        rain: 0,
        pop: 0,
      })
    }

    const bucket = buckets.get(key)
    bucket.temps.push(item.main.temp)
    bucket.rain += item.rain?.['3h'] || 0
    bucket.pop = Math.max(bucket.pop, item.pop || 0)

    // lo slot delle 12:00 locali è il più rappresentativo per la previsione
    if (hour === 12) {
      bucket.noonTemp = item.main.temp
      bucket.icon = item.weather?.[0]?.icon
      bucket.id = item.weather?.[0]?.id
      bucket.description = item.weather?.[0]?.description
    }
  }

  return [...buckets.values()].slice(0, 5).map((bucket, index) => ({
    dt: bucket.dt,
    label: new Date((bucket.dt + tz) * 1000).toLocaleDateString('it-IT', {
      weekday: 'short',
      timeZone: 'UTC',
    }),
    icon: bucket.icon,
    id: bucket.id,
    description: bucket.description,
    temp: Math.round(
      bucket.noonTemp ?? (index === 0 && currentTemp != null ? currentTemp : bucket.temps[0])
    ),
    tempMin: Math.round(Math.min(...bucket.temps)),
    tempMax: Math.round(Math.max(...bucket.temps)),
    rain: Math.round(bucket.rain),
    pop: Math.round(bucket.pop * 100),
  }))
}

// searchedName è il nome che l'utente ha cercato: ha priorità sul reverse,
// perché per un piccolo comune il reverse restituirebbe il capoluogo vicino.
// Se manca (percorso GPS) si usa il reverse.
async function load(lat, lon, searchedName) {
  const [current, forecast, place] = await Promise.all([
    axios.get(WEATHER_URL, {
      params: { lat, lon, appid: API_KEY, units: 'metric' },
    }),
    axios.get(FORECAST_URL, {
      params: { lat, lon, appid: API_KEY, units: 'metric' },
    }),
    reversePlace(lat, lon),
  ])

  return {
    // place e district stanno dentro current perché è l'oggetto che arriva a
    // <CurrentWeather data={current} />: messi fuori verrebbero scartati da show().
    current: {
      ...current.data,
      place: searchedName || place.city,
      district: place.district,
    },
    days: toDaily(forecast.data, current.data.main?.temp),
  }
}

// Reverse-geocoding delle coordinate. L'endpoint meteo nomina la zona più
// vicina ("Mitte" per Berlino, "Palais-Royal" per Parigi) e non distingue
// città da quartiere; questo lo fa e risponde in italiano. Invia le
// coordinate a BigDataCloud: se preferisci non farlo, basta rimuovere la chiamata.
async function reversePlace(lat, lon) {
  try {
    const { data } = await axios.get(REVERSE_GEO_URL, {
      params: { latitude: lat, longitude: lon, localityLanguage: 'it' },
      timeout: 4000,
    })
    const city = data.city || data.locality || data.principalSubdivision || null
    return {
      city,
      district: data.locality && data.locality !== city ? data.locality : null,
    }
  } catch {
    return { city: null, district: null }
  }
}

export async function fetchByCoords({ lat, lon }) {
  return load(lat, lon)
}

// Fallback senza permessi: geolocalizza via IP. Precisione a livello di città
// (niente indirizzo), quindi va etichettata come approssimativa. Invia l'IP
// dell'utente a ipwho.is: se preferisci non farlo, basta non chiamare questa.
export async function fetchByIp() {
  const { data } = await axios.get(IP_GEO_URL, { timeout: 5000 })

  if (!data?.success || typeof data.latitude !== 'number') {
    throw new Error('IP geolocation unavailable')
  }

  return {
    ...(await load(data.latitude, data.longitude, data.city)),
    approximate: true,
  }
}

export async function fetchByCity({ q }) {
  // Il parametro country di geo/1.0/direct è ignorato dall'API: verificato che
  // country=DE e country=IT restituiscono lo stesso identico elenco, comprese
  // città americane. Una sola ricerca worldwide, quindi.
  const { data: hits } = await axios.get(GEOCODE_URL, {
    params: { q, limit: 1, appid: API_KEY },
  })

  if (!hits.length) throw new NotFoundError()

  const hit = hits[0]

  // Il nome cercato ha priorità sul reverse: per un piccolo comune il reverse
  // restituirebbe il capoluogo più vicino, che sarebbe sbagliato. local_names.it
  // è la traduzione italiana ("Berlino", non "Berlin"); per i comuni senza
  // traduzione si ripiega sul nome originale.
  return load(hit.lat, hit.lon, hit.local_names?.it || hit.name)
}