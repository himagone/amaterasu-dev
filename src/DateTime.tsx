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
  showHumanFlowParticles?: boolean;
  showHeatmapLayer?: boolean;
  map?: any;
  timeWindowMinutes?: number;
  setTimeWindowMinutes?: (minutes: number) => void;
  manualFetchHeatmap?: (() => void) | null;
};

let timer: ReturnType<typeof setInterval> | null = null;

function DateTime(props: Props) {
  const [ theDate, setTheDate ] = useState<string>(now.date);
  const [ theTime, setTheTime ] = useState<string>(now.time);
  const [ activeButton, setActiveButton ] = useState<number | null>(null);
  const [ isUpdating, setIsUpdating ] = useState<boolean>(false);
  const timeDisplayRef = useRef<HTMLDivElement>(null);

  const ref = useRef<HTMLDivElement>(null)

  // パーティクルレイヤー更新（シンプル版）
  const updateParticleLayer = async (newTime: Date) => {
    if (!props.map) return;
    
    try {
      // 既存のパーティクルレイヤーを削除
      if (props.map.getLayer('human-flow-particles')) {
        props.map.removeLayer('human-flow-particles');
      }
      if (props.map.getSource('human-flow-source')) {
        props.map.removeSource('human-flow-source');
      }
      
      // TileJSONを取得
      const timestamp = `${newTime.toISOString().slice(0, 19)}`;
      const timeWindowMinutes = props.timeWindowMinutes || 30;
      const tileJsonUrl = `http://localhost:8080/api/v1/flow-vectors/tile.json?timestamp=${timestamp}&timeWindowMinutes=${timeWindowMinutes}`;
      
      const response = await fetch(tileJsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch TileJSON: ${response.status}`);
      }
      
      const tileJsonData = await response.json();
      
      // タイルURLテンプレートを取得してパラメータを追加
      const tileUrlTemplate = tileJsonData.tiles[0];
      const tileUrlWithParams = `${tileUrlTemplate}?timestamp=${timestamp}&timeWindowMinutes=${timeWindowMinutes}`;
      
      props.map.addSource('human-flow-source', {
        'type': 'raster-array',
        'tiles': [tileUrlWithParams],
        'tileSize': 256,
        'minzoom': tileJsonData.minzoom || 0,
        'maxzoom': tileJsonData.maxzoom || 14
      });
      
      props.map.addLayer({
        'id': 'human-flow-particles',
        'type': 'raster-particle',
        'source': 'human-flow-source',
        'source-layer': 'flow-vectors',
        'paint': {
          'raster-particle-speed-factor': 0.3,
          'raster-particle-fade-opacity-factor': 0.8,
          'raster-particle-reset-rate-factor': 0.2,
          'raster-particle-count': 3000,
          'raster-particle-max-speed': 30,
          'raster-particle-color': [
            'interpolate',
            ['linear'],
            ['raster-particle-speed'],
            0, 'rgba(30,144,255,200)',
            3, 'rgba(0,255,127,200)',
            8, 'rgba(255,255,0,200)',
            15, 'rgba(255,165,0,200)',
            25, 'rgba(255,69,0,255)'
          ]
        }
      });
    } catch (error) {
      console.warn('Failed to update particle layer:', error);
    }
  }

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
    
    // パーティクルレイヤーの場合は更新
    if (props.showHumanFlowParticles) {
      updateParticleLayer(current);
    }
    
    // ヒートマップレイヤーの場合は手動fetch
    if (props.showHeatmapLayer && props.manualFetchHeatmap) {
      props.manualFetchHeatmap();
    }
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
    
    if (props.showHumanFlowParticles) {
      updateParticleLayer(current);
    }
    
    // ヒートマップレイヤーの場合は手動fetch
    if (props.showHeatmapLayer && props.manualFetchHeatmap) {
      props.manualFetchHeatmap();
    }
    
    // 現在の時間を保持
    const lastDateTime = new Date(current);
    
    // 3秒ごとに進める
    timer = setInterval(() => {
      lastDateTime.setMinutes(lastDateTime.getMinutes() + (direction * stepMinutes));
      props.setDateTime(lastDateTime.toString());
      updateDateTimeDisplay(lastDateTime);
      
      if (props.showHumanFlowParticles) {
        updateParticleLayer(lastDateTime);
      }
      
      // ヒートマップレイヤーの場合は手動fetch
      if (props.showHeatmapLayer && props.manualFetchHeatmap) {
        props.manualFetchHeatmap();
      }
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
    
    if (props.showHumanFlowParticles) {
      updateParticleLayer(current);
    }
    
    // ヒートマップレイヤーの場合は手動fetch
    if (props.showHeatmapLayer && props.manualFetchHeatmap) {
      props.manualFetchHeatmap();
    }
    
    const lastDateTime = new Date(current);
    timer = setInterval(() => {
      lastDateTime.setMinutes(lastDateTime.getMinutes() + (direction * stepMinutes));
      props.setDateTime(lastDateTime.toString());
      updateDateTimeDisplay(lastDateTime);
      
      if (props.showHumanFlowParticles) {
        updateParticleLayer(lastDateTime);
      }
      
      // ヒートマップレイヤーの場合は手動fetch
      if (props.showHeatmapLayer && props.manualFetchHeatmap) {
        props.manualFetchHeatmap();
      }
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
    
    // パーティクルレイヤーの場合は更新
    if (props.showHumanFlowParticles) {
      updateParticleLayer(current);
    }
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
    
    // パーティクルレイヤーの場合は更新
    if (props.showHumanFlowParticles) {
      updateParticleLayer(current);
    }
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
        {/* 時間窓設定 - パーティクルまたはヒートマップがONの時に表示 */}
        {(props.showHumanFlowParticles || props.showHeatmapLayer) && (
          <div className="time-window-settings">
            <label>
              時間: {props.timeWindowMinutes || 30}分 
              {props.showHumanFlowParticles && <span style={{ color: '#2196F3', fontSize: '12px' }}> (パーティクル)</span>}
              {props.showHeatmapLayer && <span style={{ color: '#FF6B00', fontSize: '12px' }}> (ヒートマップ)</span>}
              <input 
                type="range" 
                min="1" 
                max="180" 
                step="1" 
                value={props.timeWindowMinutes || 30} 
                onChange={(e) => props.setTimeWindowMinutes && props.setTimeWindowMinutes(parseInt(e.target.value))}
                className="slider"
                style={{ display: 'block', width: '100%', marginTop: '5px' }}
              />
            </label>
          </div>
        )}

        <div ref={timeDisplayRef} className="time-display">
          <input type="date" min={minDate} max={maxDate} value={theDate} onChange={updateDate} />
          <input type="time" value={theTime} onChange={updateTime} />
        </div>
        <span className="player">
          <button onClick={() => playSingleStep(-1)}>
            <FontAwesomeIcon icon={faCaretLeft} />
          </button>
          <button onClick={pausePlayback}>
            <FontAwesomeIcon icon={faPause} />
          </button>
          <button onClick={() => playSingleStep(1)}>
            <FontAwesomeIcon icon={faCaretRight} />
          </button>
        </span>
      </div>
    </>
  )
}

export default DateTime
