// 境界ボックス人口統計API専用のエンドポイント設定
const DEMOGRAPHIC_API_BASE_URL = 'http://localhost:8080';

export interface BoundingBoxDemographicsRequest {
  venueLat: number;
  venueLng: number;
  radiusMeters: number;
  eventTimeSlots: {
    startTime: string;
    endTime: string;
  }[];
  analysisStartTime: string;
  analysisEndTime: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface BoundingBoxDemographicsResponse {
  analysisSummary: {
    totalEventParticipants: number;
    totalBoundingBoxUsers: number;
    totalEventTimeSlots: number;
    venueLat: number;
    venueLng: number;
    radiusMeters: number;
    boundingBox: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
  };
  demographics: {
    sexDistribution: { [key: string]: number };
    ageGroups: { [key: string]: number };
    jobCategories: { [key: string]: number };
    address: { [key: string]: number };
    transportationMethods: { [key: string]: number };
    maritalStatus: { [key: string]: number };
    personalIncome: { [key: string]: number };
    householdIncome: { [key: string]: number };
  };
}

/**
 * 境界ボックス人口統計データを取得する
 * @param venueLat - 会場の緯度
 * @param venueLng - 会場の経度
 * @param radiusMeters - 半径（メートル）
 * @param eventTimeSlots - イベント時間スロット
 * @param analysisStartTime - 分析開始時間
 * @param analysisEndTime - 分析終了時間
 * @param bbox - 境界ボックス
 * @param signal - AbortSignal（キャンセル用）
 * @returns Promise<BoundingBoxDemographicsResponse>
 */
export const getBoundingBoxDemographics = async (
  venueLat: number,
  venueLng: number,
  radiusMeters: number,
  eventTimeSlots: { startTime: string; endTime: string }[],
  analysisStartTime: string,
  analysisEndTime: string,
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  signal?: AbortSignal
): Promise<BoundingBoxDemographicsResponse> => {
  try {

    // リクエストボディの構築
    const requestBody: BoundingBoxDemographicsRequest = {
      venueLat,
      venueLng,
      radiusMeters,
      eventTimeSlots,
      analysisStartTime,
      analysisEndTime,
      bbox
    };


    const response = await fetch(`${DEMOGRAPHIC_API_BASE_URL}/api/v1/bounding-box/demographics`, {
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

    const responseData: BoundingBoxDemographicsResponse = await response.json();

    return responseData;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    console.error('境界ボックス人口統計データ取得エラー:', error);
    
    throw new Error(
      error instanceof Error 
        ? `境界ボックス人口統計データの取得に失敗しました: ${error.message}`
        : '境界ボックス人口統計データの取得に失敗しました'
    );
  }
};

export default getBoundingBoxDemographics; 