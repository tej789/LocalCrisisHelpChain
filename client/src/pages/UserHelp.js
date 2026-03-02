import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  QuestionAnswer as QuestionIcon
} from '@mui/icons-material';
import UserLayout from '../components/user/UserLayout';
import { useNavigate } from 'react-router-dom';

function UserHelp() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: 'How do I submit a help request?',
      answer: 'Click on "Submit Request" in the sidebar menu. Fill in the required details including the type of help needed, urgency level, description, and location. Click "Submit" to create your request.'
    },
    {
      question: 'How can I track my submitted requests?',
      answer: 'Navigate to "My Requests" from the sidebar to view all your submitted help requests. You can see their current status (Open, Assigned, or Resolved) and other details.'
    },
    {
      question: 'What do the different urgency levels mean?',
      answer: 'High: Immediate attention needed. Medium: Important but not critical. Low: Can wait, but assistance would be helpful.'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Go to "Profile" in the sidebar menu. You can update your name, phone number, and city. Your email address cannot be changed as it\'s your unique identifier.'
    },
    {
      question: 'Can I see help requests from my community?',
      answer: 'Yes! Click on "Community Requests" in the sidebar to view all requests in your area. This helps build community awareness and support.'
    },
    {
      question: 'What happens after I submit a request?',
      answer: 'Your request is made visible to NGOs and volunteers in the system. They can view and claim your request. You\'ll be notified when your request is assigned to someone and when it\'s resolved.'
    },
    {
      question: 'How do I know if someone has responded to my request?',
      answer: 'Check the notification bell icon in the top navbar. You\'ll receive notifications when your request status changes.'
    },
    {
      question: 'Can I cancel or delete a request?',
      answer: 'Currently, you cannot delete a request directly. If your issue is resolved or no longer needed, please contact support or wait for it to be resolved by an assigned helper.'
    }
  ];

  return (
    <UserLayout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <HelpIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Help Center
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Find answers to common questions and get support
          </Typography>
        </Paper>

        {/* Quick Actions */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={4}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <QuestionIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Getting Started
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    New to the platform? Start here
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate('/submit-request')}
                  >
                    Submit Your First Request
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PhoneIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Emergency Support
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Need immediate assistance?
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="error" sx={{ mt: 1 }}>
                    Call: 1800-XXX-XXXX
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* FAQ Section */}
        <Typography variant="h4" fontWeight={700} gutterBottom mb={3}>
          Frequently Asked Questions
        </Typography>

        <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
          {faqs.map((faq, index) => (
            <Accordion key={index} elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        {/* Contact Support */}
        <Paper
          elevation={3}
          sx={{
            p: 4,
            mt: 4,
            textAlign: 'center',
            borderRadius: 3,
            backgroundColor: '#f8f9fa',
          }}
        >
          <EmailIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Still Need Help?
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Can't find what you're looking for? Our support team is here to help.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<EmailIcon />}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
            }}
          >
            Contact Support
          </Button>
        </Paper>
      </Container>
    </UserLayout>
  );
}

export default UserHelp;
