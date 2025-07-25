import React from 'react';
import { CongestionPoint, CongestionSummary } from '../types/heatmap';
import './CongestionPoints.css';

interface CongestionPointsProps {
  congestionData: {
    topPoints: CongestionPoint[];
    summary: CongestionSummary;
    executionTimeMs: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const CongestionPoints: React.FC<CongestionPointsProps> = ({
  congestionData,
  isLoading,
  error
}) => {
  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="congestion-points-container">
        <div className="congestion-loading">
          <div className="loading-spinner"></div>
          <p>混雑ポイントを分析中...</p>
          <p className="loading-subtitle">AIが混雑パターンを分析しています</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="congestion-points-container">
        <div className="congestion-error">
          <div className="error-icon">⚠️</div>
          <h3>エラーが発生しました</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!congestionData) {
    return null;
  }

  return (
    <div className="congestion-points-container">
      {/* ヘッダーセクション */}
      <div className="congestion-header">
        <div className="header-main">
          <h2>🚦 混雑ポイント分析</h2>
          <div className="execution-time">
            <span className="time-icon">⏱️</span>
            <span>処理時間: {congestionData.executionTimeMs}ms</span>
          </div>
        </div>
        
        {/* 分析サマリー */}
        <div className="analysis-summary">
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-icon">📊</div>
              <div className="summary-content">
                <div className="summary-label">平均混雑度</div>
                <div className="summary-value">{congestionData.summary.averageCongestion.toFixed(1)}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">🔥</div>
              <div className="summary-content">
                <div className="summary-label">最大混雑度</div>
                <div className="summary-value">{congestionData.summary.maxCongestion.toFixed(1)}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">📍</div>
              <div className="summary-content">
                <div className="summary-label">分析セル数</div>
                <div className="summary-value">{congestionData.summary.totalCells.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="summary-card">
              <div className="summary-icon">⚙️</div>
              <div className="summary-content">
                <div className="summary-label">H3解像度</div>
                <div className="summary-value">{congestionData.summary.h3Resolution}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 分析設定 */}
        <div className="analysis-settings">
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">分析期間:</span>
              <span className="setting-value">
                {formatTime(congestionData.summary.startTime)} - {formatTime(congestionData.summary.endTime)}
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">時間間隔:</span>
              <span className="setting-value">{congestionData.summary.timeIntervalMinutes}分</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">混雑閾値:</span>
              <span className="setting-value">{congestionData.summary.congestionThreshold}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">空き閾値:</span>
              <span className="setting-value">{congestionData.summary.emptyThreshold}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 使用方法説明 */}
      <div className="usage-instructions">
        <div className="instruction-card">
          <div className="instruction-icon">🎯</div>
          <div className="instruction-content">
            <h3>使用方法</h3>
            <p>地図上の<span style={{color: '#ffd700', fontWeight: 'bold'}}>混雑ポイント</span>にマウスをホバーすると、詳細な混雑情報が表示されます。</p>
            <ul>
              <li>📈 <strong>ピーク時間帯</strong>: 最も混雑する時間帯</li>
              <li>🕐 <strong>空いた時間帯</strong>: 比較的空いている時間帯</li>
              <li>📊 <strong>統計情報</strong>: 総データポイント数、平均値、最大値</li>
            </ul>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="congestion-footer">
        <div className="footer-info">
          <p>💡 この分析は、選択された時間範囲と地域内の混雑パターンをAIが自動分析した結果です。</p>
          <p>🎯 混雑ポイントは、データポイント数、時間的な混雑パターン、地理的な分布を総合的に評価して選定されています。</p>
        </div>
      </div>
    </div>
  );
};

export default CongestionPoints; 