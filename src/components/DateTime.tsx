import { useState, useEffect, useRef } from 'react'
import './DateTime.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

const today = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
const hour = today.getHours().toString().padStart(2, '0');
const min = today.getMinutes().toString().padStart(2, '0');

const minDate = '2020-11-01';
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
  onDateRangeSelect?: (start: Date, end: Date) => void;
  onApply?: () => Promise<void>;
  isMainMode?: boolean;
};

function DateTime(props: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(props.currentDate));
  const [startTime, setStartTime] = useState<number>(14 * 60); // 2:00 PM in minutes
  const [endTime, setEndTime] = useState<number>(16.5 * 60); // 4:30 PM in minutes
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [currentViewMonth, setCurrentViewMonth] = useState<Date>(new Date(props.currentDate));
  const [currentYear, setCurrentYear] = useState<number>(new Date(props.currentDate).getFullYear());

  const monthTabsRef = useRef<HTMLDivElement>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // 時間を "H:MM AM/PM" 形式に変換
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  // カレンダーの日付配列を生成
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    
    // 月の最初の日が月曜日になるように調整
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 月曜日を0にする
    startDate.setDate(startDate.getDate() - firstDayOfWeek);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) { // 6週間分
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const calendarDays = generateCalendarDays(currentViewMonth);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const newDateTime = new Date(date);
    newDateTime.setHours(Math.floor(startTime / 60));
    newDateTime.setMinutes(startTime % 60);
    props.setDateTime(newDateTime.toString());
    setIsCalendarOpen(false);
    
    // メインモードの場合、日付範囲を親に通知
    if (props.isMainMode && props.onDateRangeSelect) {
      const startDateTime = new Date(date);
      startDateTime.setHours(Math.floor(startTime / 60));
      startDateTime.setMinutes(startTime % 60);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(Math.floor(endTime / 60));
      endDateTime.setMinutes(endTime % 60);
      
      props.onDateRangeSelect(startDateTime, endDateTime);
    }
  };

  const handleTimeChange = (type: 'start' | 'end', value: number) => {
    if (type === 'start') {
      setStartTime(Math.min(value, endTime - 30)); // 最低30分の間隔を保つ
    } else {
      setEndTime(Math.max(value, startTime + 30));
    }
    
    // 現在の時間を更新
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(Math.floor(value / 60));
    newDateTime.setMinutes(value % 60);
    props.setDateTime(newDateTime.toString());
    
    // メインモードの場合、日付範囲を親に通知
    if (props.isMainMode && props.onDateRangeSelect) {
      const currentStartTime = type === 'start' ? value : startTime;
      const currentEndTime = type === 'end' ? value : endTime;
      
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(Math.floor(currentStartTime / 60));
      startDateTime.setMinutes(currentStartTime % 60);
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(Math.floor(currentEndTime / 60));
      endDateTime.setMinutes(currentEndTime % 60);
      
      props.onDateRangeSelect(startDateTime, endDateTime);
    }
  };

  // スライダーの範囲表示用のCSS変数を更新
  const updateSliderStyles = (container: HTMLElement) => {
    const startPercent = (startTime / 1440) * 100;
    const endPercent = (endTime / 1440) * 100;
    container.style.setProperty('--start-percent', startPercent.toString());
    container.style.setProperty('--end-percent', endPercent.toString());
  };

  useEffect(() => {
    const sliders = document.querySelectorAll('.dual-range-slider');
    sliders.forEach((slider) => updateSliderStyles(slider as HTMLElement));
  }, [startTime, endTime]);

  // 現在の月のタブを自動スクロールで中央に表示
  useEffect(() => {
    if (monthTabsRef.current) {
      const activeTab = monthTabsRef.current.querySelector('.month-tab.active') as HTMLElement;
      if (activeTab) {
        const container = monthTabsRef.current;
        const containerWidth = container.clientWidth;
        const tabLeft = activeTab.offsetLeft;
        const tabWidth = activeTab.clientWidth;
        const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentViewMonth]);

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentViewMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentViewMonth(newMonth);
    setCurrentYear(newMonth.getFullYear());
  };

  const navigateYear = (direction: number) => {
    const newYear = currentYear + direction;
    setCurrentYear(newYear);
    const newMonth = new Date(currentViewMonth);
    newMonth.setFullYear(newYear);
    setCurrentViewMonth(newMonth);
  };

  const setMonth = (monthIndex: number) => {
    const newMonth = new Date(currentYear, monthIndex, 1);
    setCurrentViewMonth(newMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentViewMonth.getMonth();
  };

  return (
    <div className={`datetime-container ${props.isMainMode ? 'main-mode' : 'compact-mode'}`}>
      {/* Schedule Header */}
      <div className="schedule-header">
        <h2>{props.isMainMode ? '日付・時間範囲を選択' : 'Schedule'}</h2>
        <div className="current-date">
          {selectedDate.toLocaleDateString('ja-JP', { 
            weekday: 'long', 
            day: 'numeric',
            month: 'long'
          })}
        </div>
      </div>

      {/* Year Navigation */}
      <div className="year-navigation">
        <button onClick={() => navigateYear(-1)} className="nav-button">
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <span className="year-display">{currentYear}</span>
        <button onClick={() => navigateYear(1)} className="nav-button">
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className="month-scroll-container">
        <div className="month-tabs-scrollable" ref={monthTabsRef}>
          <div className="month-tabs">
            {months.map((monthName, index) => (
              <button
                key={monthName}
                className={`month-tab ${currentViewMonth.getMonth() === index ? 'active' : ''}`}
                onClick={() => setMonth(index)}
              >
                {monthName.substring(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar with Swipe */}
      <div 
        className={`calendar`}
      >
        <div className="calendar-header">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((date, index) => (
            <button
              key={index}
              className={`calendar-day ${
                !isCurrentMonth(date) ? 'other-month' : ''
              } ${isSelected(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''}`}
              onClick={() => handleDateSelect(date)}
            >
              {date.getDate()}
            </button>
          ))}
        </div>
      </div>

      {/* Time Picker Modal */}
      {isCalendarOpen && (
        <div className="time-picker-modal">
          <div className="modal-content">
            <h3>Choose Date</h3>
            
            {/* Year Navigation */}
            <div className="year-navigation">
              <button onClick={() => navigateYear(-1)} className="nav-button">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span className="year-display">{currentYear}</span>
              <button onClick={() => navigateYear(1)} className="nav-button">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>

            {/* Month Navigation */}
            <div className="month-scroll-container">
              <div className="month-tabs-scrollable">
                <div className="month-tabs">
                  {months.map((monthName, index) => (
                    <button
                      key={monthName}
                      className={`month-tab ${currentViewMonth.getMonth() === index ? 'active' : ''}`}
                      onClick={() => setMonth(index)}
                    >
                      {monthName.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-calendar">
              <div className="calendar-header">
                {weekDays.map(day => (
                  <div key={day} className="weekday-header">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {calendarDays.map((date, index) => (
                  <button
                    key={index}
                    className={`calendar-day ${
                      !isCurrentMonth(date) ? 'other-month' : ''
                    } ${isSelected(date) ? 'selected' : ''}`}
                    onClick={() => handleDateSelect(date)}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slider */}
            <div className="time-slider-container">
              <div className="time-range-display">
                <span>{formatTime(startTime)}</span>
                <span>{formatTime(endTime)}</span>
              </div>
              <div className="dual-range-slider">
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="30"
                  value={startTime}
                  onChange={(e) => handleTimeChange('start', parseInt(e.target.value))}
                  className="range-input start-time"
                />
                <input
                  type="range"
                  min="0"
                  max="1440"
                  step="30"
                  value={endTime}
                  onChange={(e) => handleTimeChange('end', parseInt(e.target.value))}
                  className="range-input end-time"
                />
              </div>
            </div>

            <button className="apply-button" onClick={() => setIsCalendarOpen(false)}>
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Time Slider */}
      <div className="time-slider-container">
        <div className="time-range-display">
          <span>{formatTime(startTime)}</span>
          <span>{formatTime(endTime)}</span>
        </div>
        <div className="dual-range-slider">
          <input
            type="range"
            min="0"
            max="1440"
            step="30"
            value={startTime}
            onChange={(e) => handleTimeChange('start', parseInt(e.target.value))}
            className="range-input start-time"
          />
          <input
            type="range"
            min="0"
            max="1440"
            step="30"
            value={endTime}
            onChange={(e) => handleTimeChange('end', parseInt(e.target.value))}
            className="range-input end-time"
          />
        </div>
      </div>

      {/* Apply Button */}
      <button 
        className="apply-button" 
        onClick={props.isMainMode && props.onApply ? props.onApply : () => setIsCalendarOpen(false)}
      >
        {props.isMainMode ? 'ヒートマップを生成' : 'Apply'}
      </button>
    </div>
  );
}

export default DateTime
