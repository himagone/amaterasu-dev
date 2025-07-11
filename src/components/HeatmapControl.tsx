import React from 'react';
import { heatmapPoints } from '../types/heatmap';
import './HeatmapControl.css';

interface HeatmapControlProps {
  showHeatmapLayer: boolean;
  setShowHeatmapLayer: (show: boolean) => void;
  heatmapData: heatmapPoints[];
  setHeatmapData: (data: heatmapPoints[]) => void;
  heatmapError: string | null;
  setHeatmapError: (error: string | null) => void;
  dateRange: { start: Date; end: Date } | null;
  isLoading?: boolean;
}

const HeatmapControl: React.FC<HeatmapControlProps> = ({
  showHeatmapLayer,
  setShowHeatmapLayer,
  heatmapData,
  setHeatmapData,
  heatmapError,
  setHeatmapError,
  dateRange,
  isLoading = false
}) => {
  if (isLoading) {
    return null;
  }

  return (
    <>
      {/* ヒートマップ制御パネル */}
      <div className="layer-control">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showHeatmapLayer}
            onChange={(e) => {
              if (e.target.checked) {
                setShowHeatmapLayer(true);
              } else {
                setShowHeatmapLayer(false);
                // ヒートマップOFF時は即座にデータをクリアしてレイヤーを非表示に
                setHeatmapData([]);
                setHeatmapError(null);
              }
            }}
          />
          <span className="slider">期間全体のヒートマップを表示</span>
        </label>
        
        {/* ヒートマップ情報 */}
        <div className={`layer-info ${!showHeatmapLayer ? 'hidden' : ''}`}>
          <div className="legend">
            <div className="legend-title">人数</div>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color legend-color-1"></div>
                <span>1-4人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-2"></div>
                <span>5-9人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-3"></div>
                <span>10-19人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-4"></div>
                <span>20-49人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-5"></div>
                <span>50-99人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-6"></div>
                <span>100-199人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-7"></div>
                <span>200-499人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-8"></div>
                <span>500-999人</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color-9"></div>
                <span>1000人以上</span>
              </div>
            </div>
            {heatmapData.length > 0 && (
              <div className="legend-range-info">
                実際の範囲: {Math.min(...heatmapData.map(d => d.value || d.intensity || 1))} - {Math.max(...heatmapData.map(d => d.value || d.intensity || 1))} 人
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HeatmapControl; 