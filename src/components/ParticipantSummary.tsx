import React, { useState } from 'react';
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
import { BoundingBoxDemographicsResponse } from '../utils/getBoundingBoxDemographics';
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
  boundingBoxData?: BoundingBoxDemographicsResponse | null;
}

const ParticipantSummaryComponent: React.FC<ParticipantSummaryProps> = ({ 
  data, 
  boundingBoxData
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'boundingBox'>('all');

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

  // 境界ボックス人口統計データのグラフ
  const renderBoundingBoxCharts = () => {
    if (!boundingBoxData) return null;

    const { demographics } = boundingBoxData;

    // 性別分布のデータ
    const boundingBoxSexData = {
      labels: Object.keys(demographics.sexDistribution),
      datasets: [
        {
          data: Object.values(demographics.sexDistribution),
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
    const boundingBoxAgeData = {
      labels: Object.keys(demographics.ageGroups),
      datasets: [
        {
          label: '参加者数',
          data: Object.values(demographics.ageGroups),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    // 職業カテゴリのデータ
    const boundingBoxJobData = {
      labels: Object.keys(demographics.jobCategories),
      datasets: [
        {
          label: '参加者数',
          data: Object.values(demographics.jobCategories),
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        },
      ],
    };

    // 住所のデータ
    const boundingBoxAddressData = {
      labels: Object.keys(demographics.address),
      datasets: [
        {
          label: '参加者数',
          data: Object.values(demographics.address),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        },
      ],
    };

    // 交通手段のデータ
    const boundingBoxTransportData = {
      labels: Object.keys(demographics.transportationMethods),
      datasets: [
        {
          data: Object.values(demographics.transportationMethods),
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

    // 婚姻状況のデータ
    const maritalStatusData = {
      labels: Object.keys(demographics.maritalStatus),
      datasets: [
        {
          data: Object.values(demographics.maritalStatus),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    // 個人年収のデータ
    const personalIncomeData = {
      labels: Object.keys(demographics.personalIncome),
      datasets: [
        {
          label: '参加者数',
          data: Object.values(demographics.personalIncome),
          backgroundColor: 'rgba(255, 205, 86, 0.8)',
          borderColor: 'rgba(255, 205, 86, 1)',
          borderWidth: 1,
        },
      ],
    };

    // 世帯年収のデータ
    const householdIncomeData = {
      labels: Object.keys(demographics.householdIncome),
      datasets: [
        {
          label: '参加者数',
          data: Object.values(demographics.householdIncome),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };

    return (
      <>
        <div className="chart-container">
          <h3>性別分布</h3>
          <div className="chart-wrapper">
            <Pie data={boundingBoxSexData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>年齢層別分布</h3>
          <div className="chart-wrapper">
            <Bar data={boundingBoxAgeData} options={barOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>職業カテゴリ</h3>
          <div className="chart-wrapper">
            <Bar data={boundingBoxJobData} options={barOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>住所別分布</h3>
          <div className="chart-wrapper">
            <Bar data={boundingBoxAddressData} options={barOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>婚姻状況</h3>
          <div className="chart-wrapper">
            <Pie data={maritalStatusData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>個人年収</h3>
          <div className="chart-wrapper">
            <Bar data={personalIncomeData} options={barOptions} />
          </div>
        </div>

        <div className="chart-container">
          <h3>世帯年収</h3>
          <div className="chart-wrapper">
            <Bar data={householdIncomeData} options={barOptions} />
          </div>
        </div>
      </>
    );
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
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全範囲 ({data.totalParticipants}人)
          </button>
          {boundingBoxData && (
            <button 
              className={`tab-button ${activeTab === 'boundingBox' ? 'active' : ''}`}
              onClick={() => setActiveTab('boundingBox')}
            >
              表示中 ({boundingBoxData.analysisSummary.totalBoundingBoxUsers}人)
            </button>
          )}
        </div>
      </div>

      <div className="charts-grid">
        {activeTab === 'all' ? (
          <>
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

            <div className="chart-container">
              <h3>交通手段</h3>
              <div className="chart-wrapper">
                <Doughnut data={transportData} options={chartOptions} />
              </div>
            </div>
          </>
        ) : (
          renderBoundingBoxCharts()
        )}
      </div>
    </div>
  );
};

export default ParticipantSummaryComponent; 