require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';

async function deleteAllChallenges() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('Deleting all challenges...');
    const result = await Challenge.deleteMany({});
    console.log(`✓ Successfully deleted ${result.deletedCount} challenges`);

    console.log('Disconnecting from MongoDB...');
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error deleting challenges:', error);
    process.exit(1);
  }
}

deleteAllChallenges();
