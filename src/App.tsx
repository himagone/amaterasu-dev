import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Header from './components/Header.tsx'
import Map from './components/Map.tsx'
import './App.css'
import Weather from './components/Weather.tsx'
import { MapboxOverlay } from '@deck.gl/mapbox';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { ScatterplotLayer } from '@deck.gl/layers';
import TimeRangeSlider from './components/TimeRangeSlider'
import MarketingInsights from './components/MarketingInsights'
import ParticipantSummaryComponent from './components/ParticipantSummary'
import { getHeatmapTimeseriesData, getHeatmapEventParticipant } from './utils/getHeatmap'
import { heatmapPoints, eventParticipanth3Cells, ParticipantSummary } from './types/heatmap'
import getDemographicData from './utils/getDemographicData'
import { DemographicFilters, DemographicPoint } from './types/demographicData'
import { TryRounded } from '@mui/icons-material'

function App() {
  // デフォルトの時間範囲を設定（過去24時間のデータ）
  const defaultEndDate = new Date('2025-02-23T18:00:00');
  const defaultStartDate = new Date('2025-02-23T14:00:00');
  const [dateRange, setDateRange] = useState<{start: Date, end: Date}>({
    start: defaultStartDate,
    end: defaultEndDate
  });

  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // 新しい状態変数を追加
  const [timeseriesData, setTimeseriesData] = useState<{timestamp: string, points: heatmapPoints[]}[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isTimeseriesMode, setIsTimeseriesMode] = useState<boolean>(false);
  const [isTimeseriesLoading, setIsTimeseriesLoading] = useState<boolean>(false);

  const [eventParticipantData, setEventParticipantData] = useState<eventParticipanth3Cells[]>([]);
  const [participantSummary, setParticipantSummary] = useState<ParticipantSummary | null>(null);


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

  // タイムシリーズデータの更新処理
  const handleTimeseriesDataUpdate = (data: {timestamp: string, points: heatmapPoints[]}[]) => {
    setTimeseriesData(data);
    setIsTimeseriesMode(data.length > 0);
    setCurrentFrameIndex(0);
  };

  // 再生状態の変更処理
  const handlePlayStateChange = (isPlaying: boolean, frameIndex: number) => {
    // setIsPlaybackActive(isPlaying); // この行を削除
    setCurrentFrameIndex(frameIndex);
    
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

    // イベント参加者ヒートマップレイヤー
    if (eventParticipantData.length > 0) {
      const maxCount = Math.max(...eventParticipantData.map(cell => cell.count));
      const eventLayer = new H3HexagonLayer({
        id: 'event-participant-heatmap',
        data: eventParticipantData,
        getHexagon: (d: eventParticipanth3Cells) => d.h3Index,
        getFillColor: (d: eventParticipanth3Cells) => {
          const value = d.count || 0;
          const intensity = (value / maxCount) * 255; // 最大値に基づく強度計算
          return [255, 0, 0, intensity]; // 赤色で強度を表現
        },
        getLineColor: [255, 255, 255, 200], // 白い枠線
        getLineWidth: 1,
        stroked: true,
        filled: true,
        extruded: false,
        opacity: 0.6,
        pickable: true
      });
      layerList.push(eventLayer);
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
  }, [eventParticipantData, showDemographicLayer, demographicPointData]);

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
                  <div><strong>人数:</strong> ${info.object.person_count || info.object.count}</div>
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

  // 穴吹アリーナにイベント期間中滞在した人のヒートマップデータを取得
  const fetchEventParticipantData = async (start: Date, end: Date) => {
    setIsTimeseriesLoading(true);
    try {
      const { participantSummary, cells } = await getHeatmapEventParticipant(
        start,
        end,
        currentZoom, // ズームレベル
        200, // 半径200m
        30 // 滞在時間30分
      );
      setParticipantSummary(participantSummary);
      setEventParticipantData(cells);
    } catch (error) {
      console.error('Error fetching event participant data:', error);
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
          <div className="content-wrapper">
            <div className="map-section">
              <Map 
                currentDate={currentDate} 
                selectedDateTime={selectedDateTime}
                deckOverlay={deckOverlay}
                onZoomChange={handleZoomChange}
                mapInstance={mapInstance}
                setMapInstance={handleSetMapInstance}
              />
              <Weather currentDate={currentDate} />
            </div>
            
            {/* 参加者サマリー - サイドパネル */}
            {participantSummary && (
              <div className="participant-summary-panel">
                <ParticipantSummaryComponent data={participantSummary} />
              </div>
            )}
          </div>
          {/* マーケティングインサイト */}
          <MarketingInsights
            timeseriesData={timeseriesData}
            currentFrameIndex={currentFrameIndex}
            isPlaying={false} // 再生ボタンを削除
          />

          {/* タイムスライダー */}
          <TimeRangeSlider 
            onDateRangeSelect={handleDateRangeSelect}
            fetchEventParticipantData={fetchEventParticipantData}
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
