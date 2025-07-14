import { GeoBoundingBox } from "@deck.gl/geo-layers";
import { BitmapBoundingBox } from "@deck.gl/layers";

export interface heatmapResponse {
  timestamp: string,
  resolution: string,
  points: Array<heatmapPoints>
}

// timeseries APIのレスポンス型
export interface heatmapTimeseriesResponse {
  data?: Array<{
    timestamp: string,
    points: Array<heatmapPoints>
  }>,
  // 実際のAPIレスポンス構造
  aggregatedPoints?: Array<heatmapPoints>,
  timeSlices?: Array<{
    timestamp?: string,
    time?: string,
    points?: Array<heatmapPoints>
  }>,
  startTime?: string,
  endTime?: string,
  intervalMinutes?: number,
  resolution?: string,
  executionTimeMs?: number
}

export interface heatmapPoints {
  h3Index: string,
  lat: number,
  lng: number,
  intensity: number,
  value: number,
  // 人口統計属性（オプション）
  gender?: string,
  ageGroup?: string,
  occupation?: string,
  prefecture?: string,
  incomeRange?: string,
  timestamp?: string
}

export interface heatmapRequestParam {
  startTime: string,
  endTime: string,
  bbox: bbox,
  zoom: number,
  activityTypes: string[]
}

// timeseries APIのリクエストパラメータ型
export interface heatmapTimeseriesRequestParam {
  startTime: string,
  endTime: string,
  bbox: bbox,
  zoom: number,
  intervalMinutes: number,
  activityTypes?: string[]
}

export interface pointsRequestParam {
  startTime: string,
  endTime: string,
  bbox: bbox,
  zoom: number
  query: {
    operator: string,
    filters: Array<queryFilter>
  }
}

export interface bbox {
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
}

export interface queryFilter {
  field: string,
  operator: string,
  value : string
}