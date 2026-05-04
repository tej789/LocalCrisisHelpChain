import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Rating,
  Chip,
  Grid,
  LinearProgress,
  Avatar,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Paper,
  AvatarGroup
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import axios from '../api/axios';

const VolunteerRatingCard = ({ volunteerId, compact = false }) => {
  const [rating, setRating] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);

  useEffect(() => {
    if (volunteerId) {
      fetchRatings();
      return;
    }

    setLoading(false);
  }, [volunteerId]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/ratings/volunteer/${volunteerId}`);
      if (response.data.data) {
        setRating(response.data.data.volunteer);
        setReviews(response.data.data.ratings);
      }
    } catch (err) {
      setError('Failed to load ratings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={40} />
      </Card>
    );
  }

  if (!volunteerId) {
    return (
      <Card sx={{ p: 2 }}>
        <Typography color="textSecondary" variant="body2">
          Rating details are unavailable.
        </Typography>
      </Card>
    );
  }

  if (!rating) {
    return (
      <Card sx={{ p: 2 }}>
        <Typography color="textSecondary" variant="body2">
          No ratings yet
        </Typography>
      </Card>
    );
  }

  const getCategoryPercentage = (category) => {
    const count = rating.ratings?.categoryCount || 0;
    if (count === 0) return 0;
    const sum = rating.ratings?.categorySums?.[category] || 0;
    return Math.round((sum / count) * 100);
  };

  if (compact) {
    return (
      <Paper sx={{ p: 2, cursor: 'pointer' }} onClick={() => setDetailsOpen(true)}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Public Reviews
            </Typography>
            <Rating value={rating.ratings?.averageRating || 0} readOnly size="small" />
            <Typography variant="caption" color="textSecondary">
              {rating.ratings?.totalRatings || 0} reviews • {rating.requestsCompleted || 0} completed
            </Typography>
          </Box>
          {rating.ratings?.badges && rating.ratings.badges.length > 0 && (
            <AvatarGroup max={3}>
              {rating.ratings.badges.map(badge => (
                <Avatar
                  key={badge}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: '#FFB400',
                    fontSize: '0.75rem'
                  }}
                  title={badge}
                >
                  ⭐
                </Avatar>
              ))}
            </AvatarGroup>
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {rating.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {rating.requestsCompleted || 0} requests completed
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Rating
                  value={parseFloat(rating.ratings?.averageRating) || 0}
                  readOnly
                  size="large"
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {rating.ratings?.averageRating || 'N/A'}/5
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Category Ratings */}
          {rating.ratings?.categoryCount > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Category Breakdown
              </Typography>
              {['responsiveness', 'professionalism', 'helpfulness'].map(category => (
                <Box key={category} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                      {category}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {Math.round(getCategoryPercentage(category)) / 20}★
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getCategoryPercentage(category)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: category === 'responsiveness' ? '#FF6B6B' :
                                       category === 'professionalism' ? '#4ECB71' :
                                       '#45B7D1'
                      }
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}

          {/* Badges */}
          {rating.ratings?.badges && rating.ratings.badges.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Earned Badges
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {rating.ratings.badges.map(badge => (
                  <Chip
                    key={badge}
                    label={badge}
                    icon={<EmojiEventsIcon />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Stats */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {rating.ratings?.totalRatings || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Total Ratings
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {rating.requestsCompleted || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Requests Completed
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Reviews Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Reviews for {rating.name}
        </DialogTitle>
        <DialogContent dividers>
          {reviews.length === 0 ? (
            <Typography color="textSecondary" sx={{ py: 3, textAlign: 'center' }}>
              No reviews yet
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {reviews.map(review => (
                <Paper key={review._id} sx={{ p: 2, bgcolor: '#fafafa' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {review.ratedBy?.name || 'Anonymous'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Rating value={review.rating} readOnly size="small" />
                  </Box>

                  {review.comment && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {review.comment}
                    </Typography>
                  )}

                  {review.badges && review.badges.length > 0 && (
                    <Box sx={{ mb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {review.badges.map(badge => (
                        <Chip
                          key={badge}
                          label={badge}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      ))}
                    </Box>
                  )}

                  {review.requestDetails && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #ddd' }}>
                      <Typography variant="caption" color="textSecondary">
                        Request: {review.requestDetails.title}
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                    <Button
                      size="small"
                      startIcon={<ThumbUpIcon />}
                      variant="text"
                      sx={{ textTransform: 'none', fontSize: '0.85rem' }}
                    >
                      Helpful ({review.helpfulCount || 0})
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VolunteerRatingCard;
