import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './Map.css'

type Props = {
  currentDate: string;
  selectedDateTime: Date;
  deckOverlay: maplibregl.IControl | null;
  onZoomChange?: (zoom: number) => void;
  showHumanFlowParticles?: boolean;
  showHeatmapLayer?: boolean;
  onHeatmapDataUpdate?: (data: HeatmapPoint[]) => void;
  onParticleDataUpdate?: (status: {isUsingRealData: boolean, dataPoints: number}) => void;
  mapInstance?: any;
  setMapInstance?: (map: any) => void;
  timeWindowMinutes?: number;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onErrorStateChange?: (error: string | null) => void;
};

// 人流データの型定義
interface FlowVectorData {
  x: number;
  y: number;
  u: number; // x方向の速度成分
  v: number; // y方向の速度成分
  speed: number; // 速度の大きさ
  lat: number; // 緯度
  lng: number; // 経度
}

interface FlowDataResponse {
  vectors: FlowVectorData[];
  timestamp: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// ヒートマップデータの型定義
interface HeatmapPoint {
  h3Index: string;
  lat: number;
  lng: number;
  intensity: number;
  value: number;
}

interface HeatmapResponse {
  timestamp: string;
  resolution: string;
  points: HeatmapPoint[];
}

function Map(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ヒートマップデータを取得（完全手動制御版）
  const fetchHeatmapData = useCallback(async () => {
    // ヒートマップが非表示または地図が未ロードの場合は早期リターン
    if (!props.showHeatmapLayer || !map.current || !mapLoaded) return;

    try {
      // 既存のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 新しいAbortControllerを作成
      abortControllerRef.current = new AbortController();
      
      // ローディング状態を開始（データは保持）
      setIsLoading(true);
      setError(null);
      if (props.onLoadingStateChange) {
        props.onLoadingStateChange(true);
      }
      if (props.onErrorStateChange) {
        props.onErrorStateChange(null);
      }
      
      const isoString = props.selectedDateTime.toISOString();
      const timestamp = isoString.slice(0, 19);
      const timeWindowMinutes = props.timeWindowMinutes || 30;
      const zoom = map.current.getZoom();
      
      // ズームレベルからh3Levelを計算（最大12）
      const h3Level = Math.min(12, Math.max(0, Math.round(zoom - 2)));
      
      // 地図の境界を取得
      const bounds = map.current.getBounds();
      const mapBounds = {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast()
      };
      
      const params = new URLSearchParams({
        timestamp,
        timeWindowMinutes: timeWindowMinutes.toString(),
        h3Level: h3Level.toString(),
        minLat: mapBounds.minLat.toString(),
        maxLat: mapBounds.maxLat.toString(),
        minLng: mapBounds.minLng.toString(),
        maxLng: mapBounds.maxLng.toString()
      });
      
      const apiUrl = `http://localhost:8080/api/v1/heatmap?${params.toString()}`;
      
      console.log('Fetching heatmap data from:', apiUrl);
      console.log('Using h3Level:', h3Level, 'from zoom:', zoom);
      console.log('Using bounds:', mapBounds);
      
      const response = await fetch(apiUrl, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`データの取得に失敗しました (${response.status})`);
      }
      
      const data: HeatmapResponse = await response.json();
      console.log('Heatmap data received:', data);
      
      // 成功時のみデータを更新
      setHeatmapData(data.points);
      if (props.onHeatmapDataUpdate) {
        props.onHeatmapDataUpdate(data.points);
      }
      
    } catch (error: any) {
      // リクエストがキャンセルされた場合は無視
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      
      console.error('Error fetching heatmap data:', error);
      const errorMessage = error.message || 'データの取得中にエラーが発生しました';
      setError(errorMessage);
      if (props.onErrorStateChange) {
        props.onErrorStateChange(errorMessage);
      }
      
      // エラー時はデータをクリアしない（前のデータを保持）
      
    } finally {
      setIsLoading(false);
      if (props.onLoadingStateChange) {
        props.onLoadingStateChange(false);
      }
    }
  }, [mapLoaded]); // 依存配列から自動実行要因を削除

