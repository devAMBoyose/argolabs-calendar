import {Router} from 'express';import {formSubmit} from '../controllers/webhookController.js';const r=Router();r.post('/google-form',formSubmit);export default r;
