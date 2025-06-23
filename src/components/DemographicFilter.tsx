import React, { useState } from 'react';
import './DemographicFilter.css';
import { DemographicFilters } from '../types/demographicData';

// フィルターオプションの定義
const genderOptions = ['男性', '女性'];

const ageOptions = [
  '20代以下',
  '30代', 
  '40代',
  '50代',
  '60代',
  '70代以上'
];

const occupationOptions = [
  '学生（大学生・大学院生）',
  'パート・アルバイト',
  '学生（高校生以下）',
  '会社員（正社員）',
  '会社員（契約社員・派遣社員）',
  '無職',
  '医療関係者',
  '定年退職',
  '専業主婦・専業主夫',
  '公務員（教職員除く）',
  '会社役員・経営者',
  '自営業・自由業'
];

const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

const incomeOptions = [
  '不明',
  '100万円未満',
  '100~200万円未満',
  '200~300万円未満',
  '300~400万円未満',
  '400~500万円未満',
  '500~600万円未満',
  '600~700万円未満',
  '700~800万円未満',
  '800~900万円未満',
  '900~1000万円未満',
  '1000万円以上'
];



interface DemographicFilterProps {
  onFiltersChange: (filters: DemographicFilters) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}

const DemographicFilter: React.FC<DemographicFilterProps> = ({
  onFiltersChange,
  onApplyFilters,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<DemographicFilters>({
    gender: [],
    age: [],
    occupation: [],
    prefecture: [],
    income: []
  });

  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    gender: true,
    age: true,
    occupation: false,
    prefecture: false,
    income: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (category: keyof DemographicFilters, value: string, checked: boolean) => {
    const newFilters = {
      ...filters,
      [category]: checked 
        ? [...filters[category], value]
        : filters[category].filter(item => item !== value)
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      gender: [],
      age: [],
      occupation: [],
      prefecture: [],
      income: []
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getSelectedCount = () => {
    return Object.values(filters).reduce((total, arr) => total + arr.length, 0);
  };

  return (
    <div className="demographic-filter">
      <div className="filter-header">
        <h3>🎯 属性フィルター</h3>
        <div className="filter-actions">
          {getSelectedCount() > 0 && (
            <button 
              className="clear-filters-btn"
              onClick={clearAllFilters}
              disabled={isLoading}
            >
              クリア ({getSelectedCount()})
            </button>
          )}
          <button 
            className="apply-filters-btn"
            onClick={onApplyFilters}
            disabled={isLoading || getSelectedCount() === 0}
          >
            {isLoading ? '検索中...' : '検索'}
          </button>
        </div>
      </div>

      {/* 性別 */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('gender')}
        >
          <span>👥 性別</span>
          <span className={`chevron ${expandedSections.gender ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.gender && (
          <div className="filter-options">
            <div className="filter-grid">
              {genderOptions.map(option => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.gender.includes(option)}
                    onChange={(e) => handleFilterChange('gender', option, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 年齢 */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('age')}
        >
          <span>📅 年齢</span>
          <span className={`chevron ${expandedSections.age ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.age && (
          <div className="filter-options">
            <div className="filter-grid">
              {ageOptions.map(option => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.age.includes(option)}
                    onChange={(e) => handleFilterChange('age', option, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 職業 */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('occupation')}
        >
          <span>💼 職業</span>
          <span className={`chevron ${expandedSections.occupation ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.occupation && (
          <div className="filter-options">
            <div className="filter-grid single-column">
              {occupationOptions.map(option => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.occupation.includes(option)}
                    onChange={(e) => handleFilterChange('occupation', option, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 居住地域 */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('prefecture')}
        >
          <span>🗾 居住地域</span>
          <span className={`chevron ${expandedSections.prefecture ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.prefecture && (
          <div className="filter-options">
            <div className="prefecture-grid">
              {prefectures.map(prefecture => (
                <label key={prefecture} className="filter-option prefecture-option">
                  <input
                    type="checkbox"
                    checked={filters.prefecture.includes(prefecture)}
                    onChange={(e) => handleFilterChange('prefecture', prefecture, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {prefecture}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 世帯年収 */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('income')}
        >
          <span>💰 世帯年収</span>
          <span className={`chevron ${expandedSections.income ? 'expanded' : ''}`}>▼</span>
        </div>
        {expandedSections.income && (
          <div className="filter-options">
            <div className="filter-grid single-column">
              {incomeOptions.map(option => (
                <label key={option} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.income.includes(option)}
                    onChange={(e) => handleFilterChange('income', option, e.target.checked)}
                    disabled={isLoading}
                  />
                  <span className="checkmark"></span>
                  {option}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemographicFilter; 