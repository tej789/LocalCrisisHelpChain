# SOS Analytics Dashboard Implementation

## Overview

A comprehensive analytics dashboard for tracking SOS emergency alert patterns, response metrics, and effectiveness. Provides admins and NGOs with actionable insights about emergency requests, volunteer response rates, and geographic hotspots.

## Features

### 1. **Summary Cards**
- **All Time SOS**: Total SOS requests ever created + resolution rate
- **This Month**: SOS requests in current month
- **Today**: SOS requests in last 24 hours
- **Avg Response**: Average response time in minutes

### 2. **Volume & Trends Tab**
- **SOS Volume Over Time**: Line chart showing daily SOS counts and resolutions over selected period
- **SOS by Hour of Day**: Bar chart showing peak hours for emergency alerts

### 3. **Urgency & Status Tab**
- **SOS by Urgency Level**: Bar chart breakdown by urgency (low/medium/high)
- **SOS Status Distribution**: Pie chart showing open/assigned/resolved percentages
- **Notification Effectiveness**: Conversion rate from SOS notifications to resolved requests

### 4. **Volunteers Tab**
- **Top Responding Volunteers**: Bar chart of volunteer response counts
- **Detailed Volunteer Table**: 
  - Total responses
  - Resolved count
  - Resolution rate %
  - Average response time

### 5. **Geographic Tab**
- **SOS Hotspots**: Top 20 locations with SOS activity
- Shows: Location address, total SOS, resolved count, coordinates
- Useful for identifying crisis zones and resource allocation

### 6. **Response Metrics Tab**
- **Response Time by Urgency**: Comparative bar chart (avg/min/max)
- **Detailed Metrics Table**: Response times broken down by urgency level

## Technical Architecture

### Backend Endpoints

All endpoints require authentication (`verifyToken`) and admin/ngo role.

```
GET  /api/analytics/sos/summary                    - Dashboard summary stats
GET  /api/analytics/sos/volume?days=7              - Volume over time
GET  /api/analytics/sos/urgency                    - By urgency level
GET  /api/analytics/sos/status                     - Status distribution
GET  /api/analytics/sos/volunteers-top?limit=10    - Top volunteers
GET  /api/analytics/sos/hotspots                   - Geographic hotspots
GET  /api/analytics/sos/peak-hours                 - Peak hours analysis
GET  /api/analytics/sos/response-time              - Response time metrics
GET  /api/analytics/sos/notification-effectiveness - Notification conversion
```

### Database Aggregation Queries

All analytics use MongoDB aggregation pipeline for efficient computation:

- **$group**: Aggregate by date, urgency, status, location, hour
- **$match**: Filter for rescue-type requests and date ranges
- **$lookup**: Join with Volunteer collection for volunteer details
- **$project**: Calculate derived metrics (response time, conversion rate)
- **$sort**: Order by most relevant metric (count, date, etc.)

### Frontend Components

**AnalyticsDashboard.js**
- Main dashboard container with tabbed interface
- Data fetching with parallel Promise.all() for performance
- Tab-based organization for different analytic views
- Material-UI components for styling and responsiveness
- Recharts for all visualizations (Line, Bar, Pie charts)

**Sidebar.js** (updated)
- Added "📊 SOS Analytics" navigation link
- Accessible from admin dashboard

## User Flow

1. **Access**: Admin/NGO users click "SOS Analytics" in sidebar
2. **Authentication**: Route checks user role and redirects if unauthorized
3. **Data Loading**: Dashboard fetches all analytics data in parallel
4. **Display**: Shows summary cards, then tabs for detailed breakdowns
5. **Filtering**: Users can adjust date range to analyze different periods

## Key Metrics

### Summary Statistics
- **Total SOS Requests**: Lifetime count
- **Resolution Rate**: % of SOS that was resolved
- **Monthly Volume**: Trend indicator
- **Today's Activity**: Real-time emergency rate
- **Average Response Time**: How quickly volunteers respond

### Performance Indicators
- **Volunteer Response Rate**: % of alerts that converted to response
- **Hotspot Density**: Concentration of SOS in specific areas
- **Peak Hour Analysis**: When emergencies most commonly occur
- **Urgency Distribution**: What % of SOS are high urgency

### Volunteer Metrics
- **Total Responses**: How many SOS each volunteer responded to
- **Resolution Rate**: % of assigned tasks successfully completed
- **Response Time**: Average duration to respond to alerts
- **Ranking**: Top performing volunteers by various metrics

## Data Visualization Library

