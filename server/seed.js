const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const users = [
  {
    name: 'Alice Developer',
    email: 'alice@example.com',
    password: 'password123',
    bio: 'Senior React Developer looking to learn Piano.',
    location: { type: 'Point', coordinates: [-122.4194, 37.7749] }, // San Francisco Center
    skillsOffered: ['React', 'JavaScript', 'Node.js', 'Frontend'],
    skillsWanted: ['Piano', 'Music Theory', 'Acoustic Guitar'],
    trustScore: 92
  },
  {
    name: 'Bob Musician',
    email: 'bob@example.com',
    password: 'password123',
    bio: 'Classical pianist looking for web dev lessons for my band website.',
    location: { type: 'Point', coordinates: [-122.4294, 37.7649] }, // ~1.5km from Alice
    skillsOffered: ['Piano', 'Music Theory', 'Guitar', 'Vocals'],
    skillsWanted: ['React', 'Web Design', 'HTML'],
    trustScore: 88
  },
  {
    name: 'Charlie Chef',
    email: 'charlie@example.com',
    password: 'password123',
    bio: 'Professional chef wanting to learn basic Spanish.',
    location: { type: 'Point', coordinates: [-122.4094, 37.7849] }, // ~1km from Alice
    skillsOffered: ['Cooking', 'Baking', 'Knife Skills', 'Meal Prep'],
    skillsWanted: ['Spanish', 'Language', 'Conversational Spanish'],
    trustScore: 98
  },
  {
    name: 'Diana Linguist',
    email: 'diana@example.com',
    password: 'password123',
    bio: 'Fluent Spanish speaker looking to learn how to cook healthy meals.',
    location: { type: 'Point', coordinates: [-122.4150, 37.7700] }, // ~0.5km from Alice
    skillsOffered: ['Spanish', 'Translation', 'French', 'Tutoring'],
    skillsWanted: ['Cooking', 'Baking', 'Nutrition'],
    trustScore: 85
  },
  {
    name: 'Eve Designer',
    email: 'eve@example.com',
    password: 'password123',
    bio: 'UI/UX Designer seeking beginner JavaScript tutoring.',
    location: { type: 'Point', coordinates: [-122.4400, 37.7500] }, // ~3km away
    skillsOffered: ['Figma', 'Web Design', 'UI/UX', 'Photoshop'],
    skillsWanted: ['JavaScript', 'React', 'Frontend'],
    trustScore: 78
  },
  {
    name: 'Frank Fitness',
    email: 'frank@example.com',
    password: 'password123',
    bio: 'Personal trainer offering workout plans for graphic design work.',
    location: { type: 'Point', coordinates: [-122.4500, 37.7600] }, // ~4km away
    skillsOffered: ['Personal Training', 'Fitness', 'Nutrition', 'Yoga'],
    skillsWanted: ['Photoshop', 'Illustrator', 'Logo Design'],
    trustScore: 95
  },
  {
    name: 'Grace Video Editor',
    email: 'grace@example.com',
    password: 'password123',
    bio: 'Expert video editor needing help with taxes and accounting.',
    location: { type: 'Point', coordinates: [-122.3900, 37.7800] }, // ~3km away (SoMa)
    skillsOffered: ['Premiere Pro', 'Video Editing', 'After Effects'],
    skillsWanted: ['Accounting', 'Taxes', 'Finance'],
    trustScore: 82
  },
  {
    name: 'Henry Accountant',
    email: 'henry@example.com',
    password: 'password123',
    bio: 'CPA willing to help with taxes in exchange for fitness coaching.',
    location: { type: 'Point', coordinates: [-122.4000, 37.7900] }, // Financial District
    skillsOffered: ['Accounting', 'Taxes', 'Finance', 'Excel'],
    skillsWanted: ['Fitness', 'Personal Training', 'Yoga'],
    trustScore: 99
  },
  {
    name: 'Ivy Markerter',
    email: 'ivy@example.com',
    password: 'password123',
    bio: 'Digital marketer looking to learn video editing for campaigns.',
    location: { type: 'Point', coordinates: [-122.4300, 37.7700] }, 
    skillsOffered: ['Marketing', 'SEO', 'Social Media'],
    skillsWanted: ['Video Editing', 'Premiere Pro'],
    trustScore: 65
  },
  {
    name: 'Jack Handyman',
    email: 'jack@example.com',
    password: 'password123',
    bio: 'Can fix anything in your house. Looking to learn SEO to advertise my business.',
    location: { type: 'Point', coordinates: [-122.4800, 37.7600] }, // Outer Sunset (~6km away)
    skillsOffered: ['Plumbing', 'Carpentry', 'Home Repair'],
    skillsWanted: ['SEO', 'Marketing', 'Web Design'],
    trustScore: 89
  }
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected.');
    await User.deleteMany();
    console.log('Destroyed old users.');
    
    for (let user of users) {
       await User.create(user);
    }
    
    console.log('Sample data (10 Users) seeded successfully.');
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
