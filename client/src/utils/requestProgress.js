const STATUS_META = {
  open: {
    label: 'Open',
    color: 'warning',
    shortLabel: 'Open',
    description: 'Request has been submitted and is waiting for a responder.'
  },
  assigned: {
    label: 'Assigned',
    color: 'info',
    shortLabel: 'Assigned',
    description: 'A volunteer has been assigned and can begin responding.'
  },
  resolved: {
    label: 'Resolved',
    color: 'success',
    shortLabel: 'Resolved',
    description: 'The request has been completed and closed.'
  }
};

const STATUS_ORDER = ['open', 'assigned', 'resolved'];

const toTimestamp = (value) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export const getRequestStatusMeta = (status) => STATUS_META[status] || {
  label: status || 'Unknown',
  color: 'default',
  shortLabel: status || 'Unknown',
  description: 'Status update'
};

export const formatRequestTimestamp = (value) => {
  const timestamp = toTimestamp(value);
  if (!timestamp) return 'Time unavailable';
  return new Date(timestamp).toLocaleString();
};

const buildFallbackTimeline = (request) => {
  const steps = [];

  if (request?.createdAt) {
    steps.push({
      status: 'open',
      source: 'user',
      actorName: request?.name || 'Requester',
      note: 'Request created',
      timestamp: request.createdAt
    });
  }

  if (request?.assignedAt) {
    steps.push({
      status: 'assigned',
      source: 'system',
      actorName: request?.assignedTo?.name || 'Volunteer',
      note: 'Volunteer assigned',
      timestamp: request.assignedAt
    });
  }

  if (request?.status === 'resolved') {
    steps.push({
      status: 'resolved',
      source: 'system',
      actorName: request?.handledBy?.name || request?.assignedTo?.name || 'Volunteer',
      note: 'Request resolved',
      timestamp: request?.updatedAt || request?.assignedAt || request?.createdAt
    });
  }

  return steps;
};

export const getRequestTimeline = (request) => {
  const history = Array.isArray(request?.statusHistory) && request.statusHistory.length > 0
    ? request.statusHistory
        .map((entry) => ({
          status: entry.status,
          source: entry.source || 'system',
          actorName: entry.actorName || '',
          note: entry.note || '',
          timestamp: entry.timestamp || entry.createdAt || request?.updatedAt || request?.createdAt
        }))
        .filter((entry) => STATUS_ORDER.includes(entry.status))
    : buildFallbackTimeline(request);

  const normalized = history
    .map((entry) => ({
      ...entry,
      sortTimestamp: toTimestamp(entry.timestamp) || 0
    }))
    .sort((left, right) => left.sortTimestamp - right.sortTimestamp);

  return normalized;
};

export const getLatestRequestActivity = (request) => {
  const timeline = getRequestTimeline(request);
  if (timeline.length > 0) {
    return timeline[timeline.length - 1];
  }

  return {
    status: request?.status || 'open',
    source: 'system',
    actorName: '',
    note: '',
    timestamp: request?.updatedAt || request?.createdAt || null,
    sortTimestamp: toTimestamp(request?.updatedAt || request?.createdAt) || 0
  };
};

export const getRequestProgress = (request) => {
  const timeline = getRequestTimeline(request);
  const latestStatus = request?.status || 'open';
  const currentIndex = Math.max(0, STATUS_ORDER.indexOf(latestStatus));
  const percent = STATUS_ORDER.length > 1 ? Math.round((currentIndex / (STATUS_ORDER.length - 1)) * 100) : 100;

  return {
    timeline,
    latestStatus,
    progressPercent: percent,
    currentMeta: getRequestStatusMeta(latestStatus)
  };
};
