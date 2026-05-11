require('dotenv').config();
const mongoose = require('mongoose');
const Volunteer = require('./models/Volunteer');

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/localcrisishelpchain';

// All available skills
const ALL_SKILLS = ['medical', 'rescue', 'food', 'shelter', 'transport', 'first-aid', 'counseling', 'logistics'];

// Skill profiles for different volunteer types
const SKILL_PROFILES = {
  medical: ['medical', 'first-aid', 'counseling'],
  rescue: ['rescue', 'transport', 'logistics'],
  food: ['food', 'logistics', 'shelter'],
  mixed: ['medical', 'rescue', 'food', 'shelter', 'transport'],
  minimal: ['first-aid', 'counseling']
};

async function addSkillsToVolunteers() {
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const volunteers = await Volunteer.find({});
    console.log(`Found ${volunteers.length} volunteers`);

    if (volunteers.length === 0) {
      console.log('No volunteers found. Please create volunteers first.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Assign skills to each volunteer
    for (let i = 0; i < volunteers.length; i++) {
      const vol = volunteers[i];
      const profileTypes = Object.keys(SKILL_PROFILES);
      const profileType = profileTypes[i % profileTypes.length];
      const skills = SKILL_PROFILES[profileType];

      await Volunteer.findByIdAndUpdate(vol._id, { skills }, { new: true });
      console.log(`Updated ${vol.name} (${vol.email}) with skills: ${skills.join(', ')}`);
    }

    console.log('\n✅ All volunteers updated with skills!');
  } catch (err) {
    console.error('Error updating volunteers:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

addSkillsToVolunteers();
