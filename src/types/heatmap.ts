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
  value: number
}