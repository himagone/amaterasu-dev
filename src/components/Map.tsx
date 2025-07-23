import { useEffect, useRef, useState } from 'react'
import './Map.css'

declare global {
  interface Window {
    geolonia: any;
  }
}

type Props = {
  currentDate: string;
  selectedDateTime?: Date;
  deckOverlay: any;
  onZoomChange?: (zoom: number) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  showHeatmapLayer?: boolean;
  mapInstance?: any;
  setMapInstance?: (instance: any) => void;
};

type MaplibreGL = {
  on: Function;
  getBounds: Function;
  addSource: Function;
  addLayer: Function;
  getSource: Function;
  addControl: Function;
  removeControl: Function;
  loaded: Function;
  getZoom: Function;
}

function Map(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MaplibreGL | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const deckOverlayRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    map.current = new window.geolonia.Map({
      container: ref.current,
      center: [134.04996, 34.33186],
      zoom: 12,
      hash: true,
      style: "geolonia/gsi",
    });

    if (map.current) {
      map.current.on('load', () => {
        setMapLoaded(true);
        
        // マップインスタンスを親コンポーネントに通知
        if (props.setMapInstance) {
          props.setMapInstance(map.current);
        }
        
        // 初期ズームレベルを親コンポーネントに通知
        if (props.onZoomChange) {
          const initialZoom = map.current?.getZoom();
          if (initialZoom !== undefined) {
            props.onZoomChange(initialZoom);
          }
        }
      });

      // ズームレベルが変更された際のイベントリスナーを追加
      map.current.on('zoomend', () => {
        if (props.onZoomChange && map.current) {
          const currentZoom = map.current.getZoom();
          if (currentZoom !== undefined) {
            props.onZoomChange(currentZoom);
          }
        }
      });

      // 地図の移動が終了した際のイベントリスナーを追加
      map.current.on('moveend', () => {
        if (props.onBoundsChange && map.current) {
          try {
            const bounds = map.current.getBounds();
            props.onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest()
            });
          } catch (error) {
            console.warn('Failed to get map bounds:', error);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!map.current || !mapLoaded) {
      return;
    }
    
    // 古いoverlayを削除
    if (deckOverlayRef.current) {
      try {
        map.current.removeControl(deckOverlayRef.current);
        deckOverlayRef.current = null;
      } catch (error) {
        console.warn('Failed to remove old overlay:', error);
      }
    }
    
    // 新しいoverlayを追加
    if (props.deckOverlay) {
      try {
        map.current.addControl(props.deckOverlay);
        deckOverlayRef.current = props.deckOverlay;
      } catch (error) {
        console.error('Failed to add deck overlay:', error);
      }
    }
    
  }, [props.deckOverlay, mapLoaded]);

  return (
    <>
      <div ref={ref} className="map" data-marker="off"
        data-navigation-control="on" data-geolocate-control="on" data-gesture-handling="off"></div>
    </>
  )
}

export default Map