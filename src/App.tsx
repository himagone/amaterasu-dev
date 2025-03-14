import { useState } from 'react'
import Header from './Header.tsx'
import Footer from './Footer.tsx'
import Map from './Map.tsx'
import './App.css'
import Weather from './Weather.tsx'

const now = new Date();

function App() {
  const [currentDate, setDateTime] = useState<string>(now.toString());

  return (
    <>
      <div className="app">
        <Header />
        <Map currentDate={currentDate} />
        <Footer currentDate={currentDate} setDateTime={setDateTime} />
        <Weather currentDate={currentDate} />
      </div>
    </>
  )
}

export default App
