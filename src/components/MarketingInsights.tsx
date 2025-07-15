import React, { useMemo } from 'react';
import './MarketingInsights.css';

interface MarketingInsightsProps {
  timeseriesData: { timestamp: string; points: any[] }[];
  currentFrameIndex: number;
  isPlaying: boolean;
}

interface InsightData {
  peakTime: string;
  peakCount: number;
  averageFlow: number;
  busyPeriods: { start: string; end: string; level: string }[];
  topAreas: { lat: number; lng: number; intensity: number; rank: number }[];
  marketingRecommendations: string[];
}

const MarketingInsights: React.FC<MarketingInsightsProps> = ({
  timeseriesData,
  currentFrameIndex,
  isPlaying
}) => {
  const insights = useMemo<InsightData | null>(() => {
    if (timeseriesData.length === 0) return null;

    // ピーク時間帯の分析
    let peakData = { time: '', count: 0, index: 0 };
    let totalFlow = 0;
    const hourlyData: { [hour: string]: number } = {};

    timeseriesData.forEach((frame, index) => {
      const frameTotal = frame.points.reduce((sum, point) => 
        sum + (point.value || point.intensity || 1), 0);
      totalFlow += frameTotal;

      if (frameTotal > peakData.count) {
        peakData = { time: frame.timestamp, count: frameTotal, index };
      }

      // 時間別データ
      const hour = new Date(frame.timestamp).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + frameTotal;
    });

    const averageFlow = Math.round(totalFlow / timeseriesData.length);

    // 忙しい時間帯の特定
    const busyPeriods: { start: string; end: string; level: string }[] = [];
    const sortedHours = Object.entries(hourlyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    sortedHours.forEach(([hour, count], index) => {
      const level = index === 0 ? '最高' : index === 1 ? '高' : '中';
      busyPeriods.push({
        start: `${hour}:00`,
        end: `${parseInt(hour) + 1}:00`,
        level
      });
    });

    // 人流の多いエリアの特定（現在のフレームから）
    const currentFrame = timeseriesData[currentFrameIndex];
    const topAreas = currentFrame ? 
      currentFrame.points
        .map((point, index) => ({
          lat: point.lat || 0,
          lng: point.lng || 0,
          intensity: point.value || point.intensity || 1,
          rank: index + 1
        }))
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 3) : [];

    // マーケティング推奨事項
    const recommendations: string[] = [];
    const currentHour = new Date(currentFrame?.timestamp || new Date()).getHours();
    
    if (currentHour >= 12 && currentHour <= 14) {
      recommendations.push('🍽️ ランチタイム: 飲食系広告の効果が期待できます');
    }
    if (currentHour >= 7 && currentHour <= 9) {
      recommendations.push('🚊 通勤時間帯: 交通系アプリや朝食商品の訴求が有効です');
    }
    if (currentHour >= 18 && currentHour <= 21) {
      recommendations.push('🌆 夕方: エンターテイメントや夕食関連の広告が効果的です');
    }
    
    const peakHour = new Date(peakData.time).getHours();
    if (currentHour === peakHour) {
      recommendations.push('⭐ ピーク時間: 最大リーチを狙うチャンスです');
    }

    if (averageFlow > 100) {
      recommendations.push('📈 高密度エリア: プレミアム商品の訴求に適しています');
    }

    return {
      peakTime: new Date(peakData.time).toLocaleString('ja-JP', { 
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      peakCount: peakData.count,
      averageFlow,
      busyPeriods,
      topAreas,
      marketingRecommendations: recommendations
    };
  }, [timeseriesData, currentFrameIndex]);

  if (!insights) return null;

  return (
    <div className="marketing-insights">
      <div className="insights-header">
        <h2>📊 マーケティングインサイト</h2>
      </div>

      <div className="insights-grid">
        {/* ピーク情報 */}
        <div className="insight-card peak-info">
          <div className="card-header">
            <span className="icon">⭐</span>
            <h3>ピーク時間</h3>
          </div>
          <div className="card-content">
            <div className="primary-metric">{insights.peakTime}</div>
            <div className="secondary-metric">{insights.peakCount.toLocaleString()}人</div>
          </div>
        </div>

        {/* 忙しい時間帯 */}
        <div className="insight-card busy-periods">
          <div className="card-header">
            <span className="icon">🕒</span>
            <h3>注目時間帯</h3>
          </div>
          <div className="card-content">
            {insights.busyPeriods.slice(0, 2).map((period, index) => (
              <div key={index} className="time-period">
                <span className="time-range">{period.start}-{period.end}</span>
                <span className={`level level-${period.level}`}>{period.level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* マーケティング推奨 */}
        <div className="insight-card recommendations">
          <div className="card-header">
            <span className="icon">💡</span>
            <h3>推奨アクション</h3>
          </div>
          <div className="card-content">
            {insights.marketingRecommendations.slice(0, 2).map((rec, index) => (
              <div key={index} className="recommendation">
                {rec}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingInsights; 