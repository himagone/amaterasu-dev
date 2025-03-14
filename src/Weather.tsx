import { useEffect, useRef, useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faCloud, faUmbrella } from '@fortawesome/free-solid-svg-icons'

import './Weather.css'

type Props = {
  currentDate: string;
};

const weathers = [
  { color: '#ff6600', icon: faSun },
  { color: '#777777', icon: faCloud },
  { color: '#4c6df3', icon: faUmbrella },
]

function Weather(props: Props) {

  const ref = useRef<HTMLDivElement>(null)
  const [weather, setWeather] = useState(weathers[0])

  useEffect(() => {
    const index = Math.floor(Math.random() * weathers.length) // TODO: 本当は天気APIを叩く。いまはランダムな天気を表示している。
    setWeather(weathers[index])

  }, [props.currentDate])

  return (
    <>
      <div ref={ref} className="weather" style={{color: weather.color}}>
        <FontAwesomeIcon icon={weather.icon} />
      </div>
    </>
  )
}

export default Weather
