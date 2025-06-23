import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { heatmapPoints } from '../types/heatmap';

export interface HeatmapLayerConfig {
  id?: string;
  radiusPixels?: number;
  intensityScale?: number;
  threshold?: number;
  colorRange?: [number, number, number, number][];
  aggregation?: 'SUM' | 'MEAN';
  getPosition?: (d: heatmapPoints) => [number, number];
  getWeight?: (d: heatmapPoints) => number;
  opacity?: number;
  visible?: boolean;
}

// デフォルトのカラーレンジ（低密度から高密度へ）- より見やすく調整
const DEFAULT_COLOR_RANGE: [number, number, number, number][] = [
  [0, 255, 0, 120],      // 緑: 低密度
  [255, 255, 0, 150],    // 黄: 中密度
  [255, 165, 0, 180],    // オレンジ: 高密度
  [255, 69, 0, 200],     // 赤オレンジ: 高密度
  [255, 0, 0, 220],      // 赤: 最高密度
  [139, 0, 0, 240]       // 暗赤: 極高密度
];

/**
 * ヒートマップデータからDeck.gl HeatmapLayerを作成
 * @param data ヒートマップポイントデータ
 * @param config レイヤー設定オプション
 * @returns HeatmapLayer インスタンス
 */
export const createHeatmapLayer = (
  data: heatmapPoints[],
  config: HeatmapLayerConfig = {}
): HeatmapLayer => {
  const {
    id = `heatmap-layer-${Date.now()}`,
    radiusPixels = 50,
    intensityScale = 0.8,
    threshold = 0.03,
    colorRange = DEFAULT_COLOR_RANGE,
    aggregation = 'SUM',
    getPosition = (d: heatmapPoints) => [d.lng, d.lat],
    getWeight = (d: heatmapPoints) => d.intensity || d.value || 1,
    opacity = 0.8,
    visible = true
  } = config;

  console.log(`Creating heatmap layer with ${data.length} data points`);
  
  // データの統計情報をログ出力
  if (data.length > 0) {
    const intensities = data.map(d => d.intensity || 0);
    const values = data.map(d => d.value || 0);
    console.log('Data statistics:', {
      points: data.length,
      intensityRange: [Math.min(...intensities), Math.max(...intensities)],
      valueRange: [Math.min(...values), Math.max(...values)]
    });
  }

  return new HeatmapLayer({
    id,
    data,
    pickable: true,
    visible,
    opacity,
    
    // 位置とウェイト関数
    getPosition,
    getWeight,
    
    // ヒートマップ設定
    radiusPixels,
    intensityScale,
    threshold,
    aggregation,
    
    // カラーレンジ
    colorRange,
    
    // パフォーマンス最適化
    updateTriggers: {
      getPosition: data,
      getWeight: data
    },
    
    // GPU集約を有効にする
    gpuAggregation: true
  });
};

/**
 * 強度ベースのカラーレンジを生成
 * @param baseColor ベースカラー [r, g, b]
 * @param steps グラデーションのステップ数
 * @returns カラーレンジ配列
 */
export const generateColorRange = (
  baseColor: [number, number, number] = [255, 0, 0],
  steps: number = 6
): number[][] => {
  const colorRange: number[][] = [];
  const [r, g, b] = baseColor;
  
  for (let i = 0; i < steps; i++) {
    const intensity = (i + 1) / steps;
    const alpha = Math.floor(80 + (120 * intensity)); // 80-200の透明度
    
    // 色の強度を調整
    const adjustedR = Math.floor(r * intensity);
    const adjustedG = Math.floor(g * intensity);
    const adjustedB = Math.floor(b * intensity);
    
    colorRange.push([adjustedR, adjustedG, adjustedB, alpha]);
  }
  
  return colorRange;
};

/**
 * プリセットのカラースキーム
 */
export const COLOR_SCHEMES = {
  // 熱感
  HEAT: [
    [0, 255, 0, 120],      // 緑
    [255, 255, 0, 150],    // 黄
    [255, 165, 0, 180],    // オレンジ
    [255, 69, 0, 200],     // 赤オレンジ
    [255, 0, 0, 220],      // 赤
    [139, 0, 0, 240]       // 暗赤
  ] as [number, number, number, number][],
  
  // 青系
  BLUE: [
    [173, 216, 230, 80],  // ライトブルー
    [135, 206, 235, 100], // スカイブルー
    [30, 144, 255, 120],  // ドジャーブルー
    [0, 100, 255, 140],   // ブルー
    [0, 0, 255, 160],     // 純青
    [0, 0, 139, 180]      // ダークブルー
  ] as [number, number, number, number][],
  
  // 紫系
  PURPLE: [
    [221, 160, 221, 80],  // プラム
    [186, 85, 211, 100],  // ミディアムオーキッド
    [138, 43, 226, 120],  // ブルーバイオレット
    [128, 0, 128, 140],   // パープル
    [75, 0, 130, 160],    // インディゴ
    [25, 25, 112, 180]    // ミッドナイトブルー
  ] as [number, number, number, number][]
};

export default createHeatmapLayer; 