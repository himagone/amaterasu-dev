import { useState, useMemo, useRef } from 'react'
import Header from './components/Header.tsx'
import Map from './components/Map.tsx'
import './App.css'
import Weather from './components/Weather.tsx'
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3ClusterLayer, H3HexagonLayer } from '@deck.gl/geo-layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import {Deck, PickingInfo} from '@deck.gl/core';
import { cellToLatLng } from 'h3-js';
import { easeCubic } from 'd3-ease';
import DateTime from './components/DateTime'
import LayerControls from './components/LayerControls'
import LoadingComponent from './components/LoadingComponent'
import getHeatmapData from './utils/getHeatmap'
import { heatmapPoints } from './types/heatmap'
import { createHeatmapLayer, COLOR_SCHEMES } from './utils/createHeatmapLayer'

// UXフローの段階を定義
enum UXPhase {
  DATE_SELECTION = 'date_selection',
  LOADING = 'loading',
  ANALYSIS = 'analysis'
}

// 必要な型とデフォルト値を定義
type LocationData = any;
type PersonCountRange = any;

// H3ヒートマップデータの型定義
type H3HeatmapData = {
  h3_index: string;
  person_count: number;
  time: string;
  lat: number;
  lng: number;
};


const materialProps = {
  ambient: 0.5,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51] as [number, number, number]
};

const defaultPersonCountRanges: PersonCountRange[] = [];
const now = new Date();

const getZoomLevelFile = (zoom: number): string => {
  return `data_zoom_${Math.floor(zoom)}.csv`;
};

