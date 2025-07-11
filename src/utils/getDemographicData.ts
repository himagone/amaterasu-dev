import { 
  DemographicFilters, 
  DemographicPoint, 
  DemographicRequest,
  FilterCondition,
  getBirthYearRangeFromAgeGroup
} from '../types/demographicData';
import { buildHeatmapRequest } from './getHeatmap';

// 属性フィルターAPI専用のエンドポイント設定
const DEMOGRAPHIC_API_BASE_URL = 'http://localhost:8080';

/**
 * フィルター条件をAPIリクエスト形式に変換
 */
const buildApiFilters = (filters: DemographicFilters) => {
  const filterGroups: FilterCondition[] = [];
  
  // 性別フィルター
  if (filters.gender.length > 0) {
    if (filters.gender.length === 1) {
      // 単一選択の場合
      filterGroups.push({
        field: 'sex',
        operator: '=',
        value: filters.gender[0]
      });
    } else {
      // 複数選択の場合はinオペレーターを使用
      filterGroups.push({
        field: 'sex',
        operator: 'in',
        values: filters.gender
      });
    }
  }
  
  // 年齢フィルター（複数の年齢グループを統合して最小・最大範囲で検索）
  if (filters.age.length > 0) {
    let minBirthYear = Infinity;
    let maxBirthYear = -Infinity;
    
    filters.age.forEach(ageGroup => {
      const { minYear, maxYear } = getBirthYearRangeFromAgeGroup(ageGroup);
      minBirthYear = Math.min(minBirthYear, minYear);
      maxBirthYear = Math.max(maxBirthYear, maxYear);
    });
    
    if (minBirthYear !== Infinity && maxBirthYear !== -Infinity) {
      filterGroups.push({
        field: 'birthyear',
        operator: '>=',
        value: minBirthYear
      });
      
      filterGroups.push({
        field: 'birthyear',
        operator: '<=',
        value: maxBirthYear
      });
    }
  }
  
  // 職業フィルター
  if (filters.occupation.length > 0) {
    if (filters.occupation.length === 1) {
      // 単一選択の場合
      filterGroups.push({
        field: 'job',
        operator: '=',
        value: filters.occupation[0]
      });
    } else {
      // 複数選択の場合はinオペレーターを使用
      filterGroups.push({
        field: 'job',
        operator: 'in',
        values: filters.occupation
      });
    }
  }
  
  // 都道府県フィルター
  if (filters.prefecture.length > 0) {
    if (filters.prefecture.length === 1) {
      // 単一選択の場合
      filterGroups.push({
        field: 'address',
        operator: '=',
        value: filters.prefecture[0]
      });
    } else {
      // 複数選択の場合はinオペレーターを使用
      filterGroups.push({
        field: 'address',
        operator: 'in',
        values: filters.prefecture
      });
    }
  }
  
  // 年収フィルター
  if (filters.income.length > 0) {
    if (filters.income.length === 1) {
      // 単一選択の場合
      filterGroups.push({
        field: 'householdincome',
        operator: '=',
        value: filters.income[0]
      });
    } else {
      // 複数選択の場合はinオペレーターを使用
      filterGroups.push({
        field: 'householdincome',
        operator: 'in',
        values: filters.income
      });
    }
  }
  
  return filterGroups;
};

/**
 * 人口統計フィルターに基づいてポイントデータを取得する
 * @param filters - 人口統計フィルター条件
 * @param dateRange - 日付範囲
 * @param zoomLevel - ズームレベル
 * @param bounds - 地図の表示範囲（オプション）
 * @param signal - AbortSignal（キャンセル用）
 * @returns Promise<DemographicPoint[]>
 */
export const getDemographicData = async (
  filters: DemographicFilters,
  dateRange: { start: Date; end: Date },
  zoomLevel: number,
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  signal?: AbortSignal
): Promise<DemographicPoint[]> => {
  try {
    console.log('人口統計データを取得中...', {
      dateRange: {
        start: dateRange.start.toLocaleString('ja-JP'),
        end: dateRange.end.toLocaleString('ja-JP')
      },
      filtersCount: Object.values(filters).reduce((sum, arr) => sum + arr.length, 0)
    });

    // ヒートマップと同じ時間処理を使用
    const heatmapRequest = buildHeatmapRequest(dateRange.start, dateRange.end, zoomLevel, bounds);

    // リクエストボディの構築
    const requestBody: DemographicRequest = {
      startTime: heatmapRequest.startTime,
      endTime: heatmapRequest.endTime,
      bbox: bounds ? {
        minLat: bounds.south,
        maxLat: bounds.north,
        minLng: bounds.west,
        maxLng: bounds.east
      } : {
        minLat: 24.82,
        maxLat: 40.83,
        minLng: 125.14,
        maxLng: 135.15
      },
      query: {
        operator: 'AND',
        filters: buildApiFilters(filters)
      }
    };

    console.log('APIリクエストボディ:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${DEMOGRAPHIC_API_BASE_URL}/api/v1/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal
    });

    if (!response.ok) {
      throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    const data: DemographicPoint[] = responseData.points || [];
    console.log('取得されたデータ件数:', data.length);

    return data;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('人口統計データ取得がキャンセルされました');
      throw error;
    }
    
    console.error('人口統計データ取得エラー:', error);
    
    throw new Error(
      error instanceof Error 
        ? `人口統計データの取得に失敗しました: ${error.message}`
        : '人口統計データの取得に失敗しました'
    );
  }
};

export default getDemographicData; 