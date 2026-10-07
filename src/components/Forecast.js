import React from 'react'
import { iconFor } from '../services/weatherLabels'

function Forecast({ days }) {
  if (!days?.length) return null

  return (
    <div className="forecast">
      <h2 className="forecast-title">Prossimi 5 giorni</h2>
      <ul>
        {days.map((day) => (
          <li key={day.dt}>
            <span className="day">{day.label}</span>

            {day.id ? (
              <span
                className="day-icon"
                role="img"
                aria-label={day.description}
              >
                {iconFor({ id: day.id })}
              </span>
            ) : null}

            <span className="day-temp">{day.temp}°</span>

            <span className="day-range">
              {day.tempMin}° / {day.tempMax}°
            </span>

            {day.pop > 0 ? (
              <span className="day-rain" title={`probabilità ${day.pop}%`}>
                💧 {day.pop}%
              </span>
            ) : (
              <span className="day-rain day-rain-empty">·</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// memo: days è uno stesso array tra un caricamento e l'altro, quindi il
// componente può saltare il ridisegno mentre l'utente scrive nella ricerca.
export default React.memo(Forecast)