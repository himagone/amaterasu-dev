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
  onApply: () => Promise<void>;
  onTimeseriesDataUpdate?: (timeseriesData: {timestamp: string, points: any[]}[]) => void;
  onPlayStateChange?: (isPlaying: boolean, currentFrameIndex: number) => void;
  timeseriesData?: {timestamp: string, points: any[]}[];
  isLoading?: boolean;
};

function TimeRangeSlider(props: Props) {
  const [timeSlots] = useState(generateTimeSlots());
  const [startSlotIndex, setStartSlotIndex] = useState<number>(840); // 最初の日の14:00
  const [endSlotIndex, setEndSlotIndex] = useState<number>(1080); // 最初の日の18:00
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
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // 再生開始
  const startPlayback = () => {
    if (timeseriesData.length === 0) return;
    
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

  // 再生速度変更
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (isPlaying) {
      stopPlayback();
      setTimeout(() => startPlayback(), 100);
    }
  };

  // 選択範囲の表示テキスト
  const getSelectionText = () => {
    const startSlot = timeSlots[startSlotIndex];
    const endSlot = timeSlots[endSlotIndex];
    
    if (startSlot.dateIndex === endSlot.dateIndex) {
      // 同じ日の場合
      return `${startSlot.displayLabel} - ${endSlot.displayLabel}`;
    } else {
      // 異なる日の場合
      const timeDiff = endSlotIndex - startSlotIndex;
      const hours = Math.floor(timeDiff / 60);
      const minutes = timeDiff % 60;
      return `${startSlot.displayLabel} - ${endSlot.displayLabel} (${hours}時間${minutes}分)`;
    }
  };

  // 現在の再生フレーム情報の表示（拡張版）
  const getCurrentFrameInfo = () => {
    if (timeseriesData.length === 0) return { basic: '', insights: null };
    
    const currentData = timeseriesData[currentFrameIndex];
    const currentTime = new Date(currentData.timestamp);
    const totalPeople = currentData.points.reduce((sum, point) => sum + (point.value || point.intensity || 1), 0);
    
    // ピーク時間帯の分析
    const peakData = timeseriesData.reduce((peak, frame, index) => {
      const framePeople = frame.points.reduce((sum, point) => sum + (point.value || point.intensity || 1), 0);
      return framePeople > peak.count ? { count: framePeople, index, timestamp: frame.timestamp } : peak;
    }, { count: 0, index: 0, timestamp: '' });
    
    // 時間帯の分類
    const hour = currentTime.getHours();
    let timePeriod = '';
    if (hour >= 6 && hour < 10) timePeriod = '朝の通勤時間帯';
    else if (hour >= 10 && hour < 12) timePeriod = '午前中';
    else if (hour >= 12 && hour < 14) timePeriod = 'ランチタイム';
    else if (hour >= 14 && hour < 18) timePeriod = '午後の時間帯';
    else if (hour >= 18 && hour < 21) timePeriod = '夕方の時間帯';
    else if (hour >= 21 && hour < 24) timePeriod = '夜の時間帯';
    else timePeriod = '深夜・早朝';
    
    // 人流密度の評価
    const densityLevel = totalPeople > peakData.count * 0.8 ? '高密度' : 
                        totalPeople > peakData.count * 0.5 ? '中密度' : '低密度';
    
    const basic = `フレーム ${currentFrameIndex + 1}/${timeseriesData.length} - ${currentTime.toLocaleString('ja-JP')}`;
    
    const insights = {
      currentTime: currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      timePeriod,
      totalPeople: totalPeople.toLocaleString(),
      densityLevel,
      peakTime: new Date(peakData.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      isPeakTime: currentFrameIndex === peakData.index,
      progressPercent: Math.round((currentFrameIndex / (timeseriesData.length - 1)) * 100)
    };
    
    return { basic, insights };
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
        {timeseriesData.length > 0 && (() => {
          const frameInfo = getCurrentFrameInfo();
          return (
            <div className="frame-info">
              <span className="frame-text">{frameInfo.basic}</span>
              {frameInfo.insights && (
                <div className="insights-info">
                  <p>現在の時刻: {frameInfo.insights.currentTime}</p>
                  <p>時間帯: {frameInfo.insights.timePeriod}</p>
                  <p>総人数: {frameInfo.insights.totalPeople}</p>
                  <p>人流密度: {frameInfo.insights.densityLevel}</p>
                  <p>ピーク時刻: {frameInfo.insights.peakTime}</p>
                  <p>進捗: {frameInfo.insights.progressPercent}%</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 再生コントロール */}
      <div className="playback-controls">
        <div className="speed-controls">
          <label>再生速度:</label>
          <select 
            value={playbackSpeed} 
            onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
            disabled={props.isLoading}
          >
            <option value={100}>高速 (0.1秒)</option>
            <option value={500}>普通 (0.5秒)</option>
            <option value={1000}>通常 (1秒)</option>
            <option value={2000}>ゆっくり (2秒)</option>
          </select>
        </div>
        
        {timeseriesData.length > 0 && (
          <div className="frame-controls">
            <button 
              onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
              disabled={isPlaying || props.isLoading}
            >
              ⏮
            </button>
            <button 
              onClick={() => setCurrentFrameIndex(Math.min(timeseriesData.length - 1, currentFrameIndex + 1))}
              disabled={isPlaying || props.isLoading}
            >
              ⏭
            </button>
          </div>
        )}
      </div>

      {/* メインタイムライン */}
      <div className="timeline-container" ref={timelineRef}>
        {/* 再生ボタン */}
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          disabled={props.isLoading || timeseriesData.length === 0}
          title={timeseriesData.length === 0 ? '時間範囲を選択して「適用」ボタンを押してください' : isPlaying ? '再生を停止' : '再生を開始'}
        >
          {isPlaying ? '⏸' : '▷'}
        </button>
        
        {/* ガイドメッセージ */}
        {timeseriesData.length === 0 && !props.isLoading && (
          <div className="playback-guide">
            <span className="guide-text">
              💡 時間範囲を選択して「適用」ボタンを押すと再生できます
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
          className={`apply-btn ${timeseriesData.length === 0 && !props.isLoading ? 'highlight' : ''}`}
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