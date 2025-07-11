import React from 'react';
import HeatmapControl from './HeatmapControl';
import DemographicFilter from './DemographicFilter';
import { DemographicFilters } from '../types/demographicData';

interface HeatmapPoint {
  h3Index: string;
  lat: number;
  lng: number;
  intensity: number;
  value: number;
}

interface H3HeatmapData {
  h3_index: string;
  person_count: number;
  time: string;
  lat: number;
  lng: number;
}

interface PersonCountRangeH3 {
  id: string;
  name: string;
  min: number;
  max: number;
  color: [number, number, number, number];
  enabled: boolean;
}

interface LayerControlsProps {
  isControlsCollapsed: boolean;
  setIsControlsCollapsed: (collapsed: boolean) => void;
  showHeatmapLayer: boolean;
  setShowHeatmapLayer: (show: boolean) => void;
  heatmapData: HeatmapPoint[];
  setHeatmapData: (data: HeatmapPoint[]) => void;
  heatmapError: string | null;
  setHeatmapError: (error: string | null) => void;
  isHeatmapLoading: boolean;
  dateRange: { start: Date; end: Date } | null;
  showH3Heatmap?: boolean;
  setShowH3Heatmap?: (show: boolean) => void;
  showH3Layer?: boolean;
  setShowH3Layer?: (show: boolean) => void;
  h3Data?: H3HeatmapData[];
  personCountRangesH3?: PersonCountRangeH3[];
  setPersonCountRangesH3?: (ranges: PersonCountRangeH3[]) => void;
  // 人口統計フィルター関連
  onDemographicFiltersChange?: (filters: DemographicFilters) => void;
  onApplyDemographicFilters?: () => void;
  isDemographicLoading?: boolean;
  demographicError?: string | null;
  setDemographicError?: (error: string | null) => void;
}

const LayerControls: React.FC<LayerControlsProps> = ({
  isControlsCollapsed,
  setIsControlsCollapsed,
  showHeatmapLayer,
  setShowHeatmapLayer,
  heatmapData,
  setHeatmapData,
  heatmapError,
  setHeatmapError,
  isHeatmapLoading,
  dateRange,
  showH3Heatmap = false,
  setShowH3Heatmap,
  showH3Layer,
  setShowH3Layer,
  h3Data = [],
  personCountRangesH3 = [],
  setPersonCountRangesH3,
  // 人口統計フィルター関連
  onDemographicFiltersChange,
  onApplyDemographicFilters,
  isDemographicLoading = false,
  demographicError,
  setDemographicError
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);

  return (
    <div className={`visualization-controls ${isControlsCollapsed ? 'collapsed' : ''}`}>
      <div className="controls-header" onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}>
        <h2>データ表示設定</h2>
        <button className="toggle-controls-btn" type="button">
          ×
        </button>
      </div>
      
      <div className="controls-content">
        {/* 簡易コントロール */}
        <div className="basic-controls">
        </div>

        {/* 詳細設定 */}
        <div className="advanced-settings">
          <div className="advanced-content">
            <HeatmapControl
              showHeatmapLayer={showHeatmapLayer}
              setShowHeatmapLayer={setShowHeatmapLayer}
              heatmapData={heatmapData}
              setHeatmapData={setHeatmapData}
              heatmapError={heatmapError}
              setHeatmapError={setHeatmapError}
              dateRange={dateRange}
            />
            {onDemographicFiltersChange && onApplyDemographicFilters && (
              <DemographicFilter
                onFiltersChange={onDemographicFiltersChange}
                onApplyFilters={onApplyDemographicFilters}
                isLoading={isDemographicLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerControls; 