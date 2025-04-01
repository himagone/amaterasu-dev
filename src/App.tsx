import { useState, useEffect, useRef } from 'react'
import Header from './Header.tsx'
import Map from './Map.tsx'
import './App.css'
import Weather from './Weather.tsx'
import DeckGL from '@deck.gl/react'
import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { LightingEffect, AmbientLight, DirectionalLight, FlyToInterpolator } from '@deck.gl/core'
import { MapboxOverlay } from '@deck.gl/mapbox';
import Papa from 'papaparse'
import DateTime from './DateTime'
import { easeCubic } from 'd3-ease';

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
  if (zoom < 9) return `/kepler_output_test_${ZoomLevel.Low}.csv`;
  if (zoom < 12) return `/kepler_output_test_${ZoomLevel.Medium}.csv`;
  if (zoom < 15) return `/kepler_output_test_${ZoomLevel.High}.csv`;
  return `/kepler_output_test_${ZoomLevel.Detail}.csv`;
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
  const filteredData = data.filter(d => {
    // 時間フィルタリング
    const dataTime = new Date(d.time);
    const timeMatch = (
      dataTime.getFullYear() === currentDateTime.getFullYear() &&
      dataTime.getMonth() === currentDateTime.getMonth() &&
      dataTime.getDate() === currentDateTime.getDate() &&
      dataTime.getHours() === currentDateTime.getHours() &&
      dataTime.getMinutes() === currentDateTime.getMinutes()
    );
    
    // すべての人数範囲を有効にする（パネルを削除したため）
    return timeMatch;
  });
  
  // deck.gl の H3HexagonLayer を設定
  useEffect(() => {
    const newLayers = [
      new H3HexagonLayer({
        id: 'h3-hexagon-layer',
        data: filteredData,
        getHexagon: (d: LocationData) => d.h3_index,
        getFillColor: (d: LocationData) => {
          // パーソンカウント範囲に基づいて色を設定
          const range = personCountRanges.find(range => 
            d.person_count >= range.min && d.person_count <= range.max
          );
          return range ? range.color : [100, 100, 100, 200]; // デフォルト色
        },
        extruded: true,
        elevationScale: 15,
        material: materialProps,
        pickable: true,
        opacity: 0.8,
        coverage: 0.9,
        getElevation: (d: LocationData) => d.person_count * 15,
        transitions: {
          getElevation: {
            duration: 1000,
            easing: easeCubic
          },
          getFillColor: {
            duration: 800,
            easing: easeCubic
          }
        },
        updateTriggers: {
          getFillColor: [currentDateTime, personCountRanges],
          getElevation: [currentDateTime]
        },
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
        // カーソルが乗った時の情報表示
        onHover: (info: any) => {
          if (info.object) {
            const personCount = info.object.person_count;
            console.log(`人数: ${personCount || '不明'}`);
          }
        }
      })
    ];
    setLayers(newLayers);
  }, [filteredData, personCountRanges]);


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
    // カメラアングルを少し変更して動きを出す
    setViewState(prevState => {
      const newPitch = prevState.pitch === 30 ? 35 : 30;
      const newBearing = (prevState.bearing + 5) % 360;
      // 変更がある場合のみ更新
      if (newPitch !== prevState.pitch || newBearing !== prevState.bearing) {
        return {
          ...prevState,
          pitch: newPitch,
          bearing: newBearing,
          transitionDuration: 1500
        };
      }
      return prevState;
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
