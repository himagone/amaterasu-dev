import { useEffect, useRef, useState } from 'react'
import './Map.css'

declare global {
  interface Window {
    geolonia: any;
  }
}

type Props = {
  currentDate: string;
  deckOverlay: any;
  onZoomChange?: (zoom: number) => void;
};

type MaplibreGL = {
  on: Function;
  getBounds: Function;
  addSource: Function;
  addLayer: Function;
  getSource: Function;
  addControl: Function;
  loaded: Function;
  getZoom: Function;
}

function Map(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MaplibreGL | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    map.current = new window.geolonia.Map({
      container: ref.current,
      center: [139.741357, 35.658099],
      zoom: 10,
      hash: true,
      style: "geolonia/gsi",
    });

    if (map.current) {
      map.current.on('load', () => {
        console.log('Map loaded');
        setMapLoaded(true);
        
        // 初期ズームレベルを親コンポーネントに通知
        if (props.onZoomChange) {
          const initialZoom = map.current?.getZoom();
          if (initialZoom !== undefined) {
            props.onZoomChange(initialZoom);
          }
        }
      });
      
      // ズームが変更されたときのイベントハンドラ
      map.current.on('zoom', () => {
        if (props.onZoomChange && map.current) {
          const zoom = map.current.getZoom();
          console.log('Zoom changed:', zoom);
          props.onZoomChange(zoom);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!map.current || !props.deckOverlay || !mapLoaded) {
      return;
    }
    
    console.log('Adding deck overlay to map');
    map.current.addControl(props.deckOverlay);
    
  }, [props.deckOverlay, mapLoaded]);

  return (
    <>
      <div ref={ref} className="map" data-marker="off"
        data-navigation-control="on" data-geolocate-control="on" data-gesture-handling="off"></div>
    </>
  )
}

export default Map
