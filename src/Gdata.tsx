import { FeatureCollection, Feature, Point } from 'geojson';

/**
 * 指定されたBbox内にランダムなポイントを生成する
 * @param bbox - [minLng, minLat, maxLng, maxLat]
 * @param pointCount - 生成するポイントの数
 * @returns GeoJSON FeatureCollection
 */
export function generateRandomPoints(
  bbox: [[number, number], [number, number]],
  pointCount: number
): FeatureCollection {
  const features: Feature<Point>[] = [];

  for (let i = 0; i < pointCount; i++) {
    const [lng, lat] = randomCoord(bbox);
    const point: Feature<Point> = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: { id: `point-${i}` }
    };
    features.push(point);
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * Bbox内のランダムな座標を生成する
 * @param bbox - [minLng, minLat, maxLng, maxLat]
 * @returns [lng, lat]
 */
function randomCoord(bbox: [[number, number], [number, number]]): [number, number] {
  const [[minLng, minLat], [maxLng, maxLat]] = bbox;
  return [
    Math.random() * (maxLng - minLng) + minLng,
    Math.random() * (maxLat - minLat) + minLat
  ];
}
