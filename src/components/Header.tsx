import { useRef } from 'react'
import './Header.css'

import Search from './Search.tsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser } from '@fortawesome/free-solid-svg-icons'

function Header() {

  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      <div ref={ref} className="header">
      <div className="left">
          <h1>アマテラス</h1>
        </div>
        <div className="center">
          <Search />
        </div>
      </div>
    </>
  )
}

export default Header
