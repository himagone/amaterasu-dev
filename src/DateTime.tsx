import { useRef, useState, useEffect } from 'react'
import './DateTime.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faForward, faBackward, faPause, faCaretLeft, faCaretRight, faForwardFast } from '@fortawesome/free-solid-svg-icons'

const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
const hour = today.getHours().toString().padStart(2, '0');
const min = today.getMinutes().toString().padStart(2, '0');

const minDate = '2020-11-01';
const normalInterval = 3000;
const fastInterval = 1000;

const maxDate = `${year}-${month}-${day}`;

const now = {
  date: `${year}-${month}-${day}`,
  time: `${hour}:${min}`
}

type Props = {
  currentDate: string;
  setDateTime: Function;
  availableTimes?: Set<string>;
  timeWindowMinutes?: number;
  setTimeWindowMinutes?: (minutes: number) => void;
};

let timer: ReturnType<typeof setInterval> | null = null;

function DateTime(props: Props) {
  const [ theDate, setTheDate ] = useState<string>(now.date);
  const [ theTime, setTheTime ] = useState<string>(now.time);
  const [ activeButton, setActiveButton ] = useState<number | null>(null);
  const [ isUpdating, setIsUpdating ] = useState<boolean>(false);
  const timeDisplayRef = useRef<HTMLDivElement>(null);

  const ref = useRef<HTMLDivElement>(null)

  // 時間が更新されたときのアニメーション
  useEffect(() => {
    if (isUpdating) {
      if (timeDisplayRef.current) {
        timeDisplayRef.current.classList.add('time-update');
        setTimeout(() => {
          if (timeDisplayRef.current) {
            timeDisplayRef.current.classList.remove('time-update');
          }
          setIsUpdating(false);
        }, 500);
      }
    }
  }, [isUpdating]);

  const resetButtonColor = () => {
    if (ref.current) {
      const buttons = ref.current.querySelectorAll('.player button');
      buttons.forEach((button: any) => {
        button.style.backgroundColor = 'transparent';
      });
    }
    setActiveButton(null);
  }

  const playSingleStep = (direction: number) => {
    resetButtonColor();
    if (timer) clearInterval(timer);
    
    const current = new Date(props.currentDate);
    const stepMinutes = props.timeWindowMinutes || 30;
    current.setMinutes(current.getMinutes() + (direction * stepMinutes));
    props.setDateTime(current.toString());
    updateDateTimeDisplay(current);
  }
  
  const playNormal = (direction: number, buttonIndex: number) => {
    resetButtonColor();
    if (timer) clearInterval(timer);
    setActiveButton(buttonIndex);
    if (ref.current) {
      const buttons = ref.current.querySelectorAll('.player button');
      if (buttons[buttonIndex]) {
        (buttons[buttonIndex] as HTMLElement).style.backgroundColor = '#999999';
      }
    }
    
    // 最初のステップを即座に実行
    const current = new Date(props.currentDate);
    const stepMinutes = props.timeWindowMinutes || 30;
    current.setMinutes(current.getMinutes() + (direction * stepMinutes));
    props.setDateTime(current.toString());
    updateDateTimeDisplay(current);
    
    // 現在の時間を保持
    const lastDateTime = new Date(current);
    
    // 3秒ごとに進める
    timer = setInterval(() => {
      lastDateTime.setMinutes(lastDateTime.getMinutes() + (direction * stepMinutes));
      props.setDateTime(lastDateTime.toString());
      updateDateTimeDisplay(lastDateTime);
    }, normalInterval);
  }
  
  // 周期的再生（高速）
  const playFast = (direction: number, buttonIndex: number) => {
    resetButtonColor();
    if (timer) clearInterval(timer);
    
    // ボタンをアクティブに
    setActiveButton(buttonIndex);
    if (ref.current) {
      const buttons = ref.current.querySelectorAll('.player button');
      if (buttons[buttonIndex]) {
        (buttons[buttonIndex] as HTMLElement).style.backgroundColor = '#999999';
      }
    }
    
    const current = new Date(props.currentDate);
    const stepMinutes = props.timeWindowMinutes || 30;
    current.setMinutes(current.getMinutes() + (direction * stepMinutes));
    props.setDateTime(current.toString());
    updateDateTimeDisplay(current);
    
    const lastDateTime = new Date(current);
    timer = setInterval(() => {
      lastDateTime.setMinutes(lastDateTime.getMinutes() + (direction * stepMinutes));
      props.setDateTime(lastDateTime.toString());
      updateDateTimeDisplay(lastDateTime);
    }, fastInterval);
  }
  
  // 日付と時間の表示を更新
  const updateDateTimeDisplay = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    
    setTheDate(`${y}-${m}-${d}`);
    setTheTime(`${h}:${min}`);
    setIsUpdating(true);
  }

  const updateDate = (e: any) => {
    const date = e.target.value.split(/\-/);

    const current = new Date(props.currentDate);
    current.setFullYear(date[0]);
    current.setMonth(date[1] - 1);
    current.setDate(date[2]);
    props.setDateTime(current.toString());

    resetButtonColor();
    if (timer) clearInterval(timer);
    setTheDate(e.target.value);
    setIsUpdating(true);

  }

  const updateTime = (e: any) => {
    const date = e.target.value.split(/:/);

    const current = new Date(props.currentDate);
    current.setHours(date[0]);
    current.setMinutes(date[1]);
    props.setDateTime(current.toString());

    resetButtonColor();
    if (timer) clearInterval(timer);
    setTheTime(e.target.value);
    setIsUpdating(true);
  }
  
  const pausePlayback = () => {
    resetButtonColor();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return (
    <>
      <div ref={ref} className="datetime">
        <div ref={timeDisplayRef} className="time-display">
          <input type="date" min={minDate} max={maxDate} value={theDate} onChange={updateDate} />
          <input type="time" value={theTime} onChange={updateTime} />
        </div>
        <span className="player">
          <button onClick={() => playSingleStep(-1)} title="前のステップ">
            <FontAwesomeIcon icon={faCaretLeft} />
          </button>
          <button onClick={pausePlayback} title="一時停止">
            <FontAwesomeIcon icon={faPause} />
          </button>
          <button onClick={() => playSingleStep(1)} title="次のステップ">
            <FontAwesomeIcon icon={faCaretRight} />
          </button>
        </span>
      </div>
    </>
  )
}

export default DateTime
