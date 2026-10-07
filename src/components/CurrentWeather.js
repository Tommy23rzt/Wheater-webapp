import React from 'react'
import { iconUrl } from '../services/weather'
import { describeIt } from '../services/weatherLabels'

function formatLocalTime(unixSeconds, offsetSeconds) {
  return new Date((unixSeconds + offsetSeconds) * 1000).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
}

function CurrentWeather({ data, approximate = false }) {
  if (!data?.name) return null

  const tz = data.timezone || 0
  const condition = data.weather?.[0]

  return (
    <div className="top">
      <div className="location">
        <p className="city">{data.place || data.name}</p>
        <p className="country">
          {data.sys?.country ? `${data.sys.country} ` : ''}
          {data.district ? `· ${data.district}` : ''}
          {approximate ? '· posizione stimata via IP' : ''}
        </p>
      </div>

      <div className="now">
        {condition?.icon ? (
          <img
            className="weather-icon"
            src={iconUrl(condition.icon)}
            alt=""
          />
        ) : null}
        <div className="temp">
          {data.main ? <h1>{data.main.temp.toFixed(1)}°C</h1> : null}
        </div>
      </div>

      <div className="description">
        {condition ? <p>{describeIt(condition)}</p> : null}
        {data.main ? (
          <p className="range">
            min {data.main.temp_min.toFixed(1)}° · max {data.main.temp_max.toFixed(1)}°
          </p>
        ) : null}
      </div>

      {data.sys?.sunrise && data.sys?.sunset ? (
        <div className="sun">
          <span>
            ☀ alba {formatLocalTime(data.sys.sunrise, tz)}
          </span>
          <span>
            ☾ tramonto {formatLocalTime(data.sys.sunset, tz)}
          </span>
        </div>
      ) : null}

      <div className="bottom">
        <div className="feels">
          {data.main ? <p className="bold">{data.main.feels_like.toFixed(1)}°C</p> : null}
          <p>Percepita</p>
        </div>
        <div className="humidity">
          {data.main ? <p className="bold">{data.main.humidity}%</p> : null}
          <p>Umidità</p>
        </div>
        <div className="wind">
          {data.wind ? <p className="bold">{data.wind.speed.toFixed(1)} m/s</p> : null}
          <p>Vento {data.wind?.deg}°</p>
        </div>
        <div className="clouds">
          {data.clouds ? <p className="bold">{data.clouds.all}%</p> : null}
          <p>Nuvoloso</p>
        </div>
        <div className="pressure">
          {data.main ? <p className="bold">{data.main.pressure}</p> : null}
          <p>hPa</p>
        </div>
      </div>
    </div>
  )
}

// memo: senza, ogni tasto premuto nella casella di ricerca ridisegna tutto il
// blocco meteo, anche se i dati non sono cambiati.
export default React.memo(CurrentWeather)