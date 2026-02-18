const requestController = require('../controllers/requestController');

router.post('/', verifyToken, requireRole('user'),
  requestController.createRequest);

router.get('/', verifyToken,
  requestController.getRequests);

router.put('/:id/assign', verifyToken, requireRole('ngo'),
  requestController.assignVolunteer);

router.post('/:id/resolve', verifyToken, requireRole('volunteer'),
  requestController.resolveRequest);
