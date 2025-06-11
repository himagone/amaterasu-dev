import { useEffect, useRef, useState } from 'react'
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

// パーティクルシステムクラス（MapLibre GLネイティブ版）
class NativeParticleSystem {
  private map: MapLibreMap;
  private isActive: boolean = false;
  private selectedDateTime: Date;
  private particleData: any = null;
  private onDataUpdate?: (status: {isUsingRealData: boolean, dataPoints: number}) => void;
  private timeWindowMinutes: number = 30; // デフォルト30分

  constructor(map: MapLibreMap, selectedDateTime: Date, onDataUpdate?: (status: {isUsingRealData: boolean, dataPoints: number}) => void) {
    this.map = map;
    this.selectedDateTime = selectedDateTime;
    this.onDataUpdate = onDataUpdate;
  }

  // 時間窓を設定
  public setTimeWindowMinutes(minutes: number) {
    this.timeWindowMinutes = minutes;
  }

  // ズームレベルからh3Levelを計算（最大12）
  private getH3LevelFromZoom(zoom: number): number {
    // ズームレベルをh3レベルにマッピング（最大12）
    const h3Level = Math.min(12, Math.max(0, Math.round(zoom - 2)));
    return h3Level;
  }

  // 地図の境界を取得
  private getMapBounds() {
    const bounds = this.map.getBounds();
    return {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast()
    };
  }

  // データ状態を通知
  private notifyDataUpdate() {
    if (this.onDataUpdate) {
      this.onDataUpdate({
        isUsingRealData: this.particleData !== null,
        dataPoints: this.particleData?.vectors?.length || 0
      });
    }
  }

  // パーティクルデータを取得
  private async fetchParticleData() {
    try {
      // 既存のデータを即座にクリア
      this.particleData = null;
      this.notifyDataUpdate();
      
      const timestamp = this.selectedDateTime.toISOString().slice(0, 19);
      const zoom = this.map.getZoom();
      const h3Level = this.getH3LevelFromZoom(zoom);
      const bounds = this.getMapBounds();
      
      const params = new URLSearchParams({
        timestamp,
        timeWindowMinutes: this.timeWindowMinutes.toString(),
        h3Level: h3Level.toString(),
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLng: bounds.minLng.toString(),
        maxLng: bounds.maxLng.toString()
      });
      
      const apiUrl = `http://localhost:8080/api/v1/flow-vectors/tile.json?${params.toString()}`;
      
      console.log('Fetching particle data from:', apiUrl);
      console.log('Using selected timestamp for particles:', timestamp);
      console.log('Using h3Level:', h3Level, 'from zoom:', zoom);
      console.log('Using bounds:', bounds);
      
      // APIサーバーの接続確認
      console.log('Checking API server connection...');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // CORSエラー対策
        mode: 'cors',
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Particle data received:', data);
      
      this.particleData = data;
      this.notifyDataUpdate(); // データ状態を通知
      return data;
      
    } catch (error) {
      console.error('Detailed fetch error:', error);
      
      if (error instanceof Error) {
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
      } else {
        console.error('Unknown error type:', typeof error);
      }
      this.particleData = null;
      this.notifyDataUpdate(); // エラー状態も通知
      return null;
    }
  }

  // ネイティブパーティクルレイヤーを追加
  public async addParticleLayer() {
    if (this.isActive) return;

    try {
      // 既存のレイヤーとソースを完全にクリア
      this.removeParticleLayer();
      console.log('Step 0: Cleared existing particle layers and data');
      
      // TileJSONのURLを構築（パラメータ付き）
      const timestamp = this.selectedDateTime.toISOString().slice(0, 19);
      const zoom = this.map.getZoom();
      const h3Level = this.getH3LevelFromZoom(zoom);
      const bounds = this.getMapBounds();
      
      const params = new URLSearchParams({
        timestamp,
        timeWindowMinutes: this.timeWindowMinutes.toString(),
        h3Level: h3Level.toString(),
        minLat: bounds.minLat.toString(),
        maxLat: bounds.maxLat.toString(),
        minLng: bounds.minLng.toString(),
        maxLng: bounds.maxLng.toString()
      });
      
      const tileJsonUrl = `http://localhost:8080/api/v1/flow-vectors/tile.json?${params.toString()}`;
      
      console.log('Step 1: TileJSON URL:', tileJsonUrl);
      console.log('Using h3Level:', h3Level, 'from zoom:', zoom);
      console.log('Using bounds:', bounds);

      // raster-particleを試す
      try {
        console.log('Step 2: Adding raster-particle layer...');
        
        // 標準的な方法でソースを追加
        (this.map as any).addSource('human-flow', {
          'type': 'raster-array',
          'url': tileJsonUrl,
          'tileSize': 256
        });
        console.log('Raster-array source added successfully');
        
        // レイヤーを追加
        (this.map as any).addLayer({
          'id': 'particles',
          'type': 'raster-particle',
          'source': 'human-flow',
          'source-layer': 'flow-vectors',
          'paint': {
            'raster-particle-speed-factor': 0.4,
            'raster-particle-fade-opacity-factor': 0.85,
            'raster-particle-reset-rate-factor': 0.15,
            'raster-particle-count': 4000,
            'raster-particle-max-speed': 30,
            'raster-particle-color': [
              'interpolate',
              ['linear'],
              ['raster-particle-speed'],
              0, 'rgba(30,144,255,180)',
              2, 'rgba(0,255,127,200)',
              5, 'rgba(255,255,0,220)',
              10, 'rgba(255,165,0,240)',
              20, 'rgba(255,69,0,255)'
            ]
          }
        });
        console.log('Raster-particle layer added successfully');
        
      } catch (particleError) {
        console.warn('Raster-particle not supported, falling back to raster layer:', particleError);
        
        // ソースを削除して再追加
        if (this.map.getSource('human-flow')) {
          this.map.removeSource('human-flow');
        }
        
        // 代替案: 通常のrasterレイヤーとして表示
        console.log('Step 2b: Trying fallback raster layer...');
        
        this.map.addSource('human-flow', {
          'type': 'raster',
          'url': tileJsonUrl,
          'tileSize': 256
        });
        console.log('Fallback raster source added successfully');
        
        this.map.addLayer({
          'id': 'particles',
          'type': 'raster',
          'source': 'human-flow',
          'paint': {
            'raster-opacity': 0.8
          }
        });
        console.log('Fallback raster layer added successfully');
      }

      this.isActive = true;
      console.log('Human flow layer added successfully');
      
      // データの取得状況を通知（簡略化）
      this.particleData = { status: 'loaded' }; // 簡易的なデータ状態
      this.notifyDataUpdate();
      
    } catch (error) {
      console.error('Failed to add human flow layer:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // MapLibre GLのバージョン情報をログ出力
      console.log('MapLibre GL version:', (this.map as any).version);
      
      // 現在のスタイル情報をログ出力
      const style = this.map.getStyle();
      console.log('Current map style layers:', style?.layers?.map(l => ({ id: l.id, type: l.type })));
      
      this.particleData = null;
      this.notifyDataUpdate();
      throw error; // エラーを再throw
    }
  }

  // パーティクルレイヤーを削除
  public removeParticleLayer() {
    if (!this.isActive) return;

    try {
      if (this.map.getLayer('particles')) {
        this.map.removeLayer('particles');
      }
      if (this.map.getSource('human-flow')) {
        this.map.removeSource('human-flow');
      }
      this.isActive = false;
      console.log('Native MapLibre GL particle layer removed');
    } catch (error) {
      console.warn('Error removing particle layer:', error);
    }
  }

  // データを更新（地図移動時などに呼ばれる）
  public async refreshData() {
    if (this.isActive) {
      // データを再取得してレイヤーを更新
      await this.fetchParticleData();
      console.log('Particle data refreshed');
    }
  }

  // タイムスタンプを更新
  public async updateTimestamp(selectedDateTime: Date) {
    this.selectedDateTime = selectedDateTime;
    if (this.isActive) {
      // レイヤーを再作成してタイムスタンプを更新
      this.removeParticleLayer();
      await this.addParticleLayer();
    }
  }

  // データの状態を取得
  public getDataStatus() {
    return {
      isUsingRealData: this.particleData !== null,
      isActive: this.isActive,
      layerType: 'native-maplibre-gl',
      dataPoints: this.particleData?.vectors?.length || 0
    };
  }

  // パーティクルシステムを破棄
  public destroy() {
    this.removeParticleLayer();
    this.particleData = null;
  }
}

function Map(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const particleSystem = useRef<NativeParticleSystem | null>(null);
  // We only need setHeatmapData since we're passing the data to parent component
  const [, setHeatmapData] = useState<HeatmapPoint[]>([]);

  // ヒートマップデータを取得
  const fetchHeatmapData = async () => {
    try {
      if (!map.current) return;
      
      // 既存のヒートマップデータを即座にクリア
      setHeatmapData([]);
      if (props.onHeatmapDataUpdate) {
        props.onHeatmapDataUpdate([]);
      }
      console.log('Cleared existing heatmap data before fetching new data');
      
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
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap data: ${response.status}`);
      }
      
      const data: HeatmapResponse = await response.json();
      console.log('Heatmap data received:', data);
      
      // 新しいデータを設定
      setHeatmapData(data.points);
      if (props.onHeatmapDataUpdate) {
        props.onHeatmapDataUpdate(data.points);
      }
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
      // エラー時も確実にデータをクリア
      setHeatmapData([]);
      if (props.onHeatmapDataUpdate) {
        props.onHeatmapDataUpdate([]);
      }
    }
  };

  const addHumanFlowParticles = async () => {
    if (!map.current) return;

    try {
      // 既存のパーティクルシステムを完全に削除
      if (particleSystem.current) {
        particleSystem.current.destroy();
        particleSystem.current = null;
        console.log('Destroyed existing particle system');
      }
      
      // ネイティブパーティクルレイヤーを開始
      particleSystem.current = new NativeParticleSystem(map.current, props.selectedDateTime, props.onParticleDataUpdate);
      if (props.timeWindowMinutes) {
        particleSystem.current.setTimeWindowMinutes(props.timeWindowMinutes);
      }
      await particleSystem.current.addParticleLayer();
      console.log('Human flow particles (Native MapLibre GL) added successfully');
    } catch (error) {
      console.error('Error adding human flow particles:', error);
    }
  };

  const removeHumanFlowParticles = () => {
    try {
      if (particleSystem.current) {
        particleSystem.current.destroy();
        particleSystem.current = null;
        console.log('Human flow particles removed and data cleared');
      }
    } catch (error) {
      console.warn('Error removing human flow particles:', error);
    }
  };

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

        // 人流パーティクルレイヤーを初期表示する場合
        if (props.showHumanFlowParticles) {
          addHumanFlowParticles();
        }

        // ヒートマップデータを初期取得
        if (props.showHeatmapLayer) {
          fetchHeatmapData();
        }
      });
      
      // ズームが変更されたときのイベントハンドラ
      map.current.on('zoom', () => {
        if (props.onZoomChange && map.current) {
          const zoom = map.current.getZoom();
          props.onZoomChange(zoom);
        }
      });

      // 地図の移動が終了したときにデータを再取得
      map.current.on('moveend', async () => {
        if (particleSystem.current && props.showHumanFlowParticles) {
          await particleSystem.current.refreshData();
        }
        if (props.showHeatmapLayer) {
          fetchHeatmapData();
        }
      });
    }

    return () => {
      if (particleSystem.current) {
        particleSystem.current.destroy();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // 人流パーティクルの表示/非表示を切り替え
  useEffect(() => {
    if (!mapLoaded) return;

    const handleParticleToggle = async () => {
      if (props.showHumanFlowParticles) {
        // ヒートマップデータをクリア（排他制御）
        setHeatmapData([]);
        if (props.onHeatmapDataUpdate) {
          props.onHeatmapDataUpdate([]);
        }
        console.log('Switching to particle layer - clearing heatmap data');
        
        await addHumanFlowParticles();
      } else {
        removeHumanFlowParticles();
      }
    };

    handleParticleToggle();
  }, [props.showHumanFlowParticles, mapLoaded]);

  // ヒートマップの表示/非表示を切り替え
  useEffect(() => {
    if (!mapLoaded) return;

    if (props.showHeatmapLayer) {
      // パーティクルレイヤーをクリア（排他制御）
      removeHumanFlowParticles();
      console.log('Switching to heatmap layer - clearing particle layer');
      
      fetchHeatmapData();
    } else {
      setHeatmapData([]);
      if (props.onHeatmapDataUpdate) {
        props.onHeatmapDataUpdate([]);
      }
    }
  }, [props.showHeatmapLayer, mapLoaded]);

  // selectedDateTimeが変更されたときにデータを再取得
  useEffect(() => {
    if (!mapLoaded) return;

    const handleDataRefresh = async () => {
      // 現在アクティブなレイヤーのみ更新
      if (props.showHeatmapLayer) {
        console.log('Refreshing heatmap data for timestamp:', props.selectedDateTime);
        fetchHeatmapData();
      }

      // パーティクルデータのタイムスタンプを更新
      if (particleSystem.current && props.showHumanFlowParticles) {
        console.log('Refreshing particle data for timestamp:', props.selectedDateTime);
        await particleSystem.current.updateTimestamp(props.selectedDateTime);
      }
    };

    handleDataRefresh();
  }, [props.selectedDateTime, mapLoaded]);

  // 時間窓の変更時にデータを更新
  useEffect(() => {
    if (!mapLoaded) return;
    
    const handleTimeWindowChange = async () => {
      // 現在アクティブなレイヤーのみ更新
      if (props.showHumanFlowParticles && particleSystem.current) {
        console.log('Updating particle time window:', props.timeWindowMinutes);
        particleSystem.current.setTimeWindowMinutes(props.timeWindowMinutes || 30);
        await particleSystem.current.refreshData();
      }
      
      if (props.showHeatmapLayer) {
        console.log('Updating heatmap time window:', props.timeWindowMinutes);
        fetchHeatmapData();
      }
    };

    handleTimeWindowChange();
  }, [props.timeWindowMinutes, mapLoaded]);

  useEffect(() => {
    if (!map.current || !props.deckOverlay || !mapLoaded) {
      return;
    }
    
    map.current.addControl(props.deckOverlay);
    
  }, [props.deckOverlay, mapLoaded]);

  // パーティクルシステムを作成
  const createParticleSystem = () => {
    if (!map.current) return;
    
    if (particleSystem.current) {
      particleSystem.current.destroy();
    }
    particleSystem.current = new NativeParticleSystem(
      map.current,
      props.selectedDateTime,
      props.onParticleDataUpdate
    );
    
    // timeWindowMinutesを設定
    if (props.timeWindowMinutes) {
      particleSystem.current.setTimeWindowMinutes(props.timeWindowMinutes);
    }
  };

  return (
    <>
      <div ref={ref} className="map"></div>
    </>
  )
}

export default Map
