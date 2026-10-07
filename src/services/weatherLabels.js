// OpenWeatherMap restituisce sempre le descrizioni in inglese. La chiave è il
// condition id (weather[0].id), che è stabile e documentato: preferibile al
// testo, che può cambiare o essere riformulato dall'API.
const CONDITIONS_IT = {
  200: 'Temporale con pioggia leggera',
  201: 'Temporale con pioggia',
  202: 'Temporale con pioggia intensa',
  210: 'Temporale leggero',
  211: 'Temporale',
  212: 'Temporale forte',
  221: 'Temporale irregolare',
  230: 'Temporale con pioggerella leggera',
  231: 'Temporale con pioggerella',
  232: 'Temporale con pioggerella intensa',

  300: 'Pioggerella leggera',
  301: 'Pioggerella',
  302: 'Pioggerella intensa',
  310: 'Pioggerella debole',
  311: 'Pioggerella',
  312: 'Pioggerella intensa',
  313: 'Pioggia e pioggerella',
  314: 'Pioggia e pioggerella intense',
  321: 'Pioggerella',

  500: 'Pioggia leggera',
  501: 'Pioggia moderata',
  502: 'Pioggia intensa',
  503: 'Pioggia molto intensa',
  504: 'Pioggia molto abbondante',
  511: 'Pioggia congelata',
  520: 'Pioggia debole',
  521: 'Pioggia',
  522: 'Pioggia intensa',
  531: 'Pioggia irregolare',

  600: 'Neve leggera',
  601: 'Neve',
  602: 'Neve intensa',
  611: 'Nevischio',
  612: 'Nevischio',
  613: 'Nevischio',
  615: 'Pioggia leggera e neve',
  616: 'Pioggia e neve',
  620: 'Nevischio',
  621: 'Nevischio',
  622: 'Nevischio',

  701: 'Foschia',
  711: 'Fumo',
  721: 'Bruma',
  731: 'Vortici di polvere',
  741: 'Nebbia',
  751: 'Sabbia',
  761: 'Polvere',
  762: 'Ceneri vulcaniche',
  771: 'Temporali improvvisi',
  781: 'Tornado',

  800: 'Cielo sereno',
  801: 'Poche nuvole',
  802: 'Nubi sparse',
  803: 'Nubi frammentate',
  804: 'Cielo coperto',
}

export const describeIt = (condition) => {
  if (!condition) return ''
  return (
    CONDITIONS_IT[condition.id] ||
    condition.description ||
    condition.main ||
    ''
  )
}