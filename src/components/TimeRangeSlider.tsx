import { useState, useEffect, useRef } from 'react'
import { Slider } from '@mui/material'
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
  minute: number;
  displayLabel: string;
};

// 各日の時間スロット（1分刻み）
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  AVAILABLE_DATES.forEach((date, dateIndex) => {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute++) {
        const slotDate = new Date(date);
        slotDate.setHours(hour, minute, 0, 0);
        slots.push({
          date: slotDate,
          dateIndex,
          hour,
          minute,
          displayLabel: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        });
      }
    }
  });
  return slots;
};

type Props = {
  onDateRangeSelect: (start: Date, end: Date) => void;
  fetchTimeseriesData: () => Promise<void>;
  onTimeseriesDataUpdate?: (timeseriesData: {timestamp: string, points: any[]}[]) => void;
  onPlayStateChange?: (isPlaying: boolean, currentFrameIndex: number) => void;
  timeseriesData?: {timestamp: string, points: any[]}[];
  isLoading?: boolean;
};

function TimeRangeSlider(props: Props) {
  const [timeSlots] = useState(generateTimeSlots());
  const [sliderValue, setSliderValue] = useState<number[]>([8000, 9000]); // 最初の日の15:00-16:00
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // 1秒間隔
  const timelineRef = useRef<HTMLDivElement>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 外部から渡されるtimeseriesDataを使用
  const timeseriesData = props.timeseriesData || [];

  // デバッグ: timeseriesDataの変化を監視
  useEffect(() => {
    console.log('🎬 TimeRangeSlider: timeseriesDataが更新されました:', {
      データ件数: timeseriesData.length,
      isLoading: props.isLoading,
      再生ボタン有効: !(props.isLoading || timeseriesData.length === 0),
      timeseriesData: timeseriesData
    });
  }, [timeseriesData, props.isLoading]);

  // スロットインデックスを時間形式に変換する関数
  const formatTimeLabel = (value: number) => {
    const slot = timeSlots[value];
    if (!slot) return '';
    const date = AVAILABLE_DATES[slot.dateIndex];
    const weekday = getJapaneseWeekday(date);
    return `${date.getMonth() + 1}/${date.getDate()}(${weekday}) ${slot.displayLabel}`;
  };

  // 曜日を取得
  const getJapaneseWeekday = (date: Date): string => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return weekdays[date.getDay()];
  };

  // 時間範囲の変更処理
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setSliderValue(newValue);
    }
  };

  // スライダーの操作が完了したときの処理
  const handleSliderChangeCommitted = (event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      updateDateRange(newValue[0], newValue[1]);
    }
  };

  // 日付時間範囲をDateオブジェクトに変換して親に通知
  const updateDateRange = (startIdx: number, endIdx: number) => {
    const startDate = new Date(timeSlots[startIdx].date);
    const endDate = new Date(timeSlots[endIdx].date);
    
    props.onDateRangeSelect(startDate, endDate);
  };

  // 再生/停止トグル
  const togglePlay = async () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      await startPlayback();
    }
  };

  // 再生開始
  const startPlayback = async () => {
    // timeseriesデータがない場合は先にデータを取得
    if (timeseriesData.length === 0) {
      try {
        await props.fetchTimeseriesData();
        // データが更新されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to fetch timeseries data:', error);
        return;
      }
    }
    
    // データ取得後に再度チェック
    if (timeseriesData.length === 0) {
      console.warn('No timeseries data available after fetch');
      return;
    }
    
    setIsPlaying(true);
    setCurrentFrameIndex(0);
    
    playbackIntervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % timeseriesData.length;
        
        // 親コンポーネントに再生状態を通知
        if (props.onPlayStateChange) {
          props.onPlayStateChange(true, nextIndex);
        }
        
        return nextIndex;
      });
    }, playbackSpeed);
  };

  // 再生停止
  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    
    if (props.onPlayStateChange) {
      props.onPlayStateChange(false, currentFrameIndex);
    }
  };

  // コンポーネントがアンマウントされた時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);


  // 選択範囲の表示テキスト
  const getSelectionText = () => {
    const startSlot = timeSlots[sliderValue[0]];
    const endSlot = timeSlots[sliderValue[1]];
    const startDate = AVAILABLE_DATES[startSlot.dateIndex];
    const endDate = AVAILABLE_DATES[endSlot.dateIndex];
    
    if (startSlot.dateIndex === endSlot.dateIndex) {
      // 同じ日の場合
      return `${startDate.getMonth() + 1}/${startDate.getDate()}(${getJapaneseWeekday(startDate)}) ${startSlot.displayLabel} - ${endSlot.displayLabel}`;
    } else {
      return `${startDate.getMonth() + 1}/${startDate.getDate()}(${getJapaneseWeekday(startDate)}) ${startSlot.displayLabel} - ${endDate.getMonth() + 1}/${endDate.getDate()}(${getJapaneseWeekday(endDate)}) ${endSlot.displayLabel}`;
    }
  };


  // 初期値設定
  useEffect(() => {
    updateDateRange(sliderValue[0], sliderValue[1]);
  }, []);

  // 選択範囲のスタイル計算
  const getSelectionStyle = () => {
    const totalSlots = timeSlots.length;
    const startPercent = (sliderValue[0] / totalSlots) * 100;
    const endPercent = (sliderValue[1] / totalSlots) * 100;
    
    return {
      left: `${startPercent}%`,
      width: `${endPercent - startPercent}%`
    };
  };

  // 現在再生中の位置を計算
  const getCurrentPlaybackPosition = () => {
    if (!isPlaying || timeseriesData.length === 0 || currentFrameIndex >= timeseriesData.length) {
      return null;
    }

    const currentFrame = timeseriesData[currentFrameIndex];
    const currentTimestamp = new Date(currentFrame.timestamp);
    
    // 選択範囲内での相対位置を計算（0-100%）
    const totalFrames = timeseriesData.length;
    const relativePosition = (currentFrameIndex / (totalFrames - 1)) * 100;
    
    // 選択範囲の幅を取得
    const selectionStyle = getSelectionStyle();
    const selectionStartPercent = parseFloat(selectionStyle.left.replace('%', ''));
    const selectionWidthPercent = parseFloat(selectionStyle.width.replace('%', ''));
    
    // 選択範囲内での絶対位置を計算
    const absolutePosition = selectionStartPercent + (relativePosition / 100) * selectionWidthPercent;
    
    return {
      position: absolutePosition,
      time: currentTimestamp.toLocaleString('ja-JP', { 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      weekday: getJapaneseWeekday(currentTimestamp)
    };
  };

  return (
    <div className="windy-time-slider">
      {/* 選択範囲表示 */}
      <div className="selection-indicator">
        <span className="selection-text">{getSelectionText()}</span>
      </div>

      {/* メインタイムライン */}
      <div className="timeline-container" ref={timelineRef}>
        {/* 再生ボタン */}
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={props.isLoading}
          title={isPlaying ? '再生を停止' : '再生を開始'}
        >
          {isPlaying ? '⏸' : '▷'}
        </button>
        
        {/* ガイドメッセージ */}
        {timeseriesData.length === 0 && !props.isLoading && (
          <div className="playback-guide">
            <span className="guide-text">
              💡 時間範囲を選択して再生ボタンを押してください
            </span>
          </div>
        )}

        {/* タイムライン */}
        <div className="timeline">
          {/* 背景バー */}
          <div className="timeline-track"></div>
          
          {/* 選択範囲の強調表示 */}
          <div 
            className="selection-range" 
            style={getSelectionStyle()}
          ></div>

          {/* 現在再生中の位置インジケーター */}
          {(() => {
            const playbackPosition = getCurrentPlaybackPosition();
            if (!playbackPosition) return null;
            
            return (
              <div 
                className="playback-position-indicator"
                style={{ left: `${playbackPosition.position}%` }}
              >
                <div className="playback-needle"></div>
                <div className="playback-tooltip">
                  <div className="current-time">
                    {playbackPosition.weekday} {playbackPosition.time}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* レンジスライダー */}
          <Slider
            getAriaLabel={() => 'Time range'}
            value={sliderValue}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            valueLabelDisplay="auto"
            min={0}
            max={timeSlots.length - 1}
            disabled={props.isLoading || isPlaying}
            className="range-slider"
            getAriaValueText={(value) => {
              const slot = timeSlots[value];
              if (!slot) return '';
              const date = AVAILABLE_DATES[slot.dateIndex];
              const weekday = getJapaneseWeekday(date);
              return `${date.getMonth() + 1}/${date.getDate()}(${weekday}) ${slot.displayLabel}`;
            }}
            valueLabelFormat={formatTimeLabel}
            marks={false}
            step={1}
            track="normal"
            disableSwap
          />

          {/* 時間目盛り */}
          <div className="time-markers">
            {AVAILABLE_DATES.map((date, dateIndex) => (
              <div key={dateIndex} className="date-group">
                {/* 日付ラベル */}
                <div className="date-label">
                  <div className="month-day">
                    {date.getMonth() + 1}/{date.getDate()}
                  </div>
                  <div className="weekday">
                    {getJapaneseWeekday(date)}
                  </div>
                </div>
                {/* 時間目盛り */}
                <div className="hour-markers">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div 
                      key={hour} 
                      className={`hour-marker ${hour % 6 === 0 ? 'major' : ''}`}
                    >
                      {hour % 12 === 0 && <span>{hour}:00</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimeRangeSlider; 