function App() {
  // UXフローの状態管理
  const [currentPhase, setCurrentPhase] = useState<UXPhase>(UXPhase.DATE_SELECTION);
  const [dateRange, setDateRange] = useState<{start: Date, end: Date} | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const [layers, setLayers] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [personCount, setPersonCount] = useState<PersonCountRange>({ min: 0, max: 0 });
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set());
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [currentCsvFile, setCurrentCsvFile] = useState<string>(getZoomLevelFile(10));
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(false);
  const [showH3Layer, setShowH3Layer] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<heatmapPoints[]>([]);
  const [h3Data, setH3Data] = useState<H3HeatmapData[]>([]);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // 地図インスタンスの安全な設定
  const handleSetMapInstance = (instance: any) => {
    try {
      mapInstanceRef.current = instance;
      setMapInstance(instance);
    } catch (error) {
      console.warn('Map instance setting error:', error);
    }
  };
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

      const handleHeatmapDataUpdate = (data: heatmapPoints[]) => {
      setHeatmapData(data);
      
      if (data.length > 0) {
        const values = data.map(d => d.value || d.intensity || 1);
        console.log('Value range:', {
          min: Math.min(...values),
          max: Math.max(...values)
        });
      }
    };

  const handleHeatmapLoadingStateChange = (isLoading: boolean) => {
    setIsHeatmapLoading(isLoading);
  };

  const handleHeatmapErrorStateChange = (error: string | null) => {
    setHeatmapError(error);
  };

  const deckLayers = useMemo(() => {
          const layerList: any[] = [];

    if (showHeatmapLayer && heatmapData.length > 0) {
      // データの値の範囲を確認
      const heatmapLayer = new H3HexagonLayer({
        id: 'value-based-heatmap',
        data: heatmapData,
        getHexagon: (d: heatmapPoints) => d.h3Index,
        getFillColor: (d: heatmapPoints) => {
          const value = d.value || 0;
          
          // valueに基づいた正確な色分け
          if (value >= 1000) {
            return [139, 0, 0, 220];      // ダークレッド (1000人以上)
          } else if (value >= 500) {
            return [255, 69, 0, 210];     // レッドオレンジ (500-999人)
          } else if (value >= 200) {
            return [255, 140, 0, 200];    // ダークオレンジ (200-499人)
          } else if (value >= 100) {
            return [255, 215, 0, 190];    // ゴールド (100-199人)
          } else if (value >= 50) {
            return [255, 255, 0, 180];    // イエロー (50-99人)
          } else if (value >= 20) {
            return [154, 205, 50, 170];   // イエローグリーン (20-49人)
          } else if (value >= 10) {
            return [0, 255, 127, 160];    // スプリンググリーン (10-19人)
          } else if (value >= 5) {
            return [0, 191, 255, 150];    // ディープスカイブルー (5-9人)
          } else if (value >= 1) {
            return [65, 105, 225, 140];   // ロイヤルブルー (1-4人)
          } else {
            return [47, 79, 79, 80];      // ダークスレートグレー (0人)
          }
        },
        stroked: false,
        filled: true,
        extruded: false,
        opacity: 0.8,
        pickable: true
      });

      layerList.push(heatmapLayer);
    }

    return layerList;
     }, [showHeatmapLayer, heatmapData, selectedDateTime]);

  // Deck.glオーバーレイの作成
  const deckOverlay = useMemo(() => {
    if (deckLayers.length === 0) {
      return null;
    }
    
    return new MapboxOverlay({
      layers: deckLayers,
      interleaved: true,
      getTooltip: (info: any) => {
        if (info.object) {
          // H3ヒートマップの場合
          if (info.object.h3_index) {
            return {
              html: `
                <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
                  <div><strong>H3インデックス:</strong> ${info.object.h3_index}</div>
                  <div><strong>人数:</strong> ${info.object.person_count}</div>
                  <div><strong>時刻:</strong> ${new Date(info.object.time).toLocaleString('ja-JP')}</div>
                  <div><strong>位置:</strong> ${info.object.lat?.toFixed(6)}, ${info.object.lng?.toFixed(6)}</div>
                </div>
              `,
              style: {
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white'
              }
            };
          }
        }
        return null;
      }
    });
  }, [deckLayers]);

  // 日付範囲設定ハンドラー
  const handleDateRangeSelect = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  // プログレスシミュレーション関数
  const simulateProgress = (onProgress: (progress: number, step: string) => void, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      const steps = [
        { progress: 20, step: 'データベースに接続中...', delay: 800 },
        { progress: 40, step: 'クエリを実行中...', delay: 1200 },
        { progress: 60, step: 'データを集計中...', delay: 1500 },
        { progress: 80, step: 'ヒートマップを生成中...', delay: 1000 },
        { progress: 95, step: '最終処理中...', delay: 500 },
        { progress: 100, step: '完了', delay: 200 }
      ];

      let currentStepIndex = 0;

      const processStep = () => {
        if (signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        if (currentStepIndex >= steps.length) {
          resolve();
          return;
        }

        const step = steps[currentStepIndex];
        onProgress(step.progress, step.step);

        setTimeout(() => {
          currentStepIndex++;
          processStep();
        }, step.delay);
      };

      processStep();
    });
  };

  const handleApplyDateRange = async () => {
    if (!dateRange) return;
    
    // 地図の表示範囲を取得
    let bounds = null;
    const currentMapInstance = mapInstanceRef.current || mapInstance;
    if (currentMapInstance && currentMapInstance.getBounds) {
      try {
        const mapBounds = currentMapInstance.getBounds();
        bounds = {
          north: mapBounds.getNorth(),
          south: mapBounds.getSouth(),
          east: mapBounds.getEast(),
          west: mapBounds.getWest()
        };
        console.log('Map bounds:', bounds);
      } catch (error) {
        console.warn('Failed to get map bounds:', error);
      }
    }
    
    setCurrentPhase(UXPhase.LOADING);
    setLoadingProgress(0);
    setLoadingStep('初期化中...');
    
    // AbortControllerを作成
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      const progressPromise = simulateProgress(
        (progress, step) => {
          setLoadingProgress(progress);
          setLoadingStep(step);
        },
        controller.signal
      );

      const heatmapPromise = getHeatmapData(
        dateRange.start,
        dateRange.end,
        bounds || undefined,
        currentZoom,
        controller.signal
      );

      // 両方の処理を待つ
      const [, heatmapData] = await Promise.all([progressPromise, heatmapPromise]);
      
      
      setHeatmapData(heatmapData);
      setShowHeatmapLayer(true);
      setCurrentPhase(UXPhase.ANALYSIS);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was cancelled');
        setCurrentPhase(UXPhase.DATE_SELECTION);
      } else {
        console.error('Error fetching heatmap data:', error);
        setHeatmapError(error instanceof Error ? error.message : 'Unknown error');
        setCurrentPhase(UXPhase.DATE_SELECTION);
      }
    } finally {
      setAbortController(null);
      setLoadingProgress(0);
      setLoadingStep('');
    }
  };

  return (
    <>
      <div className="app">
        {/* オーバーレイ - DATE_SELECTION段階でのみ表示 */}
        {currentPhase === UXPhase.DATE_SELECTION && (
          <div className="date-selection-overlay">
            <div className="overlay-background"></div>
            <div className="date-selection-modal">
              <DateTime 
                currentDate={selectedDateTime.toString()} 
                setDateTime={(dateStr: string) => setSelectedDateTime(new Date(dateStr))} 
                availableTimes={availableTimes}
                timeWindowMinutes={timeWindowMinutes}
                setTimeWindowMinutes={setTimeWindowMinutes}
                onDateRangeSelect={handleDateRangeSelect}
                onApply={handleApplyDateRange}
                isMainMode={true}
              />
            </div>
          </div>
        )}

        {/* ローディング表示 - React Awesome Loaders使用 */}
        {currentPhase === UXPhase.LOADING && (
          <LoadingComponent
            progress={loadingProgress}
            text={loadingStep}
          />
        )}

        {/* メインコンテンツ - 透過度とインタラクション制御 */}
        <div className={`main-content ${currentPhase === UXPhase.DATE_SELECTION ? 'disabled-overlay' : ''}`}>
          <Header />
          <Map 
            currentDate={currentDate} 
            selectedDateTime={selectedDateTime}
            deckOverlay={deckOverlay}
            onZoomChange={handleZoomChange}
            showHeatmapLayer={showHeatmapLayer}
            mapInstance={mapInstance}
            setMapInstance={handleSetMapInstance}
          />
          <Weather currentDate={currentDate} />
          
          <LayerControls
            isControlsCollapsed={isControlsCollapsed}
            setIsControlsCollapsed={setIsControlsCollapsed}
            showHeatmapLayer={showHeatmapLayer}
            setShowHeatmapLayer={setShowHeatmapLayer}
            heatmapData={heatmapData}
            setHeatmapData={handleHeatmapDataUpdate}
            heatmapError={heatmapError}
            setHeatmapError={setHeatmapError}
            isHeatmapLoading={isHeatmapLoading}
            timeWindowMinutes={timeWindowMinutes}
            setTimeWindowMinutes={setTimeWindowMinutes}
            dateRange={dateRange}
           />

        </div>
      </div>
    </>
  )
}
export default App
