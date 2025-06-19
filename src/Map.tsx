import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './Map.css'

type Props = {
  currentDate: string;
  selectedDateTime: Date;
  deckOverlay: maplibregl.IControl | null;
  onZoomChange?: (zoom: number) => void;
  showHeatmapLayer?: boolean;
  mapInstance?: any;
  setMapInstance?: (map: any) => void;
};

interface HeatmapPoint {
  h3Index: string;
  lat: number;
  lng: number;
  intensity: number;
  value: number;
}

function Map(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Deck.glオーバーレイ管理：古いオーバーレイを削除してから新しいものを追加
  const currentOverlayRef = useRef<maplibregl.IControl | null>(null);
  
  useEffect(() => {
    if (!map.current || !mapLoaded) {
      return;
    }
    
    // 古いオーバーレイを削除
    if (currentOverlayRef.current) {
      try {
        map.current.removeControl(currentOverlayRef.current);
        console.log('Removed old deck.gl overlay');
      } catch (error) {
        console.warn('Failed to remove old overlay:', error);
      }
      currentOverlayRef.current = null;
    }
    
    // 新しいオーバーレイを追加
    if (props.deckOverlay) {
      try {
        map.current.addControl(props.deckOverlay);
        currentOverlayRef.current = props.deckOverlay;
        console.log('Added new deck.gl overlay');
      } catch (error) {
        console.error('Failed to add deck.gl overlay:', error);
      }
    }
    
  }, [props.deckOverlay, mapLoaded]);

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
        
        if (props.setMapInstance && map.current) {
          props.setMapInstance(map.current);
        }
        
        if (props.onZoomChange) {
          const initialZoom = map.current?.getZoom();
          if (initialZoom !== undefined) {
            props.onZoomChange(initialZoom);
          }
        }
      });
      
      map.current.on('zoom', () => {
        if (props.onZoomChange && map.current) {
          const zoom = map.current.getZoom();
          props.onZoomChange(zoom);
        }
      });
    }

    return () => {
      // クリーンアップ
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return (
    <>
      <div ref={ref} className="map">
      </div>
    </>
  )
}

export default Map
