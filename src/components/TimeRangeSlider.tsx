import { useState, useEffect, useRef } from 'react'
import './TimeRangeSlider.css'

// 固定の8日間データ
const AVAILABLE_DATES = [
  new Date(2025, 1, 23), // 2025/02/23
  new Date(2025, 1, 24), // 2025/02/24  
  new Date(2025, 1, 25), // 2025/02/25
  new Date(2025, 1, 26), // 2025/02/26
  new Date(2025, 1, 27), // 2025/02/27
  new Date(2025, 1, 28), // 2025/02/28
  new Date(2025, 2, 1),  // 2025/03/01
  new Date(2025, 2, 2),  // 2025/03/02
];

// 時間スロットの型定義
type TimeSlot = {
  date: Date;
  dateIndex: number;
  hour: number;
  displayLabel: string;
};

// 各日の時間スロット（1時間刻み）
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  AVAILABLE_DATES.forEach((date, dateIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      const slotDate = new Date(date);
      slotDate.setHours(hour, 0, 0, 0);
      slots.push({
        date: slotDate,
        dateIndex,
        hour,
        displayLabel: hour.toString()
      });
    }
  });
  return slots;
};

type Props = {
  onDateRangeSelect: (start: Date, end: Date) => void;
  onApply: () => Promise<void>;
  isLoading?: boolean;
};

function TimeRangeSlider(props: Props) {
  const [timeSlots] = useState(generateTimeSlots());
  const [startSlotIndex, setStartSlotIndex] = useState<number>(14); // 最初の日の14時
  const [endSlotIndex, setEndSlotIndex] = useState<number>(18); // 最初の日の18時
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 日本語の曜日を取得
  const getJapaneseWeekday = (date: Date): string => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
  };

  // 時間範囲の変更処理
  const handleRangeChange = (type: 'start' | 'end', value: number) => {
    if (type === 'start') {
      const newStartIndex = Math.min(value, endSlotIndex - 1);
      setStartSlotIndex(newStartIndex);
      updateDateRange(newStartIndex, endSlotIndex);
    } else {
      const newEndIndex = Math.max(value, startSlotIndex + 1);
      setEndSlotIndex(newEndIndex);
      updateDateRange(startSlotIndex, newEndIndex);
    }
  };

  // 日付時間範囲をDateオブジェクトに変換して親に通知
  const updateDateRange = (startIdx: number, endIdx: number) => {
    const startDate = new Date(timeSlots[startIdx].date);
    const endDate = new Date(timeSlots[endIdx].date);
    
    props.onDateRangeSelect(startDate, endDate);
  };

  // 再生/停止トグル
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // 選択範囲の表示テキスト
  const getSelectionText = () => {
    const startSlot = timeSlots[startSlotIndex];
    const endSlot = timeSlots[endSlotIndex];
    
    if (startSlot.dateIndex === endSlot.dateIndex) {
      // 同じ日の場合
      return `${startSlot.hour}:00 - ${endSlot.hour}:00`;
    } else {
      // 異なる日の場合
      return `${startSlot.hour}:00 - ${endSlot.hour}:00 (${endSlot.dateIndex - startSlot.dateIndex + 1}日間)`;
    }
  };

  // 初期値設定
  useEffect(() => {
    updateDateRange(startSlotIndex, endSlotIndex);
  }, []);

  // 選択範囲のスタイル計算
  const getSelectionStyle = () => {
    const totalSlots = timeSlots.length;
    const startPercent = (startSlotIndex / totalSlots) * 100;
    const endPercent = (endSlotIndex / totalSlots) * 100;
    
    return {
      left: `${startPercent}%`,
      width: `${endPercent - startPercent}%`
    };
  };

  return (
    <div className="windy-time-slider">
      {/* 選択範囲表示 */}
      <div className="selection-indicator">
        <span className="selection-text">+ {getSelectionText()}</span>
      </div>

      {/* メインタイムライン */}
      <div className="timeline-container" ref={timelineRef}>
        {/* 再生ボタン */}
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={props.isLoading}
        >
          {isPlaying ? '⏸' : '▷'}
        </button>

        {/* タイムライン */}
        <div className="timeline">
          {/* 背景バー */}
          <div className="timeline-track"></div>
          
          {/* 選択範囲の強調表示 */}
          <div 
            className="selection-range" 
            style={getSelectionStyle()}
          ></div>

          {/* レンジスライダー */}
          <input
            type="range"
            min="0"
            max={timeSlots.length - 1}
            value={startSlotIndex}
            onChange={(e) => handleRangeChange('start', parseInt(e.target.value))}
            className="range-slider start-slider"
            disabled={props.isLoading}
          />
          <input
            type="range"
            min="0"
            max={timeSlots.length - 1}
            value={endSlotIndex}
            onChange={(e) => handleRangeChange('end', parseInt(e.target.value))}
            className="range-slider end-slider"
            disabled={props.isLoading}
          />

          {/* 時間目盛り */}
          <div className="time-markers">
            {AVAILABLE_DATES.map((date, dateIndex) => (
              <div key={dateIndex} className="date-group">
                {/* 日付ラベル */}
                <div className="date-label">
                  {getJapaneseWeekday(date)} {date.getDate()}
                </div>
                {/* 時間目盛り */}
                <div className="hour-markers">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div 
                      key={hour} 
                      className={`hour-marker ${hour % 6 === 0 ? 'major' : 'minor'}`}
                    >
                      {hour % 6 === 0 && <span>{hour}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 適用ボタン */}
        <button 
          className="apply-btn" 
          onClick={props.onApply}
          disabled={props.isLoading}
        >
          {props.isLoading ? '読込中' : '適用'}
        </button>
      </div>
    </div>
  );
}

export default TimeRangeSlider; 