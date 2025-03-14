import { useRef, useState } from 'react'
import './DateTime.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faForward, faBackward, faPause, faCaretLeft, faCaretRight } from '@fortawesome/free-solid-svg-icons'

const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
const hour = today.getHours().toString().padStart(2, '0');
const min = today.getMinutes().toString().padStart(2, '0');

const minDate = '2020-11-01'; // TODO: 設定ファイルをつくる？
const interval = 3000; // TODO: 設定ファイルをつくる？

const maxDate = `${year}-${month}-${day}`;

const now = {
  date: `${year}-${month}-${day}`,
  time: `${hour}:${min}`
}

type Props = {
  currentDate: string;
  setDateTime: Function;
};

let timer:number = 0;

function DateTime(props: Props) {
  const [ theDate, setTheDate ] = useState<string>(now.date);
  const [ theTime, setTheTime ] = useState<string>(now.time);

  const ref = useRef<HTMLDivElement>(null)

  const resetButtonColor = () => {
    if (ref.current) {
      const buttons = ref.current.querySelectorAll('.player button');
      buttons.forEach((button: any) => {
        button.style.backgroundColor = 'transparent';
      });
    }
  }

  const play = (n: number, periodically: Boolean) => {
    const current = new Date(props.currentDate);

    const callback = () => {
      current.setMinutes(current.getMinutes() + n);
      props.setDateTime(current.toString());

      const year = current.getFullYear();
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const day = current.getDate().toString().padStart(2, '0');
      const hour = current.getHours().toString().padStart(2, '0');
      const min = current.getMinutes().toString().padStart(2, '0');

      setTheDate(`${year}-${month}-${day}`)
      setTheTime(`${hour}:${min}`)
    }

    if (periodically) {
      return (e: React.MouseEvent<HTMLButtonElement>) => {
        resetButtonColor();
        e.currentTarget.style.backgroundColor = '#999999';
        clearInterval(timer);
        callback();
        timer = setInterval(callback, interval);
      }
    } else {
      return () => {
        resetButtonColor();
        clearInterval(timer);
        callback();
      }
    }
  }

  const updateDate = (e: any) => {
    const date = e.target.value.split(/\-/);

    const current = new Date(props.currentDate);
    current.setFullYear(date[0]);
    current.setMonth(date[1] - 1);
    current.setDate(date[2]);
    props.setDateTime(current.toString());

    resetButtonColor();
    clearInterval(timer);
    setTheDate(e.target.value)
  }

  const updateTime = (e: any) => {
    const date = e.target.value.split(/:/);

    const current = new Date(props.currentDate);
    current.setHours(date[0]);
    current.setMinutes(date[1]);
    props.setDateTime(current.toString());

    resetButtonColor();
    clearInterval(timer);
    setTheTime(e.target.value)
  }

  return (
    <>
      <div ref={ref} className="datetime">
        <input type="date" min={minDate} max={maxDate} value={theDate} onChange={updateDate} />
        <input type="time" value={theTime} onChange={updateTime} />
        <span className="player">
          <button onClick={play(-1, true)}><FontAwesomeIcon icon={faBackward} /></button>
          <button onClick={play(-1, false)}><FontAwesomeIcon icon={faCaretLeft} /></button>
          <button onClick={() => {resetButtonColor(); clearInterval(timer)}}><FontAwesomeIcon icon={faPause} /></button>
          <button onClick={play(1, false)}><FontAwesomeIcon icon={faCaretRight} /></button>
          <button onClick={play(1, true)}><FontAwesomeIcon icon={faForward} /></button>
        </span>
      </div>
    </>
  )
}

export default DateTime
