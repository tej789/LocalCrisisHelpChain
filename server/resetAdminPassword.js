require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/localcrisishelpchain';

// CHANGE THIS to the admin email you want to reset
const ADMIN_EMAIL = 'admin@gmail.com';

// CHANGE THIS to the new password you want
const NEW_PASSWORD = '12345678';

async function resetAdminPassword() {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

  const adminUser = await User.findOne({ email: ADMIN_EMAIL, role: 'admin' });
  if (!adminUser) {
    console.error(`Admin user not found for email: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

  await User.updateOne(
    { _id: adminUser._id },
    { $set: { password: hashed } }
  );

  console.log(`Admin password updated successfully for ${ADMIN_EMAIL}`);
  await mongoose.disconnect();
}

resetAdminPassword().catch(err => {
  console.error(err);
  process.exit(1);
});