**Recharts** (already installed)
- Lightweight charting library optimized for React
- Responsive charts that adapt to container size
- Interactive tooltips on hover
- Legend for multi-series data
- No external dependencies

Chart types used:
- **LineChart**: Time series volume trends
- **BarChart**: Categorical comparisons (urgency, hours, response time)
- **PieChart**: Status distribution percentages
- **RadarChart**: (ready for expansion) Multi-dimensional volunteer metrics

## Access Control

Route-based role protection:
```
/admin/analytics → [admin, ngo] roles required
```

API endpoint protection:
```
Middleware: verifyToken + requireRole(['admin', 'ngo'])
```

## Performance Optimizations

1. **Parallel Data Fetching**: All 9 analytics endpoints called simultaneously
2. **Aggregation Pipeline**: Heavy lifting done in MongoDB, not JavaScript
3. **Indexed Queries**: 
   - `createdAt` indexed for date range queries
   - `status` indexed for status filtering
   - `type` indexed for request type filtering
4. **Lazy Loading**: Tab-based design loads visible charts first
5. **Responsive Tables**: Scrollable instead of paginated for large datasets

## Sample API Responses

### Summary
```json
{
  "allTime": {
    "total": 145,
    "resolved": 128,
    "resolutionRate": "88.28"
  },
  "today": 5,
  "thisMonth": 42,
  "avgResponseTimeMin": 12,
  "activeVolunteersResponding": 8
}
```

### Volume
```json
{
  "period": "Last 7 days",
  "data": [
    { "_id": "2026-05-03", "count": 8, "resolved": 7 },
    { "_id": "2026-05-02", "count": 6, "resolved": 5 }
  ],
  "total": 14,
  "resolvedTotal": 12
}
```

### Top Volunteers
```json
[
  {
    "volunteerId": "507...",
    "name": "John Smith",
    "totalResponses": 23,
    "resolved": 22,
    "resolutionRate": "95.65",
    "avgResponseTimeMs": 180000
  }
]
```

## Future Enhancements

1. **Real-time Charts**: WebSocket updates for live dashboard
2. **Export Functionality**: Download reports as CSV/PDF
3. **Custom Date Ranges**: Currently supports 7/14/30/90 days
4. **Volunteer Scheduling**: Predict needed volunteers by hour
5. **Alert Effectiveness**: Which messages lead to fastest responses
6. **Cost Analysis**: Calculate cost per resolved SOS
7. **Map View**: Geospatial visualization of hotspots
8. **Mobile Dashboard**: Responsive design for mobile viewing
9. **Alerts & Thresholds**: Notify admin if response time exceeds target
10. **Historical Comparisons**: Week-over-week, month-over-month trends

## Installation & Usage

For developers:

```bash
# Backend
npm install  # (recharts already in client package.json)
npm start    # Server must be running

# Frontend  
cd client
npm install  # (recharts already included)
npm start    # Visit http://localhost:3000/admin/analytics

# Test with admin account
# Access: /admin/analytics (requires admin or ngo role)
```

## Troubleshooting

**Analytics page shows "Access Denied"**
- Verify user role is 'admin' or 'ngo'
- Check token validity in localStorage
- Confirm JWT contains correct role

**Charts not rendering**
- Verify recharts is installed: `npm list recharts`
- Check browser console for errors
- Ensure HelpRequest.type === 'rescue' for data to appear

**No data showing in charts**
- Check if any SOS requests exist in database: `db.helprequests.count({type: "rescue"})`
- Verify date range includes data: Expand to "Last 90 days"
- Check API response status in Network tab

**Slow dashboard load**
- Reduce date range (fewer aggregations)
- Check MongoDB indexes are created
- Monitor server resource usage

## API Testing

Using curl or Postman:

```bash
# Get summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/analytics/sos/summary

# Get 7-day volume
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/analytics/sos/volume?days=7

# Get top 5 volunteers
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/analytics/sos/volunteers-top?limit=5
```

## Database Indexes Required

Already defined in HelpRequest model:
```javascript
HelpRequestSchema.index({ location: '2dsphere' });
HelpRequestSchema.index({ status: 1 });
HelpRequestSchema.index({ urgency: 1 });
HelpRequestSchema.index({ type: 1 });
HelpRequestSchema.index({ createdAt: -1 });
```

## Monitoring & Logging

Check server logs for:
- Aggregation pipeline errors
- MongoDB connection issues
- Authorization failures (403)
- Database query performance

## Support & Contribution

For issues or improvements:
1. Check dashboard logs (browser console)
2. Verify data exists in database
3. Test API endpoints directly
4. Review MongoDB aggregation output
