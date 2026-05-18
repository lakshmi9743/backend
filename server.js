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
  .then(() => console.log('📡 Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  techStack: { type: [String], default: [] },
  githubLink: { type: String, default: '' },
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
    const { title, description, techStack, githubLink, image } = req.body;
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
    const { title, description, techStack, githubLink, image } = req.body;
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

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      next(err);
    }
  });
});

// TO THIS:
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
