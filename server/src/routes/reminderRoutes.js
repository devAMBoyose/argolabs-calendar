import { Router } from 'express';
import { runReminders } from '../controllers/reminderController.js';

const router = Router();
router.get('/run', runReminders);
router.post('/run', runReminders);
export default router;
