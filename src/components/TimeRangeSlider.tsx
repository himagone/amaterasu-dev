import { useState, useEffect, useRef } from 'react'
import { Slider } from '@mui/material'
import './TimeRangeSlider.css'

// 3日間のデータに絞る
const AVAILABLE_DATES = [
  new Date(2025, 1, 28), // 2025/02/28
  new Date(2025, 2, 1),  // 2025/03/01
  new Date(2025, 2, 2),  // 2025/03/02
];

// 時間スロットの型定義
export type TimeSlot = {
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
  fetchEventParticipantData: (start: Date, end: Date) => Promise<void>;
  onTimeseriesDataUpdate?: (timeseriesData: {timestamp: string, points: any[]}[]) => void;
  onPlayStateChange?: (isPlaying: boolean, currentFrameIndex: number) => void;
  timeseriesData?: {timestamp: string, points: any[]}[];
  isLoading?: boolean; // can be removed if not used externally
};

function TimeRangeSlider({
  onDateRangeSelect,
  fetchEventParticipantData,
  onTimeseriesDataUpdate,
  onPlayStateChange,
  timeseriesData = [],
  isLoading = false,
}: Props) {
  const [timeSlots] = useState(generateTimeSlots());
  const [sliderValue, setSliderValue] = useState<number[]>([1440, 2880]); // 初期値を調整（2日目の0時から3日目の0時）
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackSpeed] = useState(1000);
  const [loadingData, setLoadingData] = useState(false);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // デバッグ: timeseriesDataの変化を監視
  useEffect(() => {
    console.log('🎬 TimeRangeSlider: timeseriesData updated', {
      length: timeseriesData.length,
      isLoading,
    });
  }, [timeseriesData, isLoading]);

  // ミューテート安全: コンポーネントアンマウント時にタイマークリア
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    };
  }, []);

  // スロットを日本語でフォーマット
  const getJapaneseWeekday = (date: Date) => ['日','月','火','水','木','金','土'][date.getDay()];
  const formatTimeLabel = (value: number) => {
    const slot = timeSlots[value];
    const date = AVAILABLE_DATES[slot.dateIndex];
    return `${date.getMonth() + 1}/${date.getDate()}(${getJapaneseWeekday(date)}) ${slot.displayLabel}`;
  };



  // スライダー操作
  const handleSliderChange = (_: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) setSliderValue(newValue);
  };

  const handleSliderChangeCommitted = async (_: any, newValue: number | number[]) => {
    if (!Array.isArray(newValue)) return;
    const start = timeSlots[newValue[0]].date;
    const end = timeSlots[newValue[1]].date;
    onDateRangeSelect(start, end);
    try {
      setLoadingData(true);
      await fetchEventParticipantData(start, end);
    } catch (e) {
      console.error('Error fetching data', e);
      onTimeseriesDataUpdate?.([]);
    } finally {
      setLoadingData(false);
    }
  };

  // 再生ボタンの挙動をまとめる
  const handlePlayButtonClick = async () => {
    if (loadingData) return;
    if (isPlaying) {
      // 停止
      setIsPlaying(false);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      onPlayStateChange?.(false, currentFrameIndex);
    } else {
      // 再生
      if (timeseriesData.length === 0) {
        setLoadingData(true);
        const start = timeSlots[sliderValue[0]].date;
        const end = timeSlots[sliderValue[1]].date;
        try {
          await fetchEventParticipantData(start, end);
          setIsPlaying(true);
          setCurrentFrameIndex(0);
          playbackIntervalRef.current = setInterval(() => {
            setCurrentFrameIndex(prev => {
              const next = (prev + 1) % timeseriesData.length;
              onPlayStateChange?.(true, next);
              return next;
            });
          }, playbackSpeed);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingData(false);
        }
      } else {
        setIsPlaying(true);
        setCurrentFrameIndex(0);
        playbackIntervalRef.current = setInterval(() => {
          setCurrentFrameIndex(prev => {
            const next = (prev + 1) % timeseriesData.length;
            onPlayStateChange?.(true, next);
            return next;
          });
        }, playbackSpeed);
      }
    }
  };

  // 選択表示テキスト
  const getSelectionText = () => {
    const [startIdx, endIdx] = sliderValue;
    const startSlot = timeSlots[startIdx];
    const endSlot = timeSlots[endIdx];
    const sDate = AVAILABLE_DATES[startSlot.dateIndex];
    const eDate = AVAILABLE_DATES[endSlot.dateIndex];
    if (startSlot.dateIndex === endSlot.dateIndex) {
      return `${sDate.getMonth()+1}/${sDate.getDate()}(${getJapaneseWeekday(sDate)}) ${startSlot.displayLabel} - ${endSlot.displayLabel}`;
    }
    return `${sDate.getMonth()+1}/${sDate.getDate()}(${getJapaneseWeekday(sDate)}) ${startSlot.displayLabel} - ${eDate.getMonth()+1}/${eDate.getDate()}(${getJapaneseWeekday(eDate)}) ${endSlot.displayLabel}`;
  };

  // 再生位置インジケーター計算
  const getCurrentPlaybackPosition = () => {
    if (!isPlaying || timeseriesData.length === 0) return null;
    const positionPercent = (currentFrameIndex / (timeseriesData.length - 1)) * 100;
    const leftBase = (sliderValue[0] / timeSlots.length) * 100;
    const width = ((sliderValue[1] - sliderValue[0]) / timeSlots.length) * 100;
    const absolute = leftBase + (positionPercent/100)*width;
    const ts = new Date(timeseriesData[currentFrameIndex].timestamp);
    return { position: absolute, label: `${getJapaneseWeekday(ts)} ${ts.getHours()}:${ts.getMinutes().toString().padStart(2, '0')}` };
  };

  // イベント時間帯（開演から2時間半）を定義
  const EVENT_PERIODS = [
    {
      // 3月1日(土) 17:00-19:30
      start: new Date(2025, 2, 1, 17, 0, 0, 0),
      end:   new Date(2025, 2, 1, 19, 30, 0, 0),
    },
    {
      // 3月2日(日) 16:30-19:00
      start: new Date(2025, 2, 2, 16, 30, 0, 0),
      end:   new Date(2025, 2, 2, 19, 0, 0, 0),
    }
  ];

  // 指定した日時がtimeSlotsの何番目かを返す
  const findSlotIndex = (date: Date) => {
    return timeSlots.findIndex(slot =>
      slot.date.getFullYear() === date.getFullYear() &&
      slot.date.getMonth() === date.getMonth() &&
      slot.date.getDate() === date.getDate() &&
      slot.hour === date.getHours() &&
      slot.minute === date.getMinutes()
    );
  };

  return (
    <div className="windy-time-slider">
      <div className="selection-indicator">
        <span className="selection-text">{getSelectionText()}</span>
      </div>
      <div className="timeline-container">
        <button
          className={`play-button ${isPlaying ? 'playing' : ''} ${loadingData ? 'loading' : ''}`}
          onClick={handlePlayButtonClick}
          disabled={loadingData}
          title={loadingData ? 'データを読み込み中...' : (isPlaying ? '再生を停止' : '再生を開始')}
        >
          {loadingData ? <div className="loading-spinner"/> : (isPlaying ? '⏸' : '▷')}
        </button>
        <div className="timeline">
          <div className="timeline-track" />
          {/* イベント時間帯のハイライト */}
          {EVENT_PERIODS.map((period, idx) => {
            const startIdx = findSlotIndex(period.start);
            const endIdx = findSlotIndex(period.end);
            if (startIdx === -1 || endIdx === -1) return null;
            const left = (startIdx / timeSlots.length) * 100;
            const width = ((endIdx - startIdx) / timeSlots.length) * 100;
            return (
              <div
                key={idx}
                className="event-range"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  position: 'absolute',
                  top: 0,
                  height: '100%',
                  background: 'rgba(255, 193, 7, 0.25)', // 黄色系半透明
                  borderRadius: 4,
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
                title="イベント時間"
              >
                {/* イベント帯ラベル（中央に表示） */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-1.5em',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.85em',
                    color: '#b8860b',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                >
                  LIVE開演中
                </div>
              </div>
            );
          })}
          <div className="selection-range" style={{ left: `${(sliderValue[0]/timeSlots.length)*100}%`, width: `${((sliderValue[1]-sliderValue[0])/timeSlots.length)*100}%` }} />
          {getCurrentPlaybackPosition() && (
            <div className="playback-position-indicator" style={{ left: `${getCurrentPlaybackPosition()!.position}%` }}>
              <div className="playback-needle" />
              <div className="playback-tooltip">{getCurrentPlaybackPosition()!.label}</div>
            </div>
          )}
          <Slider
            value={sliderValue}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            valueLabelDisplay="auto"
            min={0}
            max={timeSlots.length - 1}
            disabled={isPlaying || loadingData}
            valueLabelFormat={formatTimeLabel}
            step={1}
            disableSwap
            track="normal"
          />
          <div className="time-markers">
            {AVAILABLE_DATES.map((date, idx) => (
              <div key={idx} className="date-group">
                <div className="hour-markers">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className={`hour-marker ${h%6===0?'major':''}`}>{h%12===0 && <span>{h}:00</span>}</div>
                  ))}
                </div>
                <div className="date-label">
                  <div className="month-day">{date.getMonth()+1}/{date.getDate()}</div>
                  <div className="weekday">{getJapaneseWeekday(date)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimeRangeSlider;