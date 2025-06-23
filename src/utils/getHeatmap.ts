import { heatmapResponse, heatmapRequestParam, queryFilter, bbox, heatmapPoints } from '../types/heatmap';

// 日時を YYYY-MM-DDTHH:mm:ss 形式にフォーマット
const formatDateTime = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// 地図の表示範囲を bbox 形式に変換
export const convertBoundsToBox = (bounds: {north: number, south: number, east: number, west: number}): bbox => {
  return {
    minLat: bounds.south,
    maxLat: bounds.north,
    minLng: bounds.west,
    maxLng: bounds.east
  };
};

// ヒートマップリクエストのパラメータを構築
export const buildHeatmapRequest = (
  startDate: Date, 
  endDate: Date, 
  bounds?: {north: number, south: number, east: number, west: number}, 
  zoom: number = 11
): heatmapRequestParam => {
  const requestParam: heatmapRequestParam = {
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(endDate),
    bbox: bounds ? convertBoundsToBox(bounds) : {
      minLat: 34.22696,
      maxLat: 34.42696,
      minLng: 133.97372,
      maxLng: 134.17372
    },
    zoom: zoom
  };
  
  return requestParam;
};

// ヒートマップデータを取得
const fetchHeatmap = async (url: string, requestParam: heatmapRequestParam, signal?: AbortSignal): Promise<heatmapResponse> => {
  console.log('Sending heatmap request:', requestParam);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestParam),
    signal: signal
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: heatmapResponse = await response.json();
  console.log('Received heatmap data:', data);
  return data;
};

// メイン関数：ヒートマップデータを取得
export const getHeatmapData = async (
  startDate: Date,
  endDate: Date,
  bounds?: {north: number, south: number, east: number, west: number},
  zoom: number = 11,
  signal?: AbortSignal
): Promise<heatmapPoints[]> => {
  const requestParam = buildHeatmapRequest(startDate, endDate, bounds, zoom);
  const response = await fetchHeatmap('http://localhost:8080/api/v1/heatmap/aggregate', requestParam, signal);
  
  return response.points || [];
};

export default getHeatmapData;

