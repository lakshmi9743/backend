const sections = document.querySelectorAll("section");
const navLi = document.querySelectorAll(".nav-links li a");
const buttonTabs = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");
const projectsGrid = document.getElementById("projectsGrid");
const adminProjectList = document.getElementById("adminProjectList");
const contactForm = document.getElementById("contactForm");
const projectForm = document.getElementById("projectForm");
const projectSubmitButton = document.getElementById('projectSubmitButton');
const projectCancelButton = document.getElementById('projectCancelButton');
const seedDatabaseButton = document.getElementById('seedDatabaseButton');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginStatus = document.getElementById('adminLoginStatus');
const adminSection = document.getElementById('admin');
const adminLoginSection = document.getElementById('adminLogin');
let editingProjectId = null;
let adminHandlersAttached = false;
let adminToken = localStorage.getItem('adminToken') || null;

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    if (pageYOffset >= sectionTop - 120) {
      current = section.getAttribute("id");
    }
  });

  navLi.forEach((a) => {
    a.classList.remove("active");
    if (a.getAttribute("href").includes(current)) {
      a.classList.add("active");
    }
  });
});

buttonTabs.forEach(button => {
  button.addEventListener("click", () => {
    buttonTabs.forEach(btn => btn.classList.remove("active"));
    tabPanes.forEach(pane => pane.classList.remove("active"));

    button.classList.add("active");

    const tabId = button.getAttribute("data-tab");
    const targetPane = document.getElementById(tabId);
    if (targetPane) {
      targetPane.classList.add("active");
    }
  });
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendContactMessage(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!name || !email || !subject || !message) {
    alert('Please complete all contact fields before sending.');
    return;
  }

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, subject, message })
    });

    if (!response.ok) throw new Error('Failed to submit contact form.');

    alert("Message sent successfully! I'll get back to you soon.");
    contactForm.reset();
  } catch (error) {
    console.error('Contact submission failed:', error);
    alert('Unable to send message right now. Please try again later.');
  }
}

