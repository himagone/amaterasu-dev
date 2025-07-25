import React, { useState } from 'react';
import './EventTimeSelector.css';

export interface EventTimeSlot {
  startTime: string;
  endTime: string;
}

export type EventDaySelection = 'day1' | 'day2' | 'both';

interface EventTimeSelectorProps {
  onEventTimeSlotsChange: (slots: EventTimeSlot[]) => void;
  selectedDay?: EventDaySelection;
  onToggleCongestionPoints?: () => void;
  showCongestionPoints?: boolean;
}

const EventTimeSelector: React.FC<EventTimeSelectorProps> = ({
  onEventTimeSlotsChange,
  selectedDay = 'both',
  onToggleCongestionPoints,
  showCongestionPoints = false
}) => {
  const [currentSelection, setCurrentSelection] = useState<EventDaySelection>(selectedDay);

  // イベント時間スロットの定義
  const eventTimeSlots = {
    day1: [
      {
        startTime: "2025-03-01T16:00:00",
        endTime: "2025-03-01T19:00:00"
      }
    ],
    day2: [
      {
        startTime: "2025-03-02T15:30:00",
        endTime: "2025-03-02T18:30:00"
      }
    ],
    both: [
      {
        startTime: "2025-03-01T16:00:00",
        endTime: "2025-03-01T19:00:00"
      },
      {
        startTime: "2025-03-02T15:30:00",
        endTime: "2025-03-02T18:30:00"
      }
    ]
  };

  const handleDaySelection = (selection: EventDaySelection) => {
    setCurrentSelection(selection);
    onEventTimeSlotsChange(eventTimeSlots[selection]);
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  };

  return (
    <div className="event-time-selector">
      <div className="selector-header">
        <h3>イベント時間選択</h3>
      </div>
      
      <div className="day-selection-buttons">
        <button
          className={`day-button ${currentSelection === 'day1' ? 'active' : ''}`}
          onClick={() => handleDaySelection('day1')}
        >
          <div className="day-label">1日目</div>
          <div className="day-date">3/1(土)</div>
        </button>
        
        <button
          className={`day-button ${currentSelection === 'day2' ? 'active' : ''}`}
          onClick={() => handleDaySelection('day2')}
        >
          <div className="day-label">2日目</div>
          <div className="day-date">3/2(日)</div>
        </button>
        
        <button
          className={`day-button ${currentSelection === 'both' ? 'active' : ''}`}
          onClick={() => handleDaySelection('both')}
        >
          <div className="day-label">両日</div>
          <div className="day-date">3/1-2</div>
        </button>
      </div>

      {/* 混雑ポイント分析ボタン */}
      {onToggleCongestionPoints && (
        <div className="congestion-section">
          <button 
            onClick={onToggleCongestionPoints}
            className={`congestion-btn ${showCongestionPoints ? 'active' : ''}`}
          >
            {showCongestionPoints ? '🚦 混雑分析を閉じる' : '🚦 混雑ポイント分析'}
          </button>
        </div>
      )}
    </div>
  );
};

export default EventTimeSelector; 