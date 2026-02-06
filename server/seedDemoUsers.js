require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/localcrisishelpchain';

async function seedDemoUsers() {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const demoUsers = [
      { name: 'Demo NGO', email: 'ngo@demo.com', password: 'demo123', role: 'ngo', verified: true },
      { name: 'Demo Volunteer', email: 'volunteer@demo.com', password: 'demo123', role: 'volunteer', verified: true }
    ];

    for (const u of demoUsers) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`Skipped (exists): ${u.email}`);
        continue;
      }
      const hashed = await bcrypt.hash(u.password, 10);
      const user = new User({
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        verified: true
      });
      await user.save();
      console.log(`Created: ${u.email} (${u.role})`);
    }
  } catch (err) {
    console.error('Error seeding demo users:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDemoUsers();