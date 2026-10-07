import { useEffect, useRef, useState } from 'react'

// background-image non è animabile, quindi il crossfade usa due strati: il
// nuovo entra sopra il vecchio con una transizione di opacità. L'immagine
// viene pre-caricata prima dello swap, altrimenti si vede un lampo vuoto.
export default function useBackgroundLayers(url) {
  const [layers, setLayers] = useState({ base: url, top: url, shown: true })
  const current = useRef(url)

  useEffect(() => {
    if (!url || url === current.current) return
    const previous = current.current
    current.current = url

    setLayers({ base: previous, top: url, shown: false })

    const image = new Image()
    image.onload = () => {
      // lo swap è avvenuto nel frattempo: non toccare più nulla
      setLayers((state) => (state.top === url ? { ...state, shown: true } : state))
    }
    image.onerror = () => {
      setLayers((state) => (state.top === url ? { ...state, top: state.base, shown: true } : state))
    }
    image.src = url
  }, [url])

  return layers
}