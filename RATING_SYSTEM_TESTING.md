# Rating System - Quick Start & Testing Guide

## Getting Started

### 1. Verify API Routes are Registered
Check that the rating routes are active in your Node.js server:
```bash
# You should see output including:
# POST/GET /api/ratings
# when the server logs its registered routes
```

### 2. Test the Rating Submission Flow

#### Step A: Create a Test Scenario
1. Log in to the application as a regular user
2. Create a help request via "Submit Request"
3. Go to the Admin Dashboard (as admin user)
4. Claim/assign the request to a volunteer
5. Resolve the request (change status to resolved)
6. Log back in as the original user

#### Step B: Submit a Rating
1. Navigate to "My Requests" on UserDashboard
2. Find your resolved request
3. Click the **"Rate Volunteer"** button (green button with star icon)
4. A dialog should open showing:
   - Volunteer name
   - Overall rating selector (1-5 stars)
   - Category ratings (optional):
     - Responsiveness
     - Professionalism
     - Helpfulness
   - Comment field (up to 500 characters)
   - Badge options (if rating is 4 or 5 stars)
   - Privacy toggle (public/private)

#### Step C: Verify Submission
1. Select a rating (e.g., 5 stars)
2. Optionally fill in comment
3. Click "Submit Rating"
4. Should see success message
5. Button changes to "Rated ✓" badge
6. Dialog closes automatically

### 3. View Volunteer Ratings

#### Option A: Via API (Postman/cURL)
```bash
# Get volunteer ratings
GET http://localhost:5000/api/ratings/volunteer/{volunteerId}

# Example response includes:
{
  "success": true,
  "data": {
    "volunteer": {
      "_id": "...",
      "name": "Volunteer Name",
      "ratings": {
        "totalRatings": 1,
        "averageRating": "5.00",
        "badges": ["Highly Helpful", ...]
      }
    },
    "ratings": [
      {
        "rating": 5,
        "comment": "Great help!",
        "categories": {...},
        "badges": [...]
      }
    ]
  }
}
```

#### Option B: Via Frontend Component
Add `VolunteerRatingCard` to any volunteer profile page:
```jsx
import VolunteerRatingCard from '../components/VolunteerRatingCard';

// In your component:
<VolunteerRatingCard volunteerId={volunteerId} />
```

### 4. Test Badge System

#### How Badges are Awarded
Badges auto-award based on rating metrics:
- **Excellent Response** - When responsiveness category avg ≥ 4.7
- **Very Professional** - When professionalism category avg ≥ 4.7
- **Highly Helpful** - When helpfulness category avg ≥ 4.7
- **Trustworthy** - When overall rating ≥ 4.8 AND total ratings ≥ 10

#### To Test Badges
1. Submit multiple ratings for the same volunteer (~5-10)
2. Give high ratings (4-5 stars) in specific categories
3. For "Trustworthy": need 10+ reviews with avg ≥ 4.8
4. Badges should appear automatically after threshold reached

### 5. Test Rate Limiting Features

#### 7-Day Edit Window
```bash
# Update a rating (within 7 days):
PUT http://localhost:5000/api/ratings/{ratingId}
{
  "rating": 4,
  "comment": "Updated comment"
}

# After 7 days, returns error:
# "Can only edit ratings within 7 days of creation"
```

#### Prevent Duplicate Ratings
1. Try submitting 2 ratings for same request
2. Second attempt should return error:
3. "You have already rated this volunteer for this request"

### 6. API Endpoint Testing Checklist

```
✅ POST /api/ratings
   - Submit new rating for resolved request
   - Validates rating 1-5
   - Prevents duplicates
   - Updates volunteer stats

✅ GET /api/ratings/volunteer/:volunteerId
   - Returns paginated reviews
   - Shows volunteer stats
   - Only public reviews (isPublic: true)

✅ GET /api/ratings/:ratingId
   - Returns full rating details
   - Includes populated references

✅ PUT /api/ratings/:ratingId
   - Update rating (within 7 days)
   - Only by rating creator
   - Recalculates volunteer stats

✅ DELETE /api/ratings/:ratingId
   - Delete rating
   - Only by rating creator
   - Recalculates volunteer stats

✅ PUT /api/ratings/:ratingId/helpful
   - Increment helpful count
   - Identifies useful reviews

✅ GET /api/ratings/top-volunteers
   - Returns top volunteers (min 5 ratings)
   - Sorted by avg rating
```

### 7. Frontend Component Testing

#### RatingDialog Component
```jsx
import RatingDialog from '../components/RatingDialog';

<RatingDialog
  open={open}
  onClose={handleClose}
  requestId="req_id"
  volunteerId="vol_id"
  volunteerName="John Doe"
  onSuccess={handleSuccess}
/>
```

