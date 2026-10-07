import React, { useCallback, useState } from 'react'
import CurrentWeather from './components/CurrentWeather'
import Forecast from './components/Forecast'
import useBackgroundLayers from './hooks/useBackgroundLayers'
import { backgroundFor, scrimFor } from './services/backgrounds'
import {
  NotFoundError,
  fetchByCity,
  fetchByCoords,
  fetchByIp,
} from './services/weather'

const BLOCKED_HINT =
  'Posizione esatta non disponibile: uso la città stimata dal tuo IP. Sblocca il permesso dalla icona del lucchetto in barra degli indirizzi per averla precisa.'

const NO_HTTPS =
  'La geolocalizzazione esatta richiede HTTPS: uso la città stimata dal tuo IP.'

const IP_FAILED =
  'Non riesco a determinare la posizione: cerca la città manualmente.'

function App() {
  const [current, setCurrent] = useState(null)
  const [days, setDays] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [locating, setLocating] = useState(false)
  const [approximate, setApproximate] = useState(false)

  const show = useCallback(
    ({ current: c, days: d, approximate: approx = false }) => {
      setCurrent(c)
      setDays(d)
      setApproximate(approx)
      setError('')
      setNotice('')
    },
    []
  )

  const fail = useCallback((err, fallback) => {
    setCurrent(null)
    setDays([])
    setApproximate(false)
    setNotice('')
    if (err instanceof NotFoundError || err.response?.status === 404) {
      setError(err.message || fallback)
    } else {
      setError(fallback)
    }
  }, [])

// Nessuna geolocalizzazione parte da sola: l'app si apre sempre sulla home con
// lo sfondo iniziale e senza dati, e la posizione arriva solo se l'utente la
// chiede con il pulsante o cerca una citta.
  const locate = useCallback(async () => {
    const finish = () => {
      setLocating(false)
      setLoading(false)
    }

    // La posizione esatta non richiede nulla, ma puo fallire (permesso negato,
    // VPN, nessun provider). In quel caso ricadiamo sulla stima via IP, che e
    // meno precisa ma almeno mostra una citta plausibile.
    const showCity = async (coords) => {
      if (coords) {
        try {
          const result = await fetchByCoords({
            lat: coords.latitude,
            lon: coords.longitude,
          })
          show({ ...result, approximate: false })
          return true
        } catch {
          // l'API meteo ha fallito: proviamo comunque la stima via IP
        }
      }

      try {
        show({ ...(await fetchByIp()), approximate: true })
        // la label accanto al nome dichiara gia la stima: la notifica serve a
        // spiegare perche non e arrivata la posizione esatta
        setNotice(BLOCKED_HINT)
        return true
      } catch {
        return false
      }
    }

    setLocating(true)
    setLoading(true)
    setError('')
    setNotice('')

    if (!window.isSecureContext) {
      // Senza HTTPS la geolocalizzazione non esiste, ma la stima via IP
      // funziona lo stesso: senza questo ramo resterebbe senza citta.
      const done = await showCity()
      finish()
      setNotice(done ? NO_HTTPS : IP_FAILED)
      return
    }

    if (!navigator.geolocation) {
      const done = await showCity()
      finish()
      if (!done) setNotice(IP_FAILED)
      return
    }

    // 'denied' e terminale: getCurrentPosition fallirebbe subito e senza
    // mostrare nulla. Non serve nemmeno tentarlo, si va diretti all'IP.
    try {
      const status = await navigator.permissions?.query({ name: 'geolocation' })
      if (status?.state === 'denied') {
        const done = await showCity()
        finish()
        if (!done) setNotice(IP_FAILED)
        return
      }
    } catch {
      // Permissions API non disponibile: procediamo e affidiamoci al prompt
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await showCity(coords)
        } finally {
          finish()
        }
      },
      (err) => {
        console.warn('Geolocation failed:', err.code, err.message)
        // loading e locating restano attivi finche il fallback via IP non
        // finisce: azzerarli prima coprirebbe la rete in corso e lascerebbe
        // il pulsante cliccabile durante la richiesta.
        showCity().then((done) => {
          finish()
          if (!done) setNotice(IP_FAILED)
        })
      },
      { timeout: 10000, maximumAge: 600000 }
    )
  }, [show])


  const searchLocation = async (event) => {
    if (event.key !== 'Enter') return

    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setError('')
    setNotice('')

    try {
      const result = await fetchByCity({ q })
      show(result)
      setQuery('')
    } catch (err) {
      fail(err, 'Errore nel recupero dei dati meteo. Riprova più tardi.')
    } finally {
      setLoading(false)
    }
  }

  const onLocateClick = () => {
    if (locating || loading) return
    locate()
  }

  const condition = current?.weather?.[0] ?? null
  const layers = useBackgroundLayers(backgroundFor(condition))
  const layer = (url) => (url ? { backgroundImage: `url(${url})` } : undefined)

  return (
    <div className="app">
      <div className="bg-stack" aria-hidden="true">
        <div className="bg" style={layer(layers.base)} />
        <div
          className={`bg bg-top${layers.shown ? ' is-shown' : ''}`}
          style={layer(layers.top)}
        />
        <div className="bg-scrim" style={{ background: scrimFor(condition) }} />
      </div>

      <div className="search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={searchLocation}
          placeholder="Cerca una città…"
          type="text"
          aria-label="Cerca una città"
        />
        <button
          type="button"
          className="geo-btn"
          onClick={onLocateClick}
          disabled={locating || loading}
        >
          {locating ? 'Ricerca…' : 'La mia posizione'}
        </button>
      </div>

      <div className="container">
        {loading && <p className="status">Caricamento…</p>}
        {error && <p className="status error">{error}</p>}
        {notice && (
          <p className="status notice">
            {notice}
            <button
              type="button"
              className="notice-close"
              onClick={() => setNotice('')}
              aria-label="Chiudi il messaggio"
            >
              ×
            </button>
          </p>
        )}

        {current ? <CurrentWeather data={current} approximate={approximate} /> : null}
        <Forecast days={days} />
      </div>
    </div>
  )
}

export default App