// 人口統計APIのリクエスト型定義
export interface DemographicRequest {
  startTime: string;
  endTime: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  query: {
    operator: string;
    filters: Array<FilterCondition>;
  };
}

// フィルター条件の型定義（in オペレーター対応）
export interface FilterCondition {
  field: string;
  operator: string;
  value?: string | number;
  values?: string[];
}

// 人口統計APIのレスポンス型定義（個人レベルのポイントデータ）
export interface DemographicPoint {
  id: string;
  recordedAt: string;
  lat: number;
  lng: number;
  userId: string;
  deviceId: string;
  sex: string;
  birthyear: number;
  job: string;
  position: string | null;
  address: string;
  driver: string | null;
  cartype: string | null;
  transportation: string;
  maritalstatus: string;
  familylivingtogether: string;
  childlivingtogether: string;
  youngestbirthyear: number | null;
  residencestatus: string;
  recentacademichistory: string;
  personalincome: string;
  householdincome: string;
}

// フィルター設定の型定義
export interface DemographicFilters {
  gender: string[];
  age: string[];
  occupation: string[];
  prefecture: string[];
  income: string[];
}

// 年齢計算のヘルパー関数（生まれた年から現在の年齢グループを計算）
export const calculateAge = (birthYear: number): string => {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age <= 20) return '20代以下';
  if (age <= 29) return '30代';
  if (age <= 39) return '40代';
  if (age <= 49) return '50代';
  if (age <= 59) return '60代';
  return '70代以上';
};

// 年齢グループから生まれた年の範囲を計算する関数
export const getBirthYearRangeFromAgeGroup = (ageGroup: string): { minYear: number; maxYear: number } => {
  const currentYear = new Date().getFullYear();
  
  switch (ageGroup) {
    case '20代以下':
      // 0歳〜20歳: 20歳は (currentYear-20)年生まれ、0歳は (currentYear-1)年生まれ
      return { minYear: currentYear - 20, maxYear: currentYear - 1 };
    case '30代':
      // 30歳〜39歳: 39歳は (currentYear-39)年生まれ、30歳は (currentYear-30)年生まれ
      return { minYear: currentYear - 39, maxYear: currentYear - 30 };
    case '40代':
      // 40歳〜49歳
      return { minYear: currentYear - 49, maxYear: currentYear - 40 };
    case '50代':
      // 50歳〜59歳
      return { minYear: currentYear - 59, maxYear: currentYear - 50 };
    case '60代':
      // 60歳〜69歳
      return { minYear: currentYear - 69, maxYear: currentYear - 60 };
    case '70代以上':
      // 70歳以上
      return { minYear: 1900, maxYear: currentYear - 70 };
    default:
      return { minYear: 1900, maxYear: currentYear - 1 };
  }
};

 