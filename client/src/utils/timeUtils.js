/**
 * Calculate elapsed time since request creation
 * @param {string} createdAt - ISO timestamp of request creation
 * @returns {object} { text, color, icon, minutesElapsed }
 */
export const getTimePendingInfo = (createdAt) => {
  if (!createdAt) return { text: 'Unknown', color: 'default', icon: '⏱️', minutesElapsed: 0 };

  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let text = '';
  let icon = '';
  let color = 'success'; // green

  if (diffMins < 1) {
    text = 'Just now';
    icon = '⏰';
    color = 'success';
  } else if (diffMins < 30) {
    text = `${diffMins} min${diffMins !== 1 ? 's' : ''} pending`;
    icon = '🕐';
    color = 'success';
  } else if (diffMins < 60) {
    text = `${diffMins} mins pending`;
    icon = '⏰';
    color = 'warning';
  } else if (diffHours < 2) {
    text = `${diffHours}h ${diffMins % 60}m pending`;
    icon = '⏱️';
    color = 'warning';
  } else if (diffHours < 24) {
    text = `${diffHours}h ${diffMins % 60}m pending`;
    icon = '🔴';
    color = 'error';
  } else {
    text = `${diffDays}d ${diffHours % 24}h pending`;
    icon = '🔴';
    color = 'error';
  }

  return { text, color, icon, minutesElapsed: diffMins };
};

/**
 * Format time with icon and severity
 * @param {string} createdAt - ISO timestamp
 * @returns {object} Complete time display info
 */
export const formatPendingTime = (createdAt) => {
  const info = getTimePendingInfo(createdAt);
  
  return {
    ...info,
    displayText: `${info.icon} ${info.text}`,
    severity: info.color === 'success' ? 'low' : info.color === 'warning' ? 'medium' : 'high',
    colorMap: {
      success: '#2e7d32', // green
      warning: '#f57c00', // orange/yellow
      error: '#d32f2f'    // red
    }
  };
};
