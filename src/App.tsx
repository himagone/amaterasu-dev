import { useState, useEffect, useRef, useMemo } from 'react'
import Header from './Header.tsx'
import Map from './Map.tsx'
import './App.css'
import Weather from './Weather.tsx'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { LightingEffect, AmbientLight, DirectionalLight, FlyToInterpolator } from '@deck.gl/core'
import { MapboxOverlay } from '@deck.gl/mapbox';
import Papa from 'papaparse'
import DateTime from './DateTime'
import { easeCubic } from 'd3-ease';
import { ArcLayer } from '@deck.gl/layers';
import { cellToLatLng } from 'h3-js';

// CSV の各行の型
type LocationData = {
  time: string;         // UTC の ISO8601 形式のタイムスタンプ（例: "2025-03-03T01:38:00Z"）
  h3_index: string;     // H3 インデックス
  person_count: number; // 人数カウント
};

const now = new Date();
// パーソンカウントの定義（範囲ごとに色分け）
type PersonCountRange = {
  id: string;
  name: string;
  min: number;
  max: number;
  color: [number, number, number, number];
  enabled: boolean;
};
const defaultPersonCountRanges: PersonCountRange[] = [
  { id: 'very-low', name: '非常に少ない', min: 1, max: 5, color: [0, 128, 255, 200], enabled: true },
  { id: 'low', name: '少ない', min: 6, max: 20, color: [0, 255, 0, 200], enabled: true },
  { id: 'medium', name: '普通', min: 21, max: 50, color: [255, 255, 0, 200], enabled: true },
  { id: 'high', name: '多い', min: 51, max: 100, color: [255, 165, 0, 200], enabled: true },
  { id: 'very-high', name: '非常に多い', min: 101, max: 9999, color: [255, 0, 0, 200], enabled: true }
];
// ズームレベルに応じたCSVファイル
enum ZoomLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Detail = 'detail'
}

function getZoomLevelFile(zoom: number): string {
  if (zoom < 9) return `/output_test_${ZoomLevel.Low}.csv`;
  if (zoom < 12) return `/output_test_${ZoomLevel.Medium}.csv`;
  if (zoom < 15) return `/output_test_${ZoomLevel.High}.csv`;
  return `/output_test_${ZoomLevel.Detail}.csv`;
}

// WebGL照明エフェクトの設定
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 0.8
});

const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 1.5,
  direction: [-3, -3, -1]
});

const lightingEffect = new LightingEffect({ ambientLight, directionalLight });

const materialProps = {
  ambient: 0.5,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51] as [number, number, number]
};

