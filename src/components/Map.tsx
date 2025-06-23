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
      center: [134.04996, 34.33186],
      zoom: 12,
      hash: true,
      style: "geolonia/gsi",
    });

    if (map.current) {
      map.current.on('load', () => {
        console.log('Map loaded');
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