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

export interface heatmapEventParticipantRequestParam {
  analysisStartTime: string,
  analysisEndTime: string,
  venueLat: 34.35370012,
  venueLng: 134.0459301,
  eventTimeSlots: Array<{
    startTime: string,
    endTime: string
  }>,
  h3Resolution: number,
  radiusMeters: number,
  minStayMinutes: number
}

export interface heatmapEventParticipantResponse {
  participantSummary: ParticipantSummary,
  cells: Array<eventParticipanth3Cells>
}
export interface ParticipantSummary{
  totalParticipants: number;
  totalEventTimeSlots: number;
  venueLat: number;
  venueLng: number;
  radiusMeters: number;
  analysisStartTime: string;
  analysisEndTime: string;
  demographics: demographics;
}
export interface eventParticipanth3Cells{
  h3Index: string;
  count: number;
  lat: number;
  lng: number;
  avgStayMinutes: number;
  dominantActivityType: string;
}
interface demographics {
  /** 性別ごとの件数 e.g. { "男性": 8, "女性": 6 } */
  sexDistribution: Record<string, number>;
  /** 年代グループごとの件数 e.g. { "20-29": 1, ... } */
  ageGroups: Record<string, number>;
  /** 職業カテゴリごとの件数 */
  jobCategories: Record<string, number>;
  /** 交通手段ごとの件数 */
  transportationMethods: Record<string, number>;
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