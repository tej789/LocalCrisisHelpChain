/**
 * Volunteer Skills Configuration
 * Icons and colors for different skill categories
 */

import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EmergencyShareIcon from '@mui/icons-material/EmergencyShare';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import StorageIcon from '@mui/icons-material/Storage';

export const SKILL_OPTIONS = [
  {
    id: 'medical',
    label: '🏥 Medical',
    icon: LocalHospitalIcon,
    color: '#d32f2f',
    bgColor: '#ffebee'
  },
  {
    id: 'rescue',
    label: '🚨 Rescue',
    icon: DirectionsRunIcon,
    color: '#f57c00',
    bgColor: '#fff3e0'
  },
  {
    id: 'food',
    label: '🍽️ Food & Water',
    icon: RestaurantIcon,
    color: '#388e3c',
    bgColor: '#e8f5e9'
  },
  {
    id: 'shelter',
    label: '🏠 Shelter',
    icon: HomeIcon,
    color: '#7b1fa2',
    bgColor: '#f3e5f5'
  },
  {
    id: 'transport',
    label: '🚗 Transport',
    icon: DirectionsCarIcon,
    color: '#0288d1',
    bgColor: '#e1f5fe'
  },
  {
    id: 'first-aid',
    label: '🚑 First Aid',
    icon: EmergencyShareIcon,
    color: '#c2185b',
    bgColor: '#fce4ec'
  },
  {
    id: 'counseling',
    label: '💬 Counseling',
    icon: ChatBubbleOutlineIcon,
    color: '#1976d2',
    bgColor: '#e3f2fd'
  },
  {
    id: 'logistics',
    label: '📦 Logistics',
    icon: StorageIcon,
    color: '#455a64',
    bgColor: '#eceff1'
  }
];

export const getSkillConfig = (skillId) => {
  return SKILL_OPTIONS.find(s => s.id === skillId) || SKILL_OPTIONS[0];
};

export const getSkillsByIds = (skillIds) => {
  if (!Array.isArray(skillIds)) return [];
  return skillIds
    .map(id => getSkillConfig(id))
    .filter(Boolean);
};
