const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portfolio';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-this-token';

app.use(cors());
app.use(express.json());

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('📡 Connected to MongoDB');
    try {
      // Auto-seed default projects if the collection is empty
      const count = await Project.countDocuments();
      if (count === 0) {
        console.log('🌱 Projects collection is empty. Autoseeding default projects...');
        const defaultProjects = [
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
        await Project.insertMany(defaultProjects);
        console.log('✅ Autoseeding complete.');
      }
    } catch (err) {
      console.error('❌ Autoseeding failed:', err);
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  techStack: { type: [String], default: [] },
  githubLink: { type: String, default: '' },
  liveLink: { type: String, default: '' },
  image: { type: String, default: 'images/project-placeholder.png' }
}, { timestamps: true });

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model('Project', projectSchema);
const ContactMessage = mongoose.model('ContactMessage', contactSchema);

function requireAdminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized. Admin token required.' });
  }

  const token = auth.split(' ')[1];
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ message: 'Forbidden. Invalid admin token.' });
  }

  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin password.' });
  }

  res.json({ token: ADMIN_TOKEN });
});

app.get('/api/admin/validate', requireAdminAuth, (req, res) => {
  res.json({ valid: true });
});

app.post('/api/admin/seed', requireAdminAuth, async (req, res) => {
  try {
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

    res.json({ message: 'Database seeded successfully with original projects!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const contact = new ContactMessage({ name, email, subject, message });
    await contact.save();

    res.json({ message: 'Contact message saved successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/projects', requireAdminAuth, async (req, res) => {
  try {
    const { title, description, techStack, githubLink, liveLink, image } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const techArray = Array.isArray(techStack)
      ? techStack.map(item => item.trim()).filter(Boolean)
      : String(techStack || '').split(',').map(item => item.trim()).filter(Boolean);

    const project = new Project({
      title,
      description,
      techStack: techArray,
      githubLink: githubLink || '',
      liveLink: liveLink || '',
      image: image ? String(image).replace(/^\//, '') : 'images/project-placeholder.png'
    });

    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/projects/:id', requireAdminAuth, async (req, res) => {
  try {
    const { title, description, techStack, githubLink, liveLink, image } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const techArray = Array.isArray(techStack)
      ? techStack.map(item => item.trim()).filter(Boolean)
      : String(techStack || '').split(',').map(item => item.trim()).filter(Boolean);

    const update = {
      title,
      description,
      techStack: techArray,
      githubLink: githubLink || '',
      liveLink: liveLink || '',
      image: image ? String(image).replace(/^\//, '') : 'images/project-placeholder.png'
    };

    const project = await Project.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/projects/:id', requireAdminAuth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REPLACE YOUR FRONTEND STATIC PATH BLOCK WITH THIS:
const frontendPath = path.resolve(__dirname, 'frontend');
app.use(express.static(frontendPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      // This will log the exact location the server is trying to look into
      console.error("❌ Failed to serve index.html from path:", path.join(frontendPath, 'index.html'));
      next(err);
    }
  });
});

// TO THIS:
// CHANGE THIS:
// TO THIS:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
