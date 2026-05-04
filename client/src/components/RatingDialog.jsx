import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Rating,
  TextField,
  Typography,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import axios from '../api/axios';

const RatingDialog = ({ open, onClose, requestId, volunteerId, volunteerName, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(-1);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    responsiveness: 0,
    professionalism: 0,
    helpfulness: 0
  });
  const [badges, setBadges] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const labels = {
    0: 'No rating',
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  const categoryLabels = {
    responsiveness: 'How quickly did the volunteer respond?',
    professionalism: 'How professional was their conduct?',
    helpfulness: 'How helpful were they in resolving the issue?'
  };

  const availableBadges = [
    'Excellent Response',
    'Very Professional',
    'Highly Helpful',
    'Trustworthy'
  ];

  const handleBadgeToggle = (badge) => {
    setBadges(prev =>
      prev.includes(badge)
        ? prev.filter(b => b !== badge)
        : [...prev, badge]
    );
  };

  const handleCategoryChange = (category, value) => {
    setCategories(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post('/api/ratings', {
        requestId,
        volunteerId,
        rating,
        comment: comment.trim(),
        categories,
        badges,
        isPublic
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        handleClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setRating(0);
    setRatingHover(-1);
    setComment('');
    setCategories({
      responsiveness: 0,
      professionalism: 0,
      helpfulness: 0
    });
    setBadges([]);
    setIsPublic(true);
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Rate {volunteerName || 'this volunteer'}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Your feedback helps improve our volunteer community
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Rating submitted successfully! Thank you.
          </Alert>
        )}

        {!success && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Main Rating */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Overall Rating
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Rating
                  value={rating}
                  onChange={(e, value) => setRating(value)}
                  onChangeActive={(e, value) => setRatingHover(value)}
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': {
                      color: '#FF6B6B'
                    }
                  }}
                />
              </Box>
              {rating > 0 && (
                <Typography variant="caption" color="textSecondary">
                  {labels[ratingHover !== -1 ? ratingHover : rating]}
                </Typography>
              )}
            </Box>

            {/* Category Ratings */}
            {rating > 0 && (
              <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Rate these aspects (optional)
                </Typography>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Box key={key} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                      {label}
                    </Typography>
                    <Rating
                      value={categories[key]}
                      onChange={(e, value) => handleCategoryChange(key, value)}
                      size="small"
                      sx={{
                        '& .MuiRating-iconFilled': {
                          color: '#4CAF50'
                        }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* Comment */}
            <TextField
              label="Add a comment (optional)"
              multiline
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this volunteer..."
              fullWidth
              variant="outlined"
              inputProps={{ maxLength: 500 }}
              helperText={`${comment.length}/500 characters`}
            />

            {/* Badges */}
            {rating >= 4 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Award badges (if applicable)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {availableBadges.map(badge => (
                    <Chip
                      key={badge}
                      label={badge}
                      onClick={() => handleBadgeToggle(badge)}
                      variant={badges.includes(badge) ? 'filled' : 'outlined'}
                      color={badges.includes(badge) ? 'primary' : 'default'}
                      icon={
                        badge === 'Excellent Response' ? undefined :
                        badge === 'Very Professional' ? undefined :
                        badge === 'Highly Helpful' ? undefined :
                        undefined
                      }
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Privacy */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Make this review public (other users can see it)"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ gap: 1, p: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          {success ? 'Close' : 'Cancel'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading || rating === 0}
            sx={{ position: 'relative' }}
          >
            {loading ? <CircularProgress size={24} sx={{ position: 'absolute' }} /> : 'Submit Rating'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RatingDialog;
