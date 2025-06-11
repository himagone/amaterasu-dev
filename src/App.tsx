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
  const [showHumanFlowParticles, setShowHumanFlowParticles] = useState<boolean>(false);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [particleDataStatus, setParticleDataStatus] = useState<{isUsingRealData: boolean, dataPoints: number} | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [timeWindowMinutes, setTimeWindowMinutes] = useState<number>(30);

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

  const handleParticleDataUpdate = (status: {isUsingRealData: boolean, dataPoints: number}) => {
    setParticleDataStatus(status);
  };

  // パーティクル表示がOFFになったときの状態リセット
  useEffect(() => {
    if (!showHumanFlowParticles) {
      setParticleDataStatus(null);
    }
  }, [showHumanFlowParticles]);

  // Deck.glレイヤーの作成
  const deckLayers = useMemo(() => {
    const layerList: any[] = [];

    // ヒートマップレイヤー
    if (showHeatmapLayer && heatmapData.length > 0) {
      const heatmapLayer = new HeatmapLayer({
        id: 'density-heatmap',
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
    }

    return layerList;
  }, [showHeatmapLayer, heatmapData]);

  // Deck.glオーバーレイの作成
  const deckOverlay = useMemo(() => {
    if (deckLayers.length === 0) return null;

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
          showHumanFlowParticles={showHumanFlowParticles}
          showHeatmapLayer={showHeatmapLayer}
          onHeatmapDataUpdate={handleHeatmapDataUpdate}
          onParticleDataUpdate={handleParticleDataUpdate}
          mapInstance={mapInstance}
          setMapInstance={setMapInstance}
          timeWindowMinutes={timeWindowMinutes}
        />
        <Weather currentDate={currentDate} />
        
        <div className={`visualization-controls ${isControlsCollapsed ? 'collapsed' : ''}`}>
          <div className="controls-header" onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}>
            <h2>表示</h2>
            <button className="toggle-controls-btn" type="button">
              {isControlsCollapsed ? '📊' : '×'}
            </button>
          </div>
          
          <div className="controls-content">
            <DateTime 
              currentDate={selectedDateTime.toString()} 
              setDateTime={(dateStr: string) => setSelectedDateTime(new Date(dateStr))} 
              availableTimes={availableTimes}
              showHumanFlowParticles={showHumanFlowParticles}
              showHeatmapLayer={showHeatmapLayer}
              map={mapInstance}
              timeWindowMinutes={timeWindowMinutes}
              setTimeWindowMinutes={setTimeWindowMinutes}
            />
            
            {/* 人流パーティクル制御パネル */}
            <div className="human-flow-controls">
              <h3></h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showHumanFlowParticles}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowHumanFlowParticles(true);
                      setShowHeatmapLayer(false); // ヒートマップをOFF
                    } else {
                      setShowHumanFlowParticles(false);
                    }
                  }}
                />
                <span className="slider">粒度を表示</span>
              </label>
              
              {/* パーティクル情報 */}
              <div className={`particle-info ${!showHumanFlowParticles ? 'hidden' : ''}`}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  データ状態: {particleDataStatus?.isUsingRealData ? '🌐 実データ' : '❌ データなし'}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {particleDataStatus?.isUsingRealData 
                    ? `${particleDataStatus.dataPoints || 0}個のベクターデータからパーティクルを生成`
                    : 'APIからデータを取得できませんでした。ネットワーク接続とAPIサーバーの状態を確認してください。'
                  }
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>色の説明:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(30,144,255)', borderRadius: '2px' }}></div>
                    <span>低速 (0-5 単位/秒)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(0,255,127)', borderRadius: '2px' }}></div>
                    <span>中速 (5-10 単位/秒)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,255,0)', borderRadius: '2px' }}></div>
                    <span>高速 (10-15 単位/秒)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,165,0)', borderRadius: '2px' }}></div>
                    <span>高速 (15-20 単位/秒)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,69,0)', borderRadius: '2px' }}></div>
                    <span>最高速 (20+ 単位/秒)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ヒートマップ制御パネル */}
            <div className="heatmap-controls">
              <h3></h3>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showHeatmapLayer}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setShowHeatmapLayer(true);
                      setShowHumanFlowParticles(false); // パーティクルをOFF
                    } else {
                      setShowHeatmapLayer(false);
                    }
                  }}
                />
                <span className="slider">密度ヒートマップを表示</span>
              </label>
              
              {/* ヒートマップ情報 */}
              <div className={`heatmap-info ${!showHeatmapLayer ? 'hidden' : ''}`}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  データ状態: {heatmapData.length > 0 ? '🌐 実データ' : '⏳ 読み込み中'}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {heatmapData.length > 0 
                    ? `${heatmapData.length}個のポイントから密度ヒートマップを生成`
                    : 'APIからヒートマップデータを取得中...'
                  }
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>密度の色分け:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(0,255,0)', borderRadius: '2px' }}></div>
                    <span>低密度</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,255,0)', borderRadius: '2px' }}></div>
                    <span>中密度</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,165,0)', borderRadius: '2px' }}></div>
                    <span>高密度</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: 'rgb(255,0,0)', borderRadius: '2px' }}></div>
                    <span>最高密度</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
export default App