**Test Cases:**
- [ ] Dialog opens with volunteer name
- [ ] Star rating selector works
- [ ] Category ratings optional but available
- [ ] Comment field enforces 500 char limit
- [ ] Badges only show when rating ≥ 4
- [ ] Privacy toggle can be toggled
- [ ] Submit button disabled until rating selected
- [ ] Loading spinner shows during submission
- [ ] Success message displays on completion
- [ ] Dialog auto-closes after success

#### VolunteerRatingCard Component
```jsx
import VolunteerRatingCard from '../components/VolunteerRatingCard';

// Compact view (for dashboards)
<VolunteerRatingCard volunteerId={volunteerId} compact={true} />

// Full view (for profile pages)
<VolunteerRatingCard volunteerId={volunteerId} compact={false} />
```

**Test Cases:**
- [ ] Compact view shows star rating and counts
- [ ] Full view shows category breakdown
- [ ] Category bars are color-coded
- [ ] Badges display with icons
- [ ] Reviews dialog opens from compact view
- [ ] Individual reviews show requester name and date
- [ ] Helpful button is functional
- [ ] Loading state shows spinner
- [ ] No ratings state shows proper message
- [ ] Pagination works for large review lists

### 8. Database Verification

#### Check Volunteer Model Updated
```javascript
// In MongoDB shell or tool:
db.volunteers.findOne({ _id: ObjectId("...") })

// Should show:
{
  ...other fields...,
  "ratings": {
    "totalRatings": 1,
    "averageRating": "5.00",
    "categorySums": {
      "responsiveness": 5,
      "professionalism": 5,
      "helpfulness": 5
    },
    "categoryCount": 1,
    "badges": ["Highly Helpful"],
    "mostRecentRating": ISODate("2024-01-15T10:30:00.000Z"),
    "requestsCompleted": 1
  }
}
```

#### Check Rating Documents
```javascript
db.ratings.findOne({})

// Should show:
{
  "_id": ObjectId("..."),
  "requestId": ObjectId("..."),
  "volunteerId": ObjectId("..."),
  "ratedBy": ObjectId("..."),
  "rating": 5,
  "comment": "Great service!",
  "categories": {
    "responsiveness": 5,
    "professionalism": 5,
    "helpfulness": 5
  },
  "badges": ["Highly Helpful"],
  "isPublic": true,
  "helpfulCount": 0,
  "createdAt": ISODate("2024-01-15T10:30:00.000Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

#### Check HelpRequest Update
```javascript
db.helprequests.findOne({ _id: ObjectId("...") })

// Should show:
{
  ...other fields...,
  "isRated": true,
  "ratedAt": ISODate("2024-01-15T10:30:00.000Z")
}
```

### 9. Error Handling Tests

#### Try to Rate Unresolved Request
```bash
POST /api/ratings
{
  "requestId": "...",
  "volunteerId": "...",
  "rating": 5
}
# Should return: "Can only rate completed requests"
```

#### Try to Rate Without Permission
```bash
# Logged in as different user
POST /api/ratings
{
  "requestId": "...",
  "volunteerId": "...",
  "rating": 5
}
# Should return: "Can only rate completed requests" or volunteer not assigned error
```

#### Try Invalid Rating Score
```bash
POST /api/ratings
{
  "requestId": "...",
  "volunteerId": "...",
  "rating": 10  # Invalid
}
# Should return: "Rating must be between 1 and 5"
```

### 10. Performance Checks

```bash
# Get top-rated volunteers (should be fast due to indexes)
GET /api/ratings/top-volunteers?limit=10

# Get volunteer's reviews with pagination
GET /api/ratings/volunteer/{volunteerId}?page=1&limit=10

# Check response times - should be < 500ms for indexed queries
```

---

## Troubleshooting

### Issue: Rating button not appearing
**Solution:** Check that request status is "resolved" and `req.isRated` is false in database

### Issue: Rating dialog won't submit
**Solution:** Ensure all required fields are filled (at minimum, star rating)

### Issue: Volunteer stats not updating
**Solution:** Check that volunteer._id exists in Volunteer collection and has ratings object

### Issue: Badges not showing
**Solution:** 
- For new badges: Need minimum number of ratings (10 for Trustworthy)
- For immediate badges: Ensure category averages meet thresholds (≥4.7)
- Run recalculation by updating a recent rating

### Issue: API returns 404 for ratings routes
**Solution:** Ensure `server/index.js` has:
```javascript
app.use("/api/ratings", require("./routes/ratings"));
```

---

## Success Indicators

✅ All tests passing
✅ Ratings display on volunteer profiles
✅ Badges auto-award correctly
✅ No console errors in browser
✅ Response times < 500ms
✅ Database stores ratings correctly
✅ Volunteer stats update automatically
✅ Privacy settings respected

---

## Next: Enable for Production

Once testing complete:
1. Add rate limiting middleware to rating endpoints
2. Set up background job for cleaning old ratings
3. Configure email notifications (optional)
4. Add admin moderation dashboard
5. Monitor performance metrics
6. Roll out to users gradually
