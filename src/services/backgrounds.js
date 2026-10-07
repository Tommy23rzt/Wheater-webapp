// Raggruppa i 55 condition id di OpenWeatherMap nelle 9 famiglie visive che
// l'API stessa riconosce (i suoi prefissi icona: 01,02,03,04,09,10,11,13,50).
const THEME_BY_ID = {
  800: 'clear',
  801: 'few-clouds',
  // progressione per copertura del cielo: 801 11-25%, 802 25-50%,
  // 803 51-84%, 804 85-100%. 803 usa few-clouds per scelta, anche se OWM
  // condivide con 804 l'icona 04.
  802: 'clouds',
  803: 'few-clouds',
  804: 'overcast',

  300: 'drizzle', 301: 'drizzle', 302: 'drizzle', 310: 'drizzle',
  311: 'drizzle', 312: 'drizzle', 313: 'drizzle', 314: 'drizzle',
  321: 'drizzle',
  520: 'drizzle', 521: 'drizzle', 522: 'drizzle', 531: 'drizzle',

  500: 'rain', 501: 'rain', 502: 'rain', 503: 'rain', 504: 'rain',

  200: 'thunderstorm', 201: 'thunderstorm', 202: 'thunderstorm',
  210: 'thunderstorm', 211: 'thunderstorm', 212: 'thunderstorm',
  221: 'thunderstorm', 230: 'thunderstorm', 231: 'thunderstorm',
  232: 'thunderstorm',

  511: 'snow',
  600: 'snow', 601: 'snow', 602: 'snow', 611: 'snow', 612: 'snow',
  613: 'snow', 615: 'snow', 616: 'snow', 620: 'snow', 621: 'snow',
  622: 'snow',

  // 771 squalls e 781 tornado usano la stessa icona 50 della nebbia
  701: 'mist', 711: 'mist', 721: 'mist', 731: 'mist', 741: 'mist',
  751: 'mist', 761: 'mist', 762: 'mist', 771: 'mist', 781: 'mist',
}

// Nome del file (senza estensione) per ogni tema.
const ASSET = {
  clear: 'bg-clear',
  'few-clouds': 'bg-few-clouds',
  clouds: 'bg-clouds',
  overcast: 'bg-overcast',
  drizzle: 'bg-drizzle',
  rain: 'bg-rain',
  snow: 'bg-snow',
  thunderstorm: 'bg-thunderstorm',
  mist: 'bg-mist',
}

// Sfondo iniziale, mostrato finché non arrivano i dati meteo.
const HOME_ASSET = 'sunny1'

// Temi per cui non abbiamo ancora un'immagine: si ripiega sulla scena più
// vicina. Se un giorno aggiungi bg-few-clouds.webp, la catena lo preferirà.
const FALLBACK = {
  'few-clouds': ['clear', 'overcast'],
  clouds: ['overcast', 'clear'],
}

// Ordine di degradazione quando il tema non ha alcun file.
const FALLBACK_CHAIN = {
  clear: ['overcast', 'mist'],
  'few-clouds': ['clear', 'overcast', 'mist'],
  clouds: ['overcast', 'clear', 'mist'],
  overcast: ['mist', 'clouds'],
  drizzle: ['rain', 'overcast'],
  rain: ['drizzle', 'overcast'],
  snow: ['overcast', 'mist'],
  thunderstorm: ['rain', 'overcast'],
  mist: ['overcast', 'clouds'],
}

export const themeFor = (condition) => THEME_BY_ID[condition?.id] || null

// Il testo è bianco: su neve e coperto il velo scuro serve più forte,
// altrimenti bianco su bianco non si legge. Su sereno può essere più
// leggero perché l'immagine è già luminosa.
const SCRIM = {
  clear: 'rgba(0, 0, 0, 0.34)',
  'few-clouds': 'rgba(0, 0, 0, 0.38)',
  clouds: 'rgba(0, 0, 0, 0.42)',
  overcast: 'rgba(22, 26, 34, 0.5)',
  drizzle: 'rgba(16, 22, 32, 0.5)',
  rain: 'rgba(12, 18, 28, 0.55)',
  snow: 'rgba(34, 42, 56, 0.5)',
  thunderstorm: 'rgba(10, 10, 22, 0.58)',
  mist: 'rgba(30, 34, 42, 0.48)',
}

export const scrimFor = (condition) =>
  SCRIM[themeFor(condition)] || 'rgba(0, 0, 0, 0.45)'

// require.context elenca i file presenti in assets/: aggiungere un'immagine
// non richiede di toccare questo file.
const context = require.context('../assets', false, /\.webp$/)

// I file in assets/ sono noti in fase di build: la lista si calcola una volta
// sola invece che a ogni chiamata di backgroundFor, che gira a ogni render.
const AVAILABLE = new Set(context.keys().map((key) => key.replace(/^\.\/(.*)\.webp$/, '$1')))

// webpack 5 espone i moduli immagine come module.exports = URL (una stringa),
// non come namespace ESM: non esiste quindi .default. Gestiamo entrambe le
// forme perché il comportamento cambia tra versioni di webpack.
const resolve = (name) => {
  const mod = context(`./${name}.webp`)
  return mod?.default ?? mod
}

// isNight si ricava dal suffisso dell'icona: "01n" notte, "01d" giorno.
const isNight = (condition) =>
  typeof condition?.icon === 'string' && condition.icon.endsWith('n')

const NIGHT = '-night'

const fileFor = (name) => {
  if (name === 'home') return HOME_ASSET
  const night = name.endsWith(NIGHT)
  const asset = ASSET[night ? name.slice(0, -NIGHT.length) : name]
  if (!asset) return null
  return night ? `${asset}${NIGHT}` : asset
}

// Funzione pura: data la lista dei file presenti, dice quale usare e in che
// ordine. Separata da require.context così è verificabile senza bundler.
export const candidatesFor = (condition, available) => {
  const theme = themeFor(condition)

// Di notte si prova prima la variante -night e si ripiega su quella diurna.
// Di giorno MAI sulla notturna: una foto notturna su un cielo diurno è
// semplicemente sbagliata, quindi in quel caso non si degrada e si va diretti
// alla catena di fallback sui temi chiari.
const primary = theme
  ? isNight(condition)
    ? [`${theme}${NIGHT}`, theme]
    : [theme]
  : []

  const fallbacks = theme
    ? [...(FALLBACK[theme] || []), ...(FALLBACK_CHAIN[theme] || [])]
    : []

  const names = [...new Set([...primary, ...fallbacks, 'home'])]
    .map(fileFor)
    .filter(Boolean)

  return names.filter((name) => available.has(name))
}

export const backgroundFor = (condition) => {
  const pick = candidatesFor(condition, AVAILABLE)[0]
  return pick ? resolve(pick) : null
}