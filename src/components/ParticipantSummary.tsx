import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { ParticipantSummary } from '../types/heatmap';
import './ParticipantSummary.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ParticipantSummaryProps {
  data: ParticipantSummary;
}

const ParticipantSummaryComponent: React.FC<ParticipantSummaryProps> = ({ data }) => {
  // 性別分布のデータ
  const sexData = {
    labels: Object.keys(data.demographics.sexDistribution),
    datasets: [
      {
        data: Object.values(data.demographics.sexDistribution),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // 年齢層のデータ
  const ageData = {
    labels: Object.keys(data.demographics.ageGroups),
    datasets: [
      {
        label: '参加者数',
        data: Object.values(data.demographics.ageGroups),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  // 職業カテゴリのデータ（上位10件のみ表示）
  const jobEntries = Object.entries(data.demographics.jobCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  const jobData = {
    labels: jobEntries.map(([key]) => key),
    datasets: [
      {
        label: '参加者数',
        data: jobEntries.map(([, value]) => value),
        backgroundColor: 'rgba(255, 159, 64, 0.8)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };


  // 都道府県のデータ（上位10件のみ表示）
  const addressEntries = Object.entries(data.demographics.address)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10);
  
  const addressData = {
    labels: addressEntries.map(([key]) => key),
    datasets: [
      {
        label: '参加者数',
        data: addressEntries.map(([, value]) => value),
        backgroundColor: 'rgba(153, 102, 255, 0.8)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  // 交通手段のデータ
  const transportData = {
    labels: Object.keys(data.demographics.transportationMethods),
    datasets: [
      {
        data: Object.values(data.demographics.transportationMethods),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="participant-summary">
      <div className="summary-header">
        <h2>参加者サマリー</h2>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">総参加者数</span>
            <span className="stat-value">{data.totalParticipants}人</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">分析期間</span>
            <span className="stat-value">
              {new Date(data.analysisStartTime).toLocaleString("ja-JP", {
                dateStyle: "short",
                timeStyle: "short",
                hour12: false,
              })}
              -
              {new Date(data.analysisEndTime).toLocaleString("ja-JP", {
                dateStyle: "short",
                timeStyle: "short",
                hour12: false,
              })}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">分析範囲</span>
            <span className="stat-value">{data.radiusMeters}m</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>性別分布</h3>
          <div className="chart-wrapper">
            <Pie data={sexData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>年齢層別分布</h3>
          <div className="chart-wrapper">
            <Bar data={ageData} options={barOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>職業カテゴリ（上位10件）</h3>
          <div className="chart-wrapper">
            <Bar data={jobData} options={barOptions} />
          </div>
        </div>


        <div className="chart-container">
          <h3>都道府県別分布（上位10件）</h3>
          <div className="chart-wrapper">
            <Bar data={addressData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantSummaryComponent; 