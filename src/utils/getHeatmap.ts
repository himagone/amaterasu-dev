import { heatmapResponse } from '../types/heatmap';
export const fetchHeatmap = async (url: string, headers: HeadersInit): Promise<heatmapResponse> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('response error');
    }
    const data: heatmapResponse = await response.json();
    return data;
};

// URLを入れてfetchする
const url = 'http://localhost:8080/api/v1/heatmap';
const headers = {
  'Content-Type': 'application/json',
};
const params = {
  timestamp: timestamp,
  b: xxxx,
  c: xxxx,
};
