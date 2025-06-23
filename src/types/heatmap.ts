import { GeoBoundingBox } from "@deck.gl/geo-layers";
import { BitmapBoundingBox } from "@deck.gl/layers";

export interface heatmapResponse {
  timestamp: string,
  resolution: string,
  points: Array<heatmapPoints>
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
  zoom: number
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