  // データクリア関数
  const clearHeatmapData = useCallback(() => {
    setHeatmapData([]);
    setError(null);
    if (props.onHeatmapDataUpdate) {
      props.onHeatmapDataUpdate([]);
    }
    if (props.onErrorStateChange) {
      props.onErrorStateChange(null);
    }
  }, [props.onHeatmapDataUpdate, props.onErrorStateChange]);

  // 手動fetchを外部に公開するための関数（完全手動制御）
  const manualFetch = useCallback(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // 外部から呼び出し可能な手動fetch関数をwindowオブジェクトに設定（デバッグ用）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).manualFetchHeatmap = manualFetch;
    }
  }, [manualFetch]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // 直接MapLibre GLを使用（Geoloniaの代わり）
    map.current = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm'
          }
        ]
      },
      center: [139.741357, 35.658099],
      zoom: 10,
      hash: true
    });

    if (map.current) {
      // ナビゲーションコントロールを追加
      map.current.addControl(new maplibregl.NavigationControl());
      
      // ジオロケーションコントロールを追加
      map.current.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      }));

      map.current.on('load', () => {
        console.log('Map loaded');
        setMapLoaded(true);
        
        // mapオブジェクトを親コンポーネントに渡す
        if (props.setMapInstance && map.current) {
          props.setMapInstance(map.current);
        }
        
        // 初期ズームレベルを親コンポーネントに通知
        if (props.onZoomChange) {
          const initialZoom = map.current?.getZoom();
          if (initialZoom !== undefined) {
            props.onZoomChange(initialZoom);
          }
        }

        // 初期データ取得は完全に削除（手動制御のみ）
      });
      
      // ズームが変更されたときのイベントハンドラ（fetchは完全に削除）
      map.current.on('zoom', () => {
        if (props.onZoomChange && map.current) {
          const zoom = map.current.getZoom();
          props.onZoomChange(zoom);
        }
        // fetchは完全に削除
      });

      // 地図の移動とズームイベントでの自動fetchを完全に削除
      // moveend、zoomend イベントリスナーも削除
    }

    return () => {
      // クリーンアップ
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // ヒートマップの表示/非表示切り替え時の自動fetchを削除
  useEffect(() => {
    if (!mapLoaded) return;

    if (props.showHeatmapLayer) {
      // 自動fetchを削除 - 表示切り替え時は何もしない
      console.log('Heatmap layer enabled - waiting for manual fetch');
    } else {
      // ヒートマップを無効にする際はデータをクリア
      clearHeatmapData();
      // 進行中のfetchをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [props.showHeatmapLayer, mapLoaded, clearHeatmapData]);

  useEffect(() => {
    if (!map.current || !props.deckOverlay || !mapLoaded) {
      return;
    }
    
    map.current.addControl(props.deckOverlay);
    
  }, [props.deckOverlay, mapLoaded]);

  return (
    <>
      <div ref={ref} className="map">
        {/* ローディングインジケーター */}
        {isLoading && (
          <div className="map-loading-overlay">
            <div className="loading-spinner"></div>
            <span>データを読み込み中...</span>
          </div>
        )}
        
        {/* エラー表示 */}
        {error && !isLoading && (
          <div className="map-error-overlay">
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button 
                className="retry-button"
                onClick={() => manualFetch()}
              >
                再試行
              </button>
            </div>
          </div>
        )}
        
        {/* 手動fetchボタン（デバッグ用） */}
        {props.showHeatmapLayer && (
          <div style={{
            position: 'absolute',
            top: '70px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000
          }}>
            <button
              onClick={() => manualFetch()}
              style={{
                background: '#1a73e8',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 ヒートマップ更新
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default Map