function App() {
  const [layers, setLayers] = useState<any[]>([]);
  const [currentDate, setDateTime] = useState<string>(now.toString());
  const [data, setData] = useState<LocationData[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState(new Date('2025-03-03T01:00:00Z'));
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [currentCsvFile, setCurrentCsvFile] = useState<string>(getZoomLevelFile(10));
  const [availableTimes, setAvailableTimes] = useState<Set<string>>(new Set());
  const [personCountRanges, setPersonCountRanges] = useState<PersonCountRange[]>(defaultPersonCountRanges);
  const [viewState, setViewState] = useState({
    longitude: 139.741357,
    latitude: 35.658099,
    zoom: 10,
    pitch: 30,
    bearing: 0,
    transitionDuration: 1000,
    transitionInterpolator: new FlyToInterpolator(),
    transitionEasing: easeCubic
  });
  
  // DeckGLオーバーレイの作成
  const deckOverlayRef = useRef<any>(null);
  useEffect(() => {
    deckOverlayRef.current = new MapboxOverlay({
      layers,
      effects: [lightingEffect],
      interleaved: true
    });
  }, []);

  // ズームレベルに応じてCSVファイルを切り替え
  useEffect(() => {
    const newCsvFile = getZoomLevelFile(currentZoom);
    if (newCsvFile !== currentCsvFile) {
      setCurrentCsvFile(newCsvFile);
    }
  }, [currentZoom]);
  
  useEffect(() => {
    fetch(currentCsvFile)
      .then(response => response.text())
      .then(csv => {
        const results = Papa.parse<LocationData>(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        const times = new Set<string>();
        results.data.forEach(item => {
          if (item.time) {
            times.add(item.time);
          }
        });
        setAvailableTimes(times);
        setData(results.data);
      })
      .catch(err => console.error('CSV読み込みエラー:', err));
  }, [currentCsvFile]);

  // 現在時刻までのデータにフィルタリング - 蓄積ではなく正確な時間帯のみ表示
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const dataTime = new Date(d.time);
      return (
        dataTime.getFullYear() === currentDateTime.getFullYear() &&
        dataTime.getMonth() === currentDateTime.getMonth() &&
        dataTime.getDate() === currentDateTime.getDate() &&
        dataTime.getHours() === currentDateTime.getHours() &&
        dataTime.getMinutes() === currentDateTime.getMinutes()
      );
    });
  }, [data, currentDateTime]);

  // deck.gl の H3HexagonLayer を設定
  useEffect(() => {
    const newLayers = [
      new H3HexagonLayer({
        id: 'h3-hexagon-layer',
        data: filteredData,
        getHexagon: (d: LocationData) => d.h3_index,
        getFillColor: (d: LocationData) => {
          const range = personCountRanges.find(range => 
            d.person_count >= range.min && d.person_count <= range.max
          );
          return range ? range.color : [100, 100, 100, 200];
        },
        extruded: true,
        elevationScale: 1,
        material: {
          ...materialProps,
          ambient: 0.6,
          diffuse: 0.7,
          shininess: 40,
          specularColor: [60, 60, 60]
        },
        pickable: true,
        opacity: 0.85,
        coverage: 0.95,
        getElevation: (d: LocationData) => {
          // より自然な高さの変化を実現
          const baseHeight = d.person_count * 20;
          // 時間に基づく微細な変化を追加
          const timeBasedVariation = Math.sin(currentDateTime.getTime() / 5000) * 5;
          return baseHeight + timeBasedVariation;
        },
        transitions: {
          getElevation: {
            duration: 2000,
            easing: easeCubic
          },
          getFillColor: {
            duration: 1000,
            easing: easeCubic
          }
        },
        updateTriggers: {
          getFillColor: [currentDateTime, personCountRanges],
          getElevation: [currentDateTime]
        },
        autoHighlight: true,
        highlightColor: [255, 255, 255, 150],
        onHover: (info: any) => {
          if (info.object) {
            const personCount = info.object.person_count;
            const [lat, lng] = cellToLatLng(info.object.h3_index);
            console.log(`位置: ${lat.toFixed(6)}, ${lng.toFixed(6)}, 人数: ${personCount || '不明'}`);
          }
        }
      })
    ];
    setLayers(newLayers);
  }, [filteredData, personCountRanges, currentDateTime]);

  useEffect(() => {
    if (deckOverlayRef.current) {
      deckOverlayRef.current.setProps({
        layers,
        effects: [lightingEffect]
      });
    }
  }, [layers]);
  
  // ズームレベルが変更された時のハンドラー
  const handleZoomChange = (zoom: number) => {
    setCurrentZoom(zoom);
    // 視点を更新
    setViewState(prevState => ({
      ...prevState,
      zoom,
      transitionDuration: 500
    }));
  };
  
  // 時間が変更されたときの視覚効果
  useEffect(() => {
    // カメラの動きをより自然に
    setViewState(prevState => {
      const newPitch = prevState.pitch === 30 ? 35 : 30;
      const newBearing = (prevState.bearing + 2) % 360; // 回転速度を遅く
      return {
        ...prevState,
        pitch: newPitch,
        bearing: newBearing,
        transitionDuration: 2000 // アニメーション時間を長く
      };
    });
  }, [currentDateTime]);
  
  return (
    <>
      <div className="app">
        <Header />
        <Map 
          currentDate={currentDate} 
          deckOverlay={deckOverlayRef.current}
          onZoomChange={handleZoomChange}
        />
        <Weather currentDate={currentDate} />
        
        <div className="visualization-controls">
          <DateTime 
            currentDate={currentDateTime.toString()} 
            setDateTime={(dateStr: string) => setCurrentDateTime(new Date(dateStr))} 
            availableTimes={availableTimes}
          />
        </div>
      </div>
    </>
  )
}
export default App
