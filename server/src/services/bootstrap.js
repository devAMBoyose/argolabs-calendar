import User from '../models/User.js';
import Event from '../models/Event.js';
import { addPhilippineDaysAtTime } from '../utils/philippineTime.js';

export async function ensureInitialData({ resetOwnerPassword = false } = {}) {
  const ownerEmail = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const ownerPassword = String(process.env.OWNER_PASSWORD || '');
  const ownerName = String(process.env.OWNER_NAME || 'Argo HR Administrator').trim();

  if (!ownerEmail) {
    throw new Error('OWNER_EMAIL is required.');
  }
  if (ownerPassword.length < 12) {
    throw new Error('OWNER_PASSWORD must be at least 12 characters.');
  }

  let owner = await User.findOne({ email: ownerEmail }).select('+passwordHash');

  if (!owner) {
    owner = await User.create({
      name: ownerName,
      email: ownerEmail,
      passwordHash: await User.hashPassword(ownerPassword),
      role: 'OWNER',
      isActive: true,
    });
    console.log(`Initial owner created: ${ownerEmail}`);
  } else {
    owner.name = ownerName || owner.name;
    owner.role = 'OWNER';
    owner.isActive = true;
    if (resetOwnerPassword) {
      owner.passwordHash = await User.hashPassword(ownerPassword);
    }
    await owner.save();
    console.log(`Initial owner ready: ${ownerEmail}`);
  }

  if (process.env.SEED_DEMO_DATA !== 'true') {
    return { owner, demoEventsCreated: 0 };
  }

  const demoExists = await Event.exists({ source: 'PORTAL' });
  if (demoExists) {
    return { owner, demoEventsCreated: 0 };
  }

  const now = new Date();
  const demos = [
    {
      title: 'HR Orientation',
      description: 'New employee orientation and policy walkthrough.',
      department: 'HR',
      location: 'Conference Room A',
      startAt: addPhilippineDaysAtTime(now, 1, 9),
      endAt: addPhilippineDaysAtTime(now, 1, 11),
      attendees: [],
      priority: 'NORMAL',
      status: 'PENDING',
      remarks: 'Demo event created during first deployment.',
      isPublic: true,
      reminderMinutes: 30,
    },
    {
      title: 'Operations Planning Meeting',
      description: 'Weekly operational planning and blockers review.',
      department: 'OPERATIONS',
      location: 'Main Meeting Room',
      startAt: addPhilippineDaysAtTime(now, 2, 13),
      endAt: addPhilippineDaysAtTime(now, 2, 15),
      attendees: [],
      priority: 'HIGH',
      status: 'ONGOING',
      remarks: 'Demo event created during first deployment.',
      isPublic: true,
      reminderMinutes: 60,
    },
    {
      title: 'Quarterly Compliance Review',
      description: 'Internal compliance checklist review.',
      department: 'ADMIN',
      location: 'Online',
      startAt: addPhilippineDaysAtTime(now, -4, 10),
      endAt: addPhilippineDaysAtTime(now, -4, 12),
      attendees: [],
      priority: 'URGENT',
      status: 'COMPLETED',
      remarks: 'Completed demo event.',
      isPublic: true,
      reminderMinutes: 30,
    },
    {
      title: 'Cancelled Vendor Briefing',
      description: 'Cancelled demo event for dashboard testing.',
      department: 'FINANCE',
      location: 'Davao Office',
      startAt: addPhilippineDaysAtTime(now, 5, 14),
      endAt: addPhilippineDaysAtTime(now, 5, 15),
      attendees: [],
      priority: 'NORMAL',
      status: 'CANCELLED',
      remarks: 'Vendor rescheduled.',
      isPublic: true,
      reminderMinutes: 30,
    },
  ].map((event) => ({
    ...event,
    source: 'PORTAL',
    createdBy: owner._id,
    updatedBy: owner._id,
  }));

  await Event.insertMany(demos);
  console.log(`Demo events created: ${demos.length}`);
  return { owner, demoEventsCreated: demos.length };
}
