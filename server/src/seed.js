import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { ensureInitialData } from './services/bootstrap.js';

try {
  await connectDB();
  const result = await ensureInitialData({ resetOwnerPassword: true });
  console.log(`Owner account ready: ${result.owner.email}`);
  console.log(`Demo events created: ${result.demoEventsCreated}`);
} finally {
  await mongoose.connection.close();
}
