import { CongestionResponse } from '../types/heatmap';

export const getCongestionPoints = async (
  startTime: string,
  endTime: string,
  zoom: number,
  activityTypes: string[],
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }
): Promise<CongestionResponse> => {
  try {
    const response = await fetch('http://localhost:8080/api/v1/congestion/analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startTime,
        endTime,
        zoom,
        activityTypes,
        bbox
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: CongestionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('混雑ポイントデータ取得エラー:', error);
    throw error;
  }
}; 