function renderAdminProjects(projects) {
  if (!adminProjectList) return;
  adminProjectList.innerHTML = projects.map(project => {
    const techTags = Array.isArray(project.techStack)
      ? project.techStack.map(tech => `<span class="tech ${escapeHtml(tech.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${escapeHtml(tech)}</span>`).join('')
      : '';

    return `
      <div class="project-card admin-card" data-id="${escapeHtml(project._id)}" data-github="${escapeHtml(project.githubLink || '')}" data-image="${escapeHtml(project.image || 'images/project-placeholder.png')}">
        <img src="${escapeHtml(project.image || 'images/project-placeholder.png')}" alt="${escapeHtml(project.title)}" class="project-image">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <div class="tech-stack">${techTags}</div>
        <div class="project-actions">
          <button type="button" class="btn-primary btn-small edit-project" data-id="${escapeHtml(project._id)}">Edit</button>
          <button type="button" class="btn-secondary btn-small delete-project" data-id="${escapeHtml(project._id)}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function startEditProject(project) {
  editingProjectId = project._id;
  document.getElementById('projectTitle').value = project.title;
  document.getElementById('projectDescription').value = project.description;
  document.getElementById('projectTech').value = Array.isArray(project.techStack) ? project.techStack.join(', ') : project.techStack;
  document.getElementById('projectGithub').value = project.githubLink || '';
  document.getElementById('projectImage').value = project.image || '';
  projectSubmitButton.textContent = 'Save Changes';
  projectCancelButton.classList.remove('hidden');

  // Smoothly scroll to the form at the top of the admin panel
  document.getElementById('projectForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setAdminToken(token) {
  adminToken = token;
  localStorage.setItem('adminToken', token);
}

function showAdminSection() {
  if (adminSection) adminSection.classList.remove('hidden');
  if (adminLoginSection) adminLoginSection.classList.add('hidden');
}

function showAdminLogin() {
  if (adminSection) adminSection.classList.add('hidden');
  if (adminLoginSection) adminLoginSection.classList.remove('hidden');
}

function resetProjectForm() {
  editingProjectId = null;
  projectForm.reset();
  projectSubmitButton.textContent = 'Add Project';
  projectCancelButton.classList.add('hidden');
}

async function validateAdminToken() {
  if (!adminToken) {
    showAdminLogin();
    return;
  }

  try {
    const response = await fetch('/api/admin/validate', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!response.ok) {
      localStorage.removeItem('adminToken');
      adminToken = null;
      showAdminLogin();
      return;
    }

    showAdminSection();
  } catch (error) {
    localStorage.removeItem('adminToken');
    adminToken = null;
    showAdminLogin();
  }
}

async function deleteProject(projectId) {
  if (!confirm('Delete this project?')) return;

  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete project.');
    }

    alert('Project deleted successfully.');
    resetProjectForm();
    loadProjects();
  } catch (error) {
    console.error('Project deletion failed:', error);
    alert('Unable to delete project right now. Please try again later.');
  }
}

async function saveProject(event) {
  event.preventDefault();

  const title = document.getElementById('projectTitle').value.trim();
  const description = document.getElementById('projectDescription').value.trim();
  const techStack = document.getElementById('projectTech').value.trim();
  const githubLink = document.getElementById('projectGithub').value.trim();
  const image = document.getElementById('projectImage').value.trim();

  if (!title || !description || !techStack) {
    alert('Please complete the title, description, and tech stack for the project.');
    return;
  }

  try {
    const method = editingProjectId ? 'PUT' : 'POST';
    const url = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ title, description, techStack, githubLink, image })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save project.');
    }

    const successMessage = editingProjectId ? 'Project updated successfully.' : 'Project added successfully.';
    alert(`${successMessage} Reloading project list.`);
    resetProjectForm();
    loadProjects();
  } catch (error) {
    console.error('Project save failed:', error);
    alert('Unable to save project right now. Please try again later.');
  }
}

function attachAdminHandlers() {
  if (!adminProjectList || adminHandlersAttached) return;

  adminProjectList.addEventListener('click', (event) => {
    const target = event.target;
    if (target.classList.contains('edit-project')) {
      const id = target.dataset.id;
      const card = target.closest('.admin-card');
      if (!card) return;
      const title = card.querySelector('h3').textContent;
      const description = card.querySelector('p').textContent;
      const techStack = Array.from(card.querySelectorAll('.tech')).map(el => el.textContent).join(', ');
      const githubLink = card.dataset.github || '';
      const image = card.dataset.image || '';
      startEditProject({ _id: id, title, description, techStack, githubLink, image });
    }

    if (target.classList.contains('delete-project')) {
      const id = target.dataset.id;
      deleteProject(id);
    }
  });

  adminHandlersAttached = true;
}

async function loadProjects() {
  if (!projectsGrid) return;

  try {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Network response was not ok');

    const projects = await response.json();
    if (!Array.isArray(projects)) {
      return;
    }

    if (projects.length === 0) {
      if (adminProjectList) adminProjectList.innerHTML = '';
      return;
    }

    projectsGrid.innerHTML = projects.map(project => {
      const techTags = Array.isArray(project.techStack)
        ? project.techStack.map(tech => `<span class="tech ${escapeHtml(tech.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${escapeHtml(tech)}</span>`).join('')
        : '';

      const githubLink = project.githubLink
        ? `<a href="${escapeHtml(project.githubLink)}" class="project-link" target="_blank" rel="noopener">GitHub Repository</a>`
        : '';

      return `
        <div class="project-card">
          <img src="${escapeHtml(project.image || 'images/project-placeholder.png')}" alt="${escapeHtml(project.title)}" class="project-image">
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="tech-stack">${techTags}</div>
          ${githubLink}
        </div>
      `;
    }).join('');

    renderAdminProjects(projects);
  } catch (error) {
    console.warn('Unable to load backend projects. Static content remains visible.', error);
  }
}

async function adminLogin(event) {
  event.preventDefault();

  const password = adminPasswordInput.value.trim();
  if (!password) {
    adminLoginStatus.textContent = 'Please enter the admin password.';
    return;
  }

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed.');
    }

    const data = await response.json();
    setAdminToken(data.token);
    showAdminSection();
    adminLoginStatus.textContent = '';
    loadProjects();
  } catch (error) {
    console.error('Admin login failed:', error);
    adminLoginStatus.textContent = 'Login failed. Check your password.';
  }
}

async function seedDatabase() {
  if (!confirm('Are you sure you want to reset the database to the 4 default projects? (This will overwrite your current live projects)')) return;

  try {
    const response = await fetch('/api/admin/seed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to seed database.');
    }

    alert('Database successfully reset to the 4 default projects!');
    resetProjectForm();
    loadProjects();
  } catch (error) {
    console.error('Database seeding failed:', error);
    alert('Unable to reset database right now. Please try again later.');
  }
}

attachAdminHandlers();
validateAdminToken().then(loadProjects);
if (contactForm) contactForm.addEventListener('submit', sendContactMessage);
if (projectForm) projectForm.addEventListener('submit', saveProject);
if (projectCancelButton) projectCancelButton.addEventListener('click', resetProjectForm);
if (seedDatabaseButton) seedDatabaseButton.addEventListener('click', seedDatabase);
if (adminLoginForm) adminLoginForm.addEventListener('submit', adminLogin);
