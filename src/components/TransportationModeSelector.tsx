import React from 'react';
import {
  Box,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import {
  DirectionsWalk,
  DirectionsBike,
  DirectionsCar
} from '@mui/icons-material';

// 交通手段の定義
export interface TransportationMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  activityTypes: string[];
}

const TRANSPORTATION_MODES: TransportationMode[] = [
  {
    id: 'walking',
    name: '歩行者',
    icon: <DirectionsWalk />,
    color: '#4CAF50',
    activityTypes: ['on_foot', 'walking', 'running', 'still'],
  },
  {
    id: 'cycling',
    name: '自転車',
    icon: <DirectionsBike />,
    color: '#FF9800',
    activityTypes: ['on_bicycle'],
  },
  {
    id: 'vehicle',
    name: '車両',
    icon: <DirectionsCar />,
    color: '#2196F3',
    activityTypes: ['in_vehicle'],
  }
];

interface TransportationModeSelectorProps {
  selectedMode: string;
  onModeChange: (mode: string, activityTypes: string[]) => void;
}

const TransportationModeSelector: React.FC<TransportationModeSelectorProps> = ({
  selectedMode,
  onModeChange
}) => {
  const handleModeToggle = (event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode !== null) {
      const mode = TRANSPORTATION_MODES.find(m => m.id === newMode);
      if (mode) {
        onModeChange(newMode, mode.activityTypes);
      }
    }
  };

  return (
    <Card sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
      <CardContent>
        <Typography variant="h6" component="h3" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
          🚶‍♂️ 交通手段選択
        </Typography>


        <ToggleButtonGroup
          value={selectedMode}
          exclusive
          onChange={handleModeToggle}
          aria-label="交通手段選択"
          sx={{ width: '100%', mb: 2 }}
        >
          {TRANSPORTATION_MODES.map((mode) => (
            <ToggleButton
              key={mode.id}
              value={mode.id}
              sx={{
                flex: 1,
                flexDirection: 'column',
                gap: 1,
                py: 2,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                '&.Mui-selected': {
                  bgcolor: mode.color,
                  color: 'white',
                  '&:hover': {
                    bgcolor: mode.color,
                    opacity: 0.8
                  }
                },
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <Box sx={{ color: selectedMode === mode.id ? 'white' : mode.color }}>
                {mode.icon}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {mode.name}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* 選択状況の表示 */}
        <Box display="flex" alignItems="center" justifyContent="center">
          {selectedMode && (
            <Chip
              label={TRANSPORTATION_MODES.find(m => m.id === selectedMode)?.name || ''}
              size="small"
              sx={{
                bgcolor: TRANSPORTATION_MODES.find(m => m.id === selectedMode)?.color || '#ccc',
                color: 'white',
                fontWeight: 600
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransportationModeSelector; 