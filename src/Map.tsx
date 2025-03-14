import { useEffect, useRef } from 'react'
import './Map.css'

import { generateRandomPoints } from './Gdata';

declare global {
  interface Window {
    geolonia: any;
  }
}

type Props = {
  currentDate: string;
};

type MaplibreGL = {
  on: Function;
  getBounds: Function;
  addSource: Function;
  addLayer: Function;
  getSource: Function;
}

function Map(props: Props) {

  const ref = useRef<HTMLDivElement | null>(null);
  const map = useRef<MaplibreGL | null>(null)

  const updateFeatures = (map: MaplibreGL) => {
    const source = map.getSource('gdata');

    if (source) {
      const geojson = generateRandomPoints(map.getBounds().toArray(), 1000);
      source.setData(geojson);
    }
  }

  useEffect(() => {
    if (! ref.current) {
      return;
    }

    map.current = new window.geolonia.Map({
      container: ref.current,
      center: [ 139.741357, 35.658099 ], // TODO: とりあえず日本経緯度原点、初期値の設定が必要
      zoom: 10,
      hash: true,
      style: "geolonia/gsi",
    })
  }, [ref.current])

  useEffect(() => {
    if (! map.current) {
      return;
    }

    map.current.on('load', () => {
      if (! map.current) {
        return;
      }

      if (!map.current.getSource('gdata')) {
        map.current.addSource('gdata', {type: 'geojson', data: {
          "type": "FeatureCollection",
          "features": []
        }});

        // TODO: 以下ヒートマップ用スタイル。`heatmap-density` を外部ファイルにする？
        map.current.addLayer({
          "id": "overlay-heat",
          "type": "heatmap",
          "source": "gdata",
          "paint": {
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              'rgba(33,102,172,0)',
              0.2,
              'rgb(103,169,207)',
              0.4,
              'rgb(209,229,240)',
              0.6,
              'rgb(253,219,199)',
              0.8,
              'rgb(239,138,98)',
              1,
              'rgb(178,24,43)'
            ],
            "heatmap-weight": 1,
            "heatmap-intensity": 1,
            "heatmap-opacity": 0.5
          }
        }, 'poi');

        updateFeatures(map.current);
      }
    })

    map.current.on('moveend', () => {
      if (! map.current) {
        return;
      }

      updateFeatures(map.current);
    })
  }, [map.current])

  useEffect(() => {
    if (! map.current) {
      return;
    }

    updateFeatures(map.current);
  }, [props.currentDate]);

  return (
    <>
      <div ref={ref} className="map" data-marker="off"
        data-navigation-control="on" data-geolocate-control="on" data-gesture-handling="off"></div>
    </>
  )
}

export default Map
