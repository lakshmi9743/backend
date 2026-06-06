const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portfolio';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('🔥 Connected to MongoDB. Seeding project data...');

    const Project = mongoose.model('Project', new mongoose.Schema({
      title: String,
      description: String,
      techStack: [String],
      githubLink: String,
      liveLink: String,
      image: String
    }));

    const projects = [
      {
        title: 'Tailor Service Management App',
        description: 'Android application for managing tailor-customer interactions with real-time updates and order tracking.',
        techStack: ['Kotlin', 'Firebase', 'Android Studio'],
        githubLink: 'https://github.com/lakshmi9743/tailorservice.git',
        liveLink: '',
        image: 'images/tailor-app.jpg'
      },
      {
        title: 'Grievance Tracker',
        description: 'Web-based system providing a transparent bridge between users and administrative departments for efficient complaint management.',
        techStack: ['MVC Architecture', 'C#.NET', 'MySQL'],
        githubLink: '',
        liveLink: '',
        image: 'images/grievance-tracker.png'
      },
      {
        title: 'Quiz Website',
        description: 'Interactive quiz platform with user authentication, dynamic question management, and real-time score tracking.',
        techStack: ['PHP', 'MySQL', 'HTML/CSS', 'JavaScript'],
        githubLink: '',
        liveLink: '',
        image: 'images/quiz-website.png'
      },
      {
        title: 'Puzzle Game',
        description: 'Engaging puzzle game with dynamic difficulty levels and cloud-based leaderboard integration.',
        techStack: ['Firebase', 'Game Development', 'Cloud Services'],
        githubLink: '',
        liveLink: '',
        image: 'images/game.png'
      }
    ];

    await Project.deleteMany({});
    await Project.insertMany(projects);

    console.log('✅ Seed complete. Project data has been stored.');
    process.exit();
  })
  .catch(err => {
    console.error('❌ Seeding failed:', err.message);
  });
