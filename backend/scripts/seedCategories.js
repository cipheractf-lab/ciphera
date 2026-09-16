const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category');

// Load environment variables
dotenv.config();

const categories = [
  { id: 'web', name: 'Web' },
  { id: 'crypto', name: 'Cryptography' },
  { id: 'forensics', name: 'Forensics' },
  { id: 'pwn', name: 'Binary' },
  { id: 'reverse', name: 'Reverse Engineering' },
  { id: 'misc', name: 'Miscellaneous' }
];

async function seedCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert categories
    for (const category of categories) {
      try {
        await Category.create(category);
        console.log(`✓ Created category: ${category.name}`);
      } catch (error) {
        console.error(`✗ Failed to create category ${category.name}:`, error.message);
      }
    }

    console.log('\n✓ Categories seeded successfully!');
    
    // Display all categories
    const allCategories = await Category.find().sort('name');
    console.log('\nAll categories in database:');
    allCategories.forEach(cat => {
      console.log(`  - ${cat.id}: ${cat.name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
