import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Header from './components/Header.tsx'
import Map from './components/Map.tsx'
import './App.css'
import Weather from './components/Weather.tsx'
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer, IconLayer } from '@deck.gl/layers';
import {Deck, PickingInfo} from '@deck.gl/core';
import TimeRangeSlider from './components/TimeRangeSlider'
import LayerControls from './components/LayerControls'
import MarketingInsights from './components/MarketingInsights'
import TransportationModeSelector from './components/TransportationModeSelector'
import getHeatmapData from './utils/getHeatmap'
import { getHeatmapTimeseriesData } from './utils/getHeatmap'
import { heatmapPoints } from './types/heatmap'
import { createHeatmapLayer, COLOR_SCHEMES } from './utils/createHeatmapLayer'
import getDemographicData from './utils/getDemographicData'
import { DemographicFilters, DemographicPoint } from './types/demographicData'

// UXフローの段階を定義
enum UXPhase {
  DATE_SELECTION = 'date_selection',
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

function App() {
  // UXフローの状態管理
  const [currentPhase, setCurrentPhase] = useState<UXPhase>(UXPhase.ANALYSIS);
  // デフォルトの時間範囲を設定（過去24時間のデータ）
  const defaultEndDate = new Date('2025-02-23T18:00:00');
  const defaultStartDate = new Date('2025-02-23T14:00:00');
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: defaultStartDate,
    end: defaultEndDate
  });

  const [layers, setLayers] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [personCount, setPersonCount] = useState<PersonCountRange>({ min: 0, max: 0 });
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set());
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [showHeatmapLayer, setShowHeatmapLayer] = useState<boolean>(true); // デフォルトでヒートマップレイヤーを有効にする
  const [showH3Layer, setShowH3Layer] = useState<boolean>(false);
  const [heatmapData, setHeatmapData] = useState<heatmapPoints[]>([]);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // 新しい状態変数を追加
  const [timeseriesData, setTimeseriesData] = useState<{timestamp: string, points: heatmapPoints[]}[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isTimeseriesMode, setIsTimeseriesMode] = useState<boolean>(false);
  const [isPlaybackActive, setIsPlaybackActive] = useState<boolean>(false);
  const [isTimeseriesLoading, setIsTimeseriesLoading] = useState<boolean>(false);
  // デバウンス用のタイマーRef
  const zoomDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const dateRangeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // ズームレベル変更時のデバウンス処理
  const handleZoomChange = useCallback((newZoom: number) => {
    // 現在のタイマーをクリア
    if (zoomDebounceTimer.current) {
      clearTimeout(zoomDebounceTimer.current);
    }
    
    // 新しいタイマーを設定（500ms後に実行）
    zoomDebounceTimer.current = setTimeout(() => {
      setCurrentZoom(newZoom);
    }, 500);
  }, []);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (zoomDebounceTimer.current) {
        clearTimeout(zoomDebounceTimer.current);
      }
      if (dateRangeDebounceTimer.current) {
        clearTimeout(dateRangeDebounceTimer.current);
      }
    };
  }, []);
  // 地図インスタンスの安全な設定
  const handleSetMapInstance = (instance: any) => {
    try {
      mapInstanceRef.current = instance;
      setMapInstance(instance);
    } catch (error) {
      console.warn('Map instance setting error:', error);
    }
  };
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(true); // デフォルトで折りたたむ


  const [isHeatmapLoading, setIsHeatmapLoading] = useState<boolean>(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [manualFetchHeatmap, setManualFetchHeatmap] = useState<(() => void) | null>(null);

  // 人口統計フィルター関連のstate
  const [demographicFilters, setDemographicFilters] = useState<DemographicFilters>({
    gender: [],
    age: [],
    occupation: [],
    prefecture: [],
    income: []
  });
  const [isDemographicLoading, setIsDemographicLoading] = useState<boolean>(false);
  const [demographicPointData, setDemographicPointData] = useState<DemographicPoint[]>([]);
  const [showDemographicLayer, setShowDemographicLayer] = useState<boolean>(false);
  const [demographicError, setDemographicError] = useState<string | null>(null);

  // 交通手段選択関連のstate
  const [selectedTransportationMode, setSelectedTransportationMode] = useState<string>('walking');
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>(['on_foot', 'walking', 'running', 'still']);

  // ズームレベルが変更された際にヒートマップデータを自動更新（タイムスライダー変更時は除く）
  useEffect(() => {
    // ヒートマップが表示されていて、日付範囲が設定されている場合のみ自動更新
    // 再生中の場合は更新しない
    if (showHeatmapLayer && dateRange && !isHeatmapLoading && !isPlaybackActive) {
      const updateHeatmapData = async () => {
        try{
          setIsHeatmapLoading(true);
          setHeatmapError(null);

          let bounds = null;
          const currentMapInstance = mapInstanceRef.current || mapInstance;
          if(currentMapInstance && currentMapInstance.getBounds){
            try {
              const mapBounds = currentMapInstance.getBounds();
              bounds = {
                north: mapBounds.getNorth(),
                south: mapBounds.getSouth(),
                east : mapBounds.getEast(),
                west : mapBounds.getWest(),
              };
            } catch (error) {
              console.warn('Failed to get map bounds: ', error);
            }
          }

          const data = await getHeatmapData(
            dateRange.start,
            dateRange.end,
            currentZoom,
            bounds || undefined,
            undefined, // signal
            selectedActivityTypes
          );

          setHeatmapData(data);
        }catch(error){
          setHeatmapError(error instanceof Error ? error.message : 'ヒートマップデータの更新に失敗しました');
        } finally {
          setIsHeatmapLoading(false);
        }
      }

      updateHeatmapData();
    }
  }, [currentZoom, showHeatmapLayer, dateRange, mapInstance, selectedActivityTypes, isPlaybackActive]); // isPlaybackActiveも監視に追加

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

  // タイムシリーズデータの更新処理
  const handleTimeseriesDataUpdate = (data: {timestamp: string, points: heatmapPoints[]}[]) => {
    setTimeseriesData(data);
    setIsTimeseriesMode(data.length > 0);
    setCurrentFrameIndex(0);
  };

  // 再生状態の変更処理
  const handlePlayStateChange = (isPlaying: boolean, frameIndex: number) => {
    setIsPlaybackActive(isPlaying);
    setCurrentFrameIndex(frameIndex);
    
    // 現在のフレームのデータでヒートマップを更新
    if (timeseriesData.length > 0 && frameIndex < timeseriesData.length) {
      const currentFrameData = timeseriesData[frameIndex];
      setHeatmapData(currentFrameData.points);
    }
  };

  // 交通手段選択の変更ハンドラー
  const handleTransportationModeChange = (mode: string, activityTypes: string[]) => {
    setSelectedTransportationMode(mode);
    setSelectedActivityTypes(activityTypes);
  };

  // 人口統計フィルター処理関数
  const handleDemographicFiltersChange = (filters: DemographicFilters) => {
    setDemographicFilters(filters);
  };

  const handleApplyDemographicFilters = async () => {
    // フィルターが何も選択されていない場合
    const totalFilters = Object.values(demographicFilters).reduce((sum, arr) => sum + arr.length, 0);
    if (totalFilters === 0) {
      setDemographicError('少なくとも1つの属性フィルターを選択してください');
      return;
    }

    // DateTimeで選択された範囲が必要
    if (!dateRange) {
      setDemographicError('日付と時間範囲を選択してください');
      return;
    }

    setIsDemographicLoading(true);
    setDemographicError(null);

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
      } catch (error) {
        console.warn('Failed to get map bounds:', error);
      }
    }

    try {
      console.log('人口統計フィルター適用開始:', {
        dateRange: {
          start: dateRange.start.toLocaleString('ja-JP'),
          end: dateRange.end.toLocaleString('ja-JP')
        },
        filtersCount: Object.values(demographicFilters).reduce((sum, arr) => sum + arr.length, 0)
      });

      const data = await getDemographicData(
        demographicFilters,
        dateRange,
        currentZoom,
        bounds || undefined
      );

      setDemographicPointData(data);
      setShowDemographicLayer(true);
      

    } catch (error) {
      console.error('人口統計データ取得エラー:', error);
      setDemographicError(error instanceof Error ? error.message : '人口統計データの取得に失敗しました');
    } finally {
      setIsDemographicLoading(false);
    }
  };

  const deckLayers = useMemo(() => {
          const layerList: any[] = [];

    // 通常のヒートマップレイヤー
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
        opacity: 0.4,
        pickable: true
      });

      layerList.push(heatmapLayer);
    }

    // 人口統計フィルター用スキャッタープロットレイヤー
    if (showDemographicLayer && demographicPointData.length > 0) {

      const demographicLayer = new ScatterplotLayer({
        id: 'demographic-filtered-points',
        data: demographicPointData,
        getPosition: (d: DemographicPoint) => [d.lng, d.lat],
        getRadius: (d: DemographicPoint) => 10,
        getFillColor: (d: DemographicPoint) => {
          // 性別に応じた色分け
          if (d.sex === '男性') {
            return [74, 144, 226, 255];      // 青色（男性）
          } else if (d.sex === '女性') {
            return [233, 30, 99, 255];       // ピンク色（女性）
          } else {
            return [156, 39, 176, 255];      // 紫色（その他）
          }
        },
        getLineColor: [255, 255, 255, 255],  // 白い枠線
        getLineWidth: 2,
        stroked: true,
        filled: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 20,
        pickable: true
      });

      layerList.push(demographicLayer);
    }

    return layerList;
     }, [showHeatmapLayer, heatmapData, showDemographicLayer, demographicPointData, selectedDateTime]);

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
          // 人口統計フィルターポイントの場合
          if (info.object.sex || info.object.birthyear || info.object.job) {
                        const genderLabel = info.object.sex;
             const currentYear = new Date().getFullYear();
             const age = currentYear - info.object.birthyear;
             const ageLabel = `${age}歳 (${info.object.birthyear}年生まれ)`;
             const occupationLabel = info.object.job;

            return {
                              html: `
                  <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px; min-width: 200px;">
                    <div style="font-weight: bold; color: #ff69b4; margin-bottom: 4px;">🎯 個人データ</div>
                    <div><strong>ID:</strong> ${info.object.id}</div>
                    ${info.object.sex ? `<div><strong>性別:</strong> ${genderLabel}</div>` : ''}
                    ${info.object.birthyear ? `<div><strong>年齢:</strong> ${ageLabel}</div>` : ''}
                    ${info.object.job ? `<div><strong>職業:</strong> ${occupationLabel}</div>` : ''}
                    ${info.object.address ? `<div><strong>居住地:</strong> ${info.object.address}</div>` : ''}
                    ${info.object.householdincome ? `<div><strong>世帯年収:</strong> ${info.object.householdincome}</div>` : ''}
                    ${info.object.transportation ? `<div><strong>交通手段:</strong> ${info.object.transportation}</div>` : ''}
                    <div style="margin-top: 4px; font-size: 12px; color: #ccc;">
                      位置: ${info.object.lat?.toFixed(4)}, ${info.object.lng?.toFixed(4)}
                    </div>
                  </div>
                `,
              style: {
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white'
              }
            };
          }
          // H3ヒートマップの場合
          else if (info.object.h3_index) {
            return {
              html: `
                <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
                  <div style="font-weight: bold; color: #ff9800; margin-bottom: 4px;">📊 密度ヒートマップ</div>
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
          // 通常のヒートマップポイントの場合
          else {
            return {
              html: `
                <div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
                  <div style="font-weight: bold; color: #667eea; margin-bottom: 4px;">📍 データポイント</div>
                  <div><strong>人数:</strong> ${info.object.value || info.object.intensity || 0}人</div>
                  <div><strong>位置:</strong> ${info.object.lat?.toFixed(4)}, ${info.object.lng?.toFixed(4)}</div>
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

  // 日付範囲設定ハンドラー（デバウンス処理付き）
  const handleDateRangeSelect = useCallback((start: Date, end: Date) => {
    // 現在のタイマーをクリア
    if (dateRangeDebounceTimer.current) {
      clearTimeout(dateRangeDebounceTimer.current);
    }
    
    // 新しいタイマーを設定（500ms後に実行）
    dateRangeDebounceTimer.current = setTimeout(() => {
      setDateRange({ start, end });
    }, 500);
  }, []);



  // 再生ボタンが押された時の処理（タイムシリーズデータを取得）
  const fetchTimeseriesData = async () => {
    setIsTimeseriesLoading(true);
    
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
      } catch (error) {
        console.warn('Failed to get map bounds:', error);
      }
    }
    
    try {
      // タイムシリーズデータを取得（1分間隔）
      const timeseriesData = await getHeatmapTimeseriesData(
        dateRange.start,
        dateRange.end,
        currentZoom,
        1, // 1分間隔
        bounds || undefined
      );
      
      // タイムシリーズデータを設定
      setTimeseriesData(timeseriesData);
      setIsTimeseriesMode(timeseriesData.length > 0);
      setCurrentFrameIndex(0);
      
      setShowHeatmapLayer(true);
    } catch (error) {
      console.error('Error fetching timeseries data:', error);
      setHeatmapError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsTimeseriesLoading(false);
    }
  };

  return (
    <>
      <div className="app">
        {/* メインコンテンツ */}
        <div className="main-content">
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
            dateRange={dateRange}
            selectedTransportationMode={selectedTransportationMode}
            onTransportationModeChange={handleTransportationModeChange}
            onDemographicFiltersChange={handleDemographicFiltersChange}
            onApplyDemographicFilters={handleApplyDemographicFilters}
            isDemographicLoading={isDemographicLoading}
            demographicError={demographicError}
            setDemographicError={setDemographicError}
           />
          
          {/* マーケティングインサイト */}
          <MarketingInsights
            timeseriesData={timeseriesData}
            currentFrameIndex={currentFrameIndex}
            isPlaying={isPlaybackActive}
          />

          {/* タイムスライダー */}
          <TimeRangeSlider 
            onDateRangeSelect={handleDateRangeSelect}
            fetchTimeseriesData={fetchTimeseriesData}
            onTimeseriesDataUpdate={handleTimeseriesDataUpdate}
            onPlayStateChange={handlePlayStateChange}
            timeseriesData={timeseriesData}
            isLoading={isTimeseriesLoading}
          />

        </div>
      </div>
    </>
  )
}
export default App
