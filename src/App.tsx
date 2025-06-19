import { useState, useEffect, useRef, useMemo } from 'react'
import Header from './Header.tsx'
import Map from './Map.tsx'
import './App.css'
import Weather from './Weather.tsx'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { LightingEffect, AmbientLight, DirectionalLight, FlyToInterpolator } from '@deck.gl/core'
import { MapboxOverlay } from '@deck.gl/mapbox';
import DateTime from './DateTime'
import { easeCubic } from 'd3-ease';

// 必要な型とデフォルト値を定義
type LocationData = any;
type PersonCountRange = any;
interface HeatmapPoint {
  h3Index: string;
  lat: number;
  lng: number;
  intensity: number;
  value: number;
}

const defaultPersonCountRanges: PersonCountRange[] = [];
const now = new Date();

const getZoomLevelFile = (zoom: number): string => {
  return `data_zoom_${Math.floor(zoom)}.csv`;
};

function App() {
  const [layers, setLayers] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [personCount, setPersonCount] = useState<PersonCountRange>({ min: 0, max: 0 });
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set());
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [currentCsvFile, setCurrentCsvFile] = useState<string>(getZoomLevelFile(10));
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState<number>(30);
  const [isHeatmapLoading, setIsHeatmapLoading] = useState<boolean>(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [manualFetchHeatmap, setManualFetchHeatmap] = useState<(() => void) | null>(null);

  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom);
    const newFile = getZoomLevelFile(zoom);
    if (newFile !== currentCsvFile) {
      setCurrentCsvFile(newFile);
    }
  };

  const handleHeatmapDataUpdate = (data: HeatmapPoint[]) => {
    setHeatmapData(data);
  };

  const handleHeatmapLoadingStateChange = (isLoading: boolean) => {
    setIsHeatmapLoading(isLoading);
  };

  const handleHeatmapErrorStateChange = (error: string | null) => {
    setHeatmapError(error);
  };

  // Deck.glレイヤーの作成（レイヤー重複を防ぐ）
  const deckLayers = useMemo(() => {
    const layerList: any[] = [];

    // ヒートマップレイヤー（showHeatmapLayerがfalseの場合は絶対に表示しない）
    if (showHeatmapLayer && heatmapData.length > 0) {
      const layerId = `density-heatmap-${Date.now()}`; // 一意なIDを生成
      const heatmapLayer = new HeatmapLayer({
        id: layerId,
        data: heatmapData,
        pickable: true,
        getPosition: (d: HeatmapPoint) => [d.lng, d.lat],
        getWeight: (d: HeatmapPoint) => d.intensity,
        radiusPixels: 50,
        intensityScale: 0.6,
        threshold: 0.05,
        colorRange: [
          [0, 255, 0, 100],      // 緑: 低密度 (透過度アップ)
          [255, 255, 0, 120],    // 黄: 中密度 (透過度アップ)
          [255, 165, 0, 140],    // オレンジ: 高密度 (透過度アップ)
          [255, 69, 0, 160],     // 赤オレンジ: 高密度 (透過度アップ)
          [255, 0, 0, 180],      // 赤: 最高密度 (透過度アップ)
          [139, 0, 0, 200]       // 暗赤: 極高密度 (透過度アップ)
        ],
        updateTriggers: {
          getPosition: [heatmapData],
          getWeight: [heatmapData]
        }
      });
      layerList.push(heatmapLayer);
      console.log(`Created heatmap layer with ID: ${layerId}, data points: ${heatmapData.length}`);
    }

    return layerList;
  }, [showHeatmapLayer, heatmapData]);

  // Deck.glオーバーレイの作成（重複レイヤーを防ぐ）
  const deckOverlay = useMemo(() => {
    // レイヤーがない場合はnullを返す（古いオーバーレイが削除される）
    if (deckLayers.length === 0) {
      console.log('No layers available - overlay will be removed');
      return null;
    }

    console.log(`Creating new MapboxOverlay with ${deckLayers.length} layers`);
    return new MapboxOverlay({
      layers: deckLayers,
      getTooltip: (info: any) => {
        if (info.object && info.object.h3Index) {
          return {
            html: `
              <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
                <div><strong>位置:</strong> ${info.object.lat.toFixed(6)}, ${info.object.lng.toFixed(6)}</div>
                <div><strong>密度レベル:</strong> ${info.object.intensity}</div>
                <div><strong>値:</strong> ${info.object.value.toFixed(1)}</div>
                <div><strong>H3インデックス:</strong> ${info.object.h3Index}</div>
              </div>
            `,
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white'
            }
          };
        }
        return null;
      }
    });
  }, [deckLayers]);

  return (
    <>
      <div className="app">
        <Header />
        <Map 
          currentDate={currentDate} 
          selectedDateTime={selectedDateTime}
          deckOverlay={deckOverlay}
          onZoomChange={handleZoomChange}
          showHeatmapLayer={showHeatmapLayer}
          mapInstance={mapInstance}
          setMapInstance={setMapInstance}
        />
        <Weather currentDate={currentDate} />
        
        <div className={`visualization-controls ${isControlsCollapsed ? 'collapsed' : ''}`}>
          <div className="controls-header" onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}>
            <h2>レイヤー</h2>
            <button className="toggle-controls-btn" type="button">
              {isControlsCollapsed ? '☰' : '×'}
            </button>
          </div>
          
          <div className="controls-content">
            {/* ヒートマップ制御パネル */}
            <div className="layer-control">
              <h3>密度ヒートマップ</h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showHeatmapLayer}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowHeatmapLayer(true);
                    } else {
                      setShowHeatmapLayer(false);
                      // ヒートマップOFF時は即座にデータをクリアしてレイヤーを非表示に
                      setHeatmapData([]);
                      setHeatmapError(null);
                    }
                  }}
                />
                <span className="slider">密度レイヤー</span>
              </label>
              
              {/* ヒートマップ情報 */}
              <div className={`layer-info ${!showHeatmapLayer ? 'hidden' : ''}`}>
                <div className="status">
                  {heatmapError ? '❌ エラー' :
                   isHeatmapLoading ? '⏳ 読み込み中' :
                   heatmapData.length > 0 ? '🌐 アクティブ' : '⚪ 待機中'}
                </div>
                <div className="description">
                  {heatmapError ? `エラー: ${heatmapError}` :
                   isHeatmapLoading ? 'データ取得中...' :
                   heatmapData.length > 0 
                    ? `${heatmapData.length}個のポイントから密度マップを生成`
                    : '時間を変更するとデータを自動取得します'
                  }
                </div>
                <div className="legend">
                  <div className="legend-title">密度レベル</div>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: 'rgb(0,255,0)' }}></div>
                      <span>低密度</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: 'rgb(255,255,0)' }}></div>
                      <span>中密度</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: 'rgb(255,165,0)' }}></div>
                      <span>高密度</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: 'rgb(255,0,0)' }}></div>
                      <span>最高密度</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 時間窓設定 */}
            {showHeatmapLayer && (
              <div className="time-window-settings">
                <div className="time-window-title">
                  時間窓: {timeWindowMinutes}分
                  <span style={{ color: '#ff9800', fontSize: '10px' }}> (ヒートマップ)</span>
                </div>
                <div className="time-window-buttons">
                  <button
                    onClick={() => setTimeWindowMinutes(1)}
                    className={`time-window-btn ${timeWindowMinutes === 1 ? 'active' : ''}`}
                  >
                    1分
                  </button>
                  <button
                    onClick={() => setTimeWindowMinutes(15)}
                    className={`time-window-btn ${timeWindowMinutes === 15 ? 'active' : ''}`}
                  >
                    15分
                  </button>
                  <button
                    onClick={() => setTimeWindowMinutes(30)}
                    className={`time-window-btn ${timeWindowMinutes === 30 ? 'active' : ''}`}
                  >
                    30分
                  </button>
                  <button
                    onClick={() => setTimeWindowMinutes(60)}
                    className={`time-window-btn ${timeWindowMinutes === 60 ? 'active' : ''}`}
                  >
                    1時間
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Windy風の時間コントロール（下部固定） */}
        <div className="datetime-controls">
          <DateTime 
            currentDate={selectedDateTime.toString()} 
            setDateTime={(dateStr: string) => setSelectedDateTime(new Date(dateStr))} 
            availableTimes={availableTimes}
            timeWindowMinutes={timeWindowMinutes}
            setTimeWindowMinutes={setTimeWindowMinutes}
          />
        </div>
      </div>
    </>
  )
}
export default App
