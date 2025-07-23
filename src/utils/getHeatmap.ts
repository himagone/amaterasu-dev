import { heatmapResponse, heatmapRequestParam, bbox, heatmapPoints, heatmapTimeseriesResponse, heatmapTimeseriesRequestParam, heatmapEventParticipantRequestParam, heatmapEventParticipantResponse } from '../types/heatmap';

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
  zoom: number,
  bounds?: {north: number, south: number, east: number, west: number},
  activityTypes?: string[]
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
    zoom: zoom,
    activityTypes: activityTypes || ["on_foot", "walking", "running","still"]
  };
  
  return requestParam;
};

// ヒートマップデータを取得
const fetchHeatmap = async (url: string, requestParam: heatmapRequestParam, signal?: AbortSignal): Promise<heatmapResponse> => {

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
  return data;
};

// ヒートマップデータを取得
export const getHeatmapData = async (
  startDate: Date,
  endDate: Date,
  zoom: number,
  bounds?: {north: number, south: number, east: number, west: number},
  signal?: AbortSignal,
  activityTypes?: string[]
): Promise<heatmapPoints[]> => {
  const requestParam = buildHeatmapRequest(startDate, endDate, zoom, bounds, activityTypes);
  const response = await fetchHeatmap('http://localhost:8080/api/v1/heatmap/aggregate', requestParam, signal);
  
  return response.points || [];
};

// ヒートマップのタイムシリーズデータを取得
const fetchHeatmapTimeseries = async (url: string, requestParam: heatmapTimeseriesRequestParam, signal?: AbortSignal): Promise<heatmapTimeseriesResponse> => {

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

  const data: heatmapTimeseriesResponse = await response.json();
  return data;
};

// タイムシリーズヒートマップデータを取得
export const getHeatmapTimeseriesData = async (
  startDate: Date,
  endDate: Date,
  zoom: number,
  intervalMinutes: number = 1, // デフォルト1分区切り
  bounds?: {north: number, south: number, east: number, west: number},
  signal?: AbortSignal,
  activityTypes?: string[]
): Promise<{timestamp: string, points: heatmapPoints[]}[]> => {
  const requestParam: heatmapTimeseriesRequestParam = {
    startTime: formatDateTime(startDate),
    endTime: formatDateTime(endDate),
    bbox: bounds ? convertBoundsToBox(bounds) : {
      minLat: 34.22696,
      maxLat: 34.42696,
      minLng: 133.97372,
      maxLng: 134.17372
    },
    zoom: zoom,
    intervalMinutes: intervalMinutes,
    activityTypes: activityTypes || ["on_foot", "walking", "running","still"]
  }; 
  const response = await fetchHeatmapTimeseries('http://localhost:8080/api/v1/heatmap/timeseries', requestParam, signal);

  // APIレスポンスの構造に合わせて変換
  let result: {timestamp: string, points: heatmapPoints[]}[] = [];
  
  if (response.timeSlices && Array.isArray(response.timeSlices)) {
    // timeSlicesを期待される形式に変換
    result = response.timeSlices.map((timeSlice: any) => ({
      timestamp: timeSlice.timestamp || timeSlice.time || '',
      points: timeSlice.points || []
    }));
  } else if (response.data && Array.isArray(response.data)) {
    result = response.data;
  }
  return result;
};

const fetchHeatmapEventParticipant = async (url: string, requestParam: heatmapEventParticipantRequestParam): Promise<heatmapEventParticipantResponse> => {

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestParam),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data: heatmapEventParticipantResponse = await response.json();
  return data;
};

// 穴吹アリーナにイベント期間中滞在した人のヒートマップデータを取得
export const getHeatmapEventParticipant = async (
  startDate: Date,
  endDate: Date,
  zoom: number,
  radiusMeters: number = 100, // 半径デフォルト200m
  minStillCount: number = 10, // stillの最小カウントデフォルト3
): Promise<heatmapEventParticipantResponse> => {
  const requestParam: heatmapEventParticipantRequestParam = {
    analysisStartTime: formatDateTime(startDate),
    analysisEndTime: formatDateTime(endDate),
    venueLat: 34.35370012,
    venueLng: 134.0459301,
    eventTimeSlots: [
      {
        startTime: "2025-03-01T16:00:00",
        endTime: "2025-03-01T19:00:00"
      }
    ],
    zoom: zoom,
    radiusMeters: radiusMeters,
    minStillCount: minStillCount
  }; 
  const response = await fetchHeatmapEventParticipant('http://localhost:8080/api/v1/live-event/analysis', requestParam);
  return response;
};

export default getHeatmapData;

