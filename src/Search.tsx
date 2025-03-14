// import { useState } from 'react'
import './Search.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

function Search() {

  return (
    <>
      <div className="search">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
        <input type="search" placeholder="" />
      </div>
    </>
  )
}

export default Search
