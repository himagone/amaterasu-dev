import { useRef } from 'react'
import DateTime from './DateTime.tsx'
import './Footer.css'

type Props = {
  currentDate: string;
  setDateTime: Function;
};

function Footer(props: Props) {

  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      <div ref={ref} className="footer">
        <DateTime currentDate={props.currentDate} setDateTime={props.setDateTime}  />
      </div>
    </>
  )
}

export default Footer
