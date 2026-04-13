require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/localcrisishelpchain';

// CHANGE THIS to the `_id` of your admin user
const ADMIN_ID = '69a18206a8b4a186a1959d96';

// CHANGE THIS to the new password you want
const NEW_PASSWORD = 'Admin@1234';

async function resetAdminPassword() {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

  const hashed = await bcrypt.hash(NEW_PASSWORD, 10);

  await User.updateOne(
    { _id: ADMIN_ID },
    { $set: { password: hashed } }
  );

  console.log('Admin password updated successfully');
  await mongoose.disconnect();
}

resetAdminPassword().catch(err => {
  console.error(err);
  process.exit(1);
});