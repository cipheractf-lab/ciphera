const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tutorial = require('../models/Tutorial');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected for seeding tutorials'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Sample tutorials data
const tutorials = [
  {
    title: 'Introduction to CTF',
    description: 'Learn the fundamentals of Capture The Flag competitions, including common challenge types, tools, and strategies.',
    content: 'This tutorial covers the basics of CTF competitions...',
    category: 'CTF Basics',
    difficulty: 'beginner',
    estimatedTime: '2 hours',
    prerequisites: ['Basic computer knowledge', 'Familiarity with command line'],
    link: '/tutorials/intro-to-ctf'
  },
  {
    title: 'Web Security Fundamentals',
    description: 'Master essential web security concepts and learn how to identify and exploit common web vulnerabilities.',
    content: 'This tutorial covers common web vulnerabilities...',
    category: 'Web Security',
    difficulty: 'intermediate',
    estimatedTime: '3 hours',
    prerequisites: ['Basic understanding of web technologies', 'HTML, CSS, JavaScript knowledge'],
    link: '/tutorials/web-security'
  },
  {
    title: 'Binary Exploitation',
    description: 'Dive deep into binary exploitation techniques and learn how to analyze and exploit binary vulnerabilities.',
    content: 'This tutorial covers binary exploitation techniques...',
    category: 'Binary Exploitation',
    difficulty: 'advanced',
    estimatedTime: '4 hours',
    prerequisites: ['C/C++ programming', 'Assembly language basics', 'Linux command line'],
    link: '/tutorials/binary-exploitation'
  },
  {
    title: 'Cryptography Basics',
    description: 'Learn the fundamentals of cryptography and how to apply them in CTF challenges.',
    content: 'This tutorial covers basic cryptographic concepts...',
    category: 'Cryptography',
    difficulty: 'beginner',
    estimatedTime: '2.5 hours',
    prerequisites: ['Basic mathematics', 'Understanding of binary and hexadecimal'],
    link: '/tutorials/cryptography'
  },
  {
    title: 'Reverse Engineering',
    description: 'Learn how to reverse engineer software to understand its functionality and find vulnerabilities.',
    content: 'This tutorial covers reverse engineering techniques...',
    category: 'Reverse Engineering',
    difficulty: 'advanced',
    estimatedTime: '5 hours',
    prerequisites: ['Assembly language', 'C/C++ programming', 'Debugging tools knowledge'],
    link: '/tutorials/reverse-engineering'
  },
  {
    title: 'External CTF Resources',
    description: 'Access external CTF platforms and resources to practice your skills.',
    content: 'This tutorial provides links to external CTF platforms...',
    category: 'Resources',
    difficulty: 'beginner',
    estimatedTime: '1 hour',
    prerequisites: [],
    link: 'https://ctftime.org/'
  }
];

// Function to seed tutorials
const seedTutorials = async () => {
  try {
    // Clear existing tutorials
    await Tutorial.deleteMany();
    console.log('Cleared existing tutorials');

    // Find an admin user to set as author
    const adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      console.log('No admin user found. Creating tutorials without author...');
    }

    // Create tutorials
    const createdTutorials = await Tutorial.create(
      tutorials.map(tutorial => ({
        ...tutorial,
        author: adminUser ? adminUser._id : undefined
      }))
    );

    console.log(`Created ${createdTutorials.length} tutorials`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding tutorials:', error);
    process.exit(1);
  }
};

// Run the seeding function
seedTutorials();