import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Stack,
  Tab,
  Tabs
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#ff7300', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#82CA9D'];

const SummaryCard = ({ label, value, color }) => (
  <Paper
    sx={{
      p: 2.5,
      textAlign: 'center',
      borderRadius: 2,
      minWidth: 120,
      minHeight: 95,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12)',
        transform: 'translateY(-2px)',
      },
    }}
  >
    <Typography
      variant="h5"
      sx={{ fontWeight: 700, lineHeight: 1.2 }}
      color={color || 'text.primary'}
    >
      {value}
    </Typography>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 0.75, fontWeight: 500 }}
    >
      {label}
    </Typography>
  </Paper>
);

const SurfacePaper = ({ children, sx = {} }) => (
  <Paper
    sx={{
      p: 3,
      borderRadius: 3,
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
      border: '1px solid rgba(148, 163, 184, 0.18)',
      background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
      ...sx,
    }}
  >
    {children}
  </Paper>
);

const TablePaper = ({ children }) => (
  <SurfacePaper sx={{ p: 0, overflow: 'hidden' }}>{children}</SurfacePaper>
);

const tableHeaderStyle = {
  backgroundColor: '#f8fafc',
  color: '#334155',
  fontWeight: 700,
  letterSpacing: 0.2,
};

const tableCellStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0',
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [days, setDays] = useState(7);

  // Data states
  const [summary, setSummary] = useState(null);
  const [sosVolume, setSosVolume] = useState([]);
  const [sosByUrgency, setSosByUrgency] = useState([]);
  const [sosStatus, setSosStatus] = useState([]);
  const [topVolunteers, setTopVolunteers] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [responseTime, setResponseTime] = useState([]);
  const [notificationEffectiveness, setNotificationEffectiveness] = useState(null);

  // Fetch all analytics data
  useEffect(() => {
    if (user?.role?.toLowerCase() !== 'admin' && user?.role?.toLowerCase() !== 'ngo') {
      setError('Access denied. Admin or NGO role required.');
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const baseUrl = process.env.REACT_APP_API_URL;

        const [
          summaryRes,
          volumeRes,
          urgencyRes,
          statusRes,
          volunteersRes,
          hotspotsRes,
          peakHoursRes,
          responseTimeRes,
          effectivenessRes
        ] = await Promise.all([
          axios.get(`${baseUrl}/api/analytics/sos/summary`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/volume?days=${days}`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/urgency`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/status`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/volunteers-top`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/hotspots`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/peak-hours`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/response-time`, { headers }),
          axios.get(`${baseUrl}/api/analytics/sos/notification-effectiveness`, { headers })
        ]);

        setSummary(summaryRes.data);
        setSosVolume(volumeRes.data.data || []);
        setSosByUrgency(urgencyRes.data || []);
        setSosStatus(statusRes.data.data || []);
        setTopVolunteers(volunteersRes.data || []);
        setHotspots(hotspotsRes.data || []);
        setPeakHours(peakHoursRes.data || []);
        setResponseTime(responseTimeRes.data || []);
        setNotificationEffectiveness(effectivenessRes.data);

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setError(err.response?.data?.error || 'Failed to load analytics data');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, days]);

  if (!user || (user.role?.toLowerCase() !== 'admin' && user.role?.toLowerCase() !== 'ngo')) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Access Denied. Admin or NGO role required.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, mb: 1 }}>
        SOS Analytics Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Monitor SOS demand, response patterns, and volunteer effectiveness.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      {summary && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
              SOS Overview
            </Typography>
          </Box>

          <Grid container spacing={2} sx={{ mb: 4 }} justifyContent="center">
            <Grid item xs={6} sm={4} md={3}>
              <SummaryCard
                label="All Time SOS"
                value={summary.allTime.total}
                color="primary.main"
              />
            </Grid>

            <Grid item xs={6} sm={4} md={3}>
              <SummaryCard
                label="This Month"
                value={summary.thisMonth}
                color="secondary.main"
              />
            </Grid>

            <Grid item xs={6} sm={4} md={3}>
              <SummaryCard
                label="Today"
                value={summary.today}
                color="info.main"
              />
            </Grid>

            <Grid item xs={6} sm={4} md={3}>
              <SummaryCard
                label="Avg Response"
                value={summary.avgResponseTimeMin}
                color="success.main"
              />
            </Grid>
          </Grid>
          </>
      )}

      {/* Tabs for different views */}
      <Box sx={{ mb: 3 }}>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            px: 1,
            py: 0.5,
            bgcolor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 700,
                color: 'text.secondary',
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: 999,
              },
            }}
          >
            <Tab label="Volume & Trends" />
            <Tab label="Urgency & Status" />
            <Tab label="Volunteers" />
            <Tab label="Geographic" />
            <Tab label="Response Metrics" />
          </Tabs>
        </Paper>
      </Box>

      {/* Date range selector */}
      <Box sx={{ mb: 3 }}>
        <TextField
          select
          label="Days"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          sx={{ width: 150 }}
          SelectProps={{
            native: true,
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </TextField>
      </Box>

      {/* Tab 1: Volume & Trends */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                SOS Volume Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Daily emergency traffic and resolution trend for the selected period.
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={sosVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} name="Total SOS" />
                  <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>

          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                SOS by Hour of Day
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Identify the busiest hours so support can be staffed ahead of spikes.
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Hour of Day', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} name="Total" />
                  <Bar dataKey="resolved" fill="#16a34a" radius={[8, 8, 0, 0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Urgency & Status */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                SOS by Urgency Level
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Distribution of emergency severity and how quickly each severity is resolved.
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={sosByUrgency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} name="Total" />
                  <Bar dataKey="resolved" fill="#10b981" radius={[8, 8, 0, 0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>

          <Grid item xs={12} md={6}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                SOS Status Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Open, assigned, and resolved states across all SOS requests.
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={sosStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {sosStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>

          {notificationEffectiveness && (
            <Grid item xs={12}>
              <SurfacePaper>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Notification Effectiveness
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  How often SOS alerts move into active handling and resolution.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">SOS Notifications Sent</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{notificationEffectiveness.totalSosNotifications}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Converted to Resolved</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>{notificationEffectiveness.convertedToResolved}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Effectiveness Rate</Typography>
                    <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 700 }}>
                      {notificationEffectiveness.effectivenessRate}%
                    </Typography>
                  </Box>
                </Stack>
              </SurfacePaper>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Tab 3: Volunteers */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Top Responding Volunteers
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ranking by total SOS responses and resolution performance.
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topVolunteers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalResponses" fill="#2563eb" radius={[8, 8, 0, 0]} name="Total Responses" />
                  <Bar dataKey="resolved" fill="#16a34a" radius={[8, 8, 0, 0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>

          <Grid item xs={12}>
            <TablePaper>
              <Box sx={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={tableHeaderStyle}>Name</th>
                    <th style={tableHeaderStyle}>Responses</th>
                    <th style={tableHeaderStyle}>Resolved</th>
                    <th style={tableHeaderStyle}>Resolution Rate</th>
                    <th style={tableHeaderStyle}>Avg Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topVolunteers.map((vol, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tableCellStyle}>{vol.name}</td>
                      <td style={tableCellStyle}>{vol.totalResponses}</td>
                      <td style={tableCellStyle}>{vol.resolved}</td>
                      <td style={tableCellStyle}>{vol.resolutionRate}%</td>
                      <td style={tableCellStyle}>{Math.round(vol.avgResponseTimeMs / 1000 / 60)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </Box>
            </TablePaper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: Geographic */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                SOS Hotspots (Top 20 Locations)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Frequent emergency zones and their resolution patterns.
              </Typography>
              <Box sx={{ overflow: 'auto', maxHeight: 500 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={tableHeaderStyle}>Location</th>
                      <th style={tableHeaderStyle}>Total SOS</th>
                      <th style={tableHeaderStyle}>Resolved</th>
                      <th style={tableHeaderStyle}>Latitude</th>
                      <th style={tableHeaderStyle}>Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotspots.map((spot, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tableCellStyle}>{spot._id?.address || 'Unknown'}</td>
                        <td style={tableCellStyle}>{spot.count}</td>
                        <td style={tableCellStyle}>{spot.resolved}</td>
                        <td style={tableCellStyle}>{spot.lat?.toFixed(4)}</td>
                        <td style={tableCellStyle}>{spot.lon?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </SurfacePaper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 5: Response Metrics */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Average Response Time by Urgency
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Compare how quickly different urgency levels are handled.
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={responseTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="urgency" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `${value} min`} />
                  <Legend />
                  <Bar dataKey="avgResponseTimeMin" fill="#2563eb" radius={[8, 8, 0, 0]} name="Avg Response" />
                  <Bar dataKey="minResponseTimeMin" fill="#16a34a" radius={[8, 8, 0, 0]} name="Min Response" />
                  <Bar dataKey="maxResponseTimeMin" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Max Response" />
                </BarChart>
              </ResponsiveContainer>
            </SurfacePaper>
          </Grid>

          <Grid item xs={12}>
            <SurfacePaper>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Response Metrics by Urgency
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Operational detail for response speed and workload by urgency.
              </Typography>
              <Box sx={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={tableHeaderStyle}>Urgency</th>
                      <th style={tableHeaderStyle}>Avg Response (min)</th>
                      <th style={tableHeaderStyle}>Min Response (min)</th>
                      <th style={tableHeaderStyle}>Max Response (min)</th>
                      <th style={tableHeaderStyle}>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responseTime.map((metric, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ ...tableCellStyle, fontWeight: 600 }}>{metric.urgency}</td>
                        <td style={tableCellStyle}>{metric.avgResponseTimeMin}</td>
                        <td style={tableCellStyle}>{metric.minResponseTimeMin}</td>
                        <td style={tableCellStyle}>{metric.maxResponseTimeMin}</td>
                        <td style={tableCellStyle}>{metric.resolvedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </SurfacePaper>
          </Grid>
        </Grid>
      </TabPanel>
    </Container>
  );
}
