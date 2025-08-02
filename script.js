// Data model
const categoriesDefault = ['🐛 Bug', '✨ Feature Request', '👤 Account', '❓ Other'];
let categories = [...categoriesDefault];
const users = {};
const tickets = [];
let ticketIdCounter = 1;


let currentUser = null;
let currentRole = 'enduser';
let selectedTicketId = null;

const authSection = document.getElementById('auth');
const dashboardSection = document.getElementById('dashboard');
const roleSelect = document.getElementById('roleSelect');
const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const userInfo = document.getElementById('userInfo');
const currentUserName = document.getElementById('currentUserName');
const currentUserRole = document.getElementById('currentUserRole');


function formatTime(timestamp) {
  const d = new Date(timestamp);
  return d.toLocaleString();
}

function getStatusIcon(status) {
  const icons = {
    'Open': '🔵',
    'In Progress': '🟡',
    'Resolved': '🟢',
    'Closed': '⚫'
  };
  return icons[status] || '❓';
}

function getRoleIcon(role) {
  const icons = {
    'enduser': '👤',
    'agent': '🛠️',
    'admin': '👑'
  };
  return icons[role] || '👤';
}

// Role change updates current role
roleSelect.addEventListener('change', () => {
  currentRole = roleSelect.value;
});

//login handler
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert('Please enter a username.');
    return;
  }

  // Register if not exists
  if (!users[username]) {
    users[username] = currentRole;
  }
  currentUser = { username, role: users[username] };
  currentUserName.textContent = username;
  currentUserRole.textContent = users[username];
  userInfo.style.display = 'block';
  
  showDashboard();
});

// Logout helper
function logout() {
  currentUser = null;
  selectedTicketId = null;
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
  userInfo.style.display = 'none';
  usernameInput.value = '';
  mainContent.innerHTML = '';
  sidebar.innerHTML = '';
}

// Show dashboard
function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  renderSidebar();
  renderMainContent();
}

// sidebar rendering
function renderSidebar() {
  sidebar.innerHTML = '';

  if (currentUser.role === 'enduser') {
    renderEndUserSidebar();
  } else if (currentUser.role === 'agent') {
    renderAgentSidebar();
  } else if (currentUser.role === 'admin') {
    renderAdminPanel();
  }
}

// End User Sidebar
function renderEndUserSidebar() {
  const title = document.createElement('h3');
  title.textContent = '🎫 My Tickets';
  sidebar.appendChild(title);

  const filtersDiv = document.createElement('div');
  filtersDiv.className = 'ticket-filters';

  // Status filter
  const statusSelect = document.createElement('select');
  statusSelect.setAttribute('aria-label', 'Filter tickets by status');
  ['All', 'Open', 'In Progress', 'Resolved', 'Closed'].forEach(status => {
    const option = document.createElement('option');
    option.value = status.toLowerCase().replace(' ', '');
    option.textContent = status === 'All' ? status : `${getStatusIcon(status)} ${status}`;
    statusSelect.appendChild(option);
  });

  // Category filter
  const categorySelect = document.createElement('select');
  categorySelect.setAttribute('aria-label', 'Filter tickets by category');
  const catAll = document.createElement('option');
  catAll.value = '';
  catAll.textContent = '📂 All Categories';
  categorySelect.appendChild(catAll);
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Sort select
  const sortSelect = document.createElement('select');
  sortSelect.setAttribute('aria-label', 'Sort tickets');
  [
    { val: 'recent', label: '🕒 Recently Updated' },
    { val: 'mostreplied', label: '💬 Most Replied' }
  ].forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.val;
    option.textContent = opt.label;
    sortSelect.appendChild(option);
  });

  filtersDiv.appendChild(statusSelect);
  filtersDiv.appendChild(categorySelect);
  filtersDiv.appendChild(sortSelect);
  sidebar.appendChild(filtersDiv);

  const listContainer = document.createElement('div');
  listContainer.className = 'ticket-list';
  sidebar.appendChild(listContainer);

  function updateList() {
    const statusFilter = statusSelect.value;
    const categoryFilter = categorySelect.value;
    const sortVal = sortSelect.value;

    let filtered = tickets.filter(
      t => t.creator === currentUser.username &&
        (statusFilter === 'all' || !statusFilter || t.status.replace(' ', '').toLowerCase() === statusFilter) &&
        (!categoryFilter || t.category === categoryFilter)
    );

    if (sortVal === 'recent') {
      filtered.sort((a,b) => b.updatedAt - a.updatedAt);
    } else if(sortVal === 'mostreplied'){
      filtered.sort((a,b) => (b.comments.length) - (a.comments.length));
    }

    listContainer.innerHTML = '';
    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6c757d;">📭 No tickets to show</div>';
      mainContent.innerHTML = '';
      selectedTicketId = null;
      return;
    }

    filtered.forEach(t => {
      const div = document.createElement('div');
      div.className = 'ticket-item' + (selectedTicketId === t.id ? ' active' : '');
      div.tabIndex = 0;
      div.setAttribute('role','button');
      
      div.addEventListener('click', () => {
        selectedTicketId = t.id;
        updateList();
        renderTicketDetail(t);
      });

      const subjectSpan = document.createElement('span');
      subjectSpan.className = 'ticket-subject';
      subjectSpan.textContent = `${getStatusIcon(t.status)} ${t.subject}`;
      div.appendChild(subjectSpan);

      const statusSpan = document.createElement('span');
      statusSpan.className = 'ticket-status status-' + t.status.replace(' ', '').toLowerCase();
      statusSpan.textContent = t.status;
      div.appendChild(statusSpan);

      // Enhanced votes
      const votesDiv = document.createElement('div');
      votesDiv.className = 'votes';

      const upvoteBtn = document.createElement('button');
      upvoteBtn.className = 'vote-btn';
      upvoteBtn.title = 'Upvote';
      upvoteBtn.textContent = '👍';
      upvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        t.upvotes++;
        updateList();
      });
      votesDiv.appendChild(upvoteBtn);

      const voteCount = document.createElement('span');
      voteCount.className = 'vote-count';
      voteCount.textContent = t.upvotes - t.downvotes;
      votesDiv.appendChild(voteCount);

      const downvoteBtn = document.createElement('button');
      downvoteBtn.className = 'vote-btn';
      downvoteBtn.title = 'Downvote';
      downvoteBtn.textContent = '👎';
      downvoteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        t.downvotes++;
        updateList();
      });
      votesDiv.appendChild(downvoteBtn);

      div.appendChild(votesDiv);
      listContainer.appendChild(div);
    });

    if (!selectedTicketId || !filtered.find(t => t.id === selectedTicketId)) {
      selectedTicketId = filtered.length ? filtered[0].id : null;
    }
    if(selectedTicketId){
      const selectedTicket = tickets.find(t => t.id === selectedTicketId);
      renderTicketDetail(selectedTicket);
    }
  }

  [statusSelect, categorySelect, sortSelect].forEach(sel => {
    sel.addEventListener('change', updateList);
  });

  const createBtn = document.createElement('button');
  createBtn.textContent = '➕ Create New Ticket';
  createBtn.style.marginTop = '1rem';
  createBtn.addEventListener('click', () => {
    renderTicketForm();
  });
  sidebar.appendChild(createBtn);

  updateList();
}

// Agent Sidebar
function renderAgentSidebar() {
  const title = document.createElement('h3');
  title.textContent = '🛠️ Support Queue';
  sidebar.appendChild(title);

  const queueButtons = document.createElement('div');
  queueButtons.className = 'ticket-filters';

  const myTicketsBtn = document.createElement('button');
  myTicketsBtn.textContent = '📋 My Tickets';
  myTicketsBtn.classList.add('active');

  const allTicketsBtn = document.createElement('button');
  allTicketsBtn.textContent = '📊 All Tickets';

  queueButtons.appendChild(myTicketsBtn);
  queueButtons.appendChild(allTicketsBtn);
  sidebar.appendChild(queueButtons);

  const listContainer = document.createElement('div');
  listContainer.className = 'ticket-list';
  sidebar.appendChild(listContainer);

  let currentQueue = 'mytickets';

  function renderTicketsAgent() {
    let filtered;
    if(currentQueue === 'mytickets') {
      filtered = tickets.filter(t => t.assignedTo === currentUser.username);
    } else {
      filtered = tickets;
    }
    filtered.sort((a,b) => b.updatedAt - a.updatedAt);

    listContainer.innerHTML = '';
    if(filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6c757d;">📭 No tickets in queue</div>';
      mainContent.innerHTML = '';
      selectedTicketId = null;
      return;
    }

    filtered.forEach(t => {
      const div = document.createElement('div');
      div.className = 'ticket-item' + (selectedTicketId === t.id ? ' active' : '');
      div.tabIndex = 0;
      div.setAttribute('role','button');
      
      div.addEventListener('click', () => {
        selectedTicketId = t.id;
        renderTicketsAgent();
        renderTicketDetailAgent(t);
      });

      const subjectSpan = document.createElement('span');
      subjectSpan.className = 'ticket-subject';
      subjectSpan.textContent = `${getStatusIcon(t.status)} ${t.subject}`;
      div.appendChild(subjectSpan);

      const statusSpan = document.createElement('span');
      statusSpan.className = 'ticket-status status-' + t.status.replace(' ', '').toLowerCase();
      statusSpan.textContent = t.status;
      div.appendChild(statusSpan);

      const meta = document.createElement('div');
      meta.className = 'ticket-meta';
      meta.textContent = `👤 ${t.assignedTo || 'Unassigned'}`;
      div.appendChild(meta);

      listContainer.appendChild(div);
    });

    if(!selectedTicketId || !filtered.find(t=>t.id===selectedTicketId)){
      selectedTicketId = filtered.length ? filtered[0].id : null;
    }
    if(selectedTicketId){
      const tkt = tickets.find(t=>t.id===selectedTicketId);
      renderTicketDetailAgent(tkt);
    }
  }

  myTicketsBtn.addEventListener('click', () => {
    currentQueue = 'mytickets';
    myTicketsBtn.classList.add('active');
    allTicketsBtn.classList.remove('active');
    renderTicketsAgent();
  });
  
  allTicketsBtn.addEventListener('click', () => {
    currentQueue = 'alltickets';
    allTicketsBtn.classList.add('active');
    myTicketsBtn.classList.remove('active');
    renderTicketsAgent();
  });

  renderTicketsAgent();
}

//  Admin Panel
function renderAdminPanel() {
  mainContent.innerHTML = '';

  // Statistics
  const statsGrid = document.createElement('div');
  statsGrid.className = 'stats-grid';

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'Open').length;
  const totalUsers = Object.keys(users).length;
  const totalCategories = categories.length;

  const stats = [
    { label: 'Total Tickets', value: totalTickets, icon: '🎫' },
    { label: 'Open Tickets', value: openTickets, icon: '🔵' },
    { label: 'Total Users', value: totalUsers, icon: '👥' },
    { label: 'Categories', value: totalCategories, icon: '📂' }
  ];

  stats.forEach(stat => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-number">${stat.icon} ${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
    `;
    statsGrid.appendChild(card);
  });

  mainContent.appendChild(statsGrid);

  // Admin sections
  const adminPanel = document.createElement('div');
  adminPanel.className = 'admin-panel';

  // User management
  const userAdmin = document.createElement('section');
  userAdmin.className = 'admin-section';
  userAdmin.innerHTML = `
    <h4>👥 User Management</h4>
    <ul id="userList"></ul>
    <div class="admin-add-form">
      <input type="text" id="newUserInput" placeholder="New username" autocomplete="off" />
      <select id="newUserRoleSelect">
        <option value="enduser">👤 End User</option>
        <option value="agent">🛠️ Support Agent</option>
        <option value="admin">👑 Admin</option>
      </select>
      <button id="addUserBtn">Add User</button>
    </div>
  `;
  adminPanel.appendChild(userAdmin);

  // Category management
  const categoryAdmin = document.createElement('section');
  categoryAdmin.className = 'admin-section';
  categoryAdmin.innerHTML = `
    <h4>📂 Category Management</h4>
    <ul id="categoryList"></ul>
    <div class="admin-add-form">
      <input type="text" id="newCategoryInput" placeholder="New Category" autocomplete="off" />
      <button id="addCategoryBtn">Add Category</button>
    </div>
  `;
  adminPanel.appendChild(categoryAdmin);

  mainContent.appendChild(adminPanel);

  //  user management
  const userListEl = document.getElementById('userList');
  const newUserInput = document.getElementById('newUserInput');
  const newUserRoleSelect = document.getElementById('newUserRoleSelect');
  const addUserBtn = document.getElementById('addUserBtn');

  function renderUsers() {
    userListEl.innerHTML = '';
    const userEntries = Object.entries(users);
    if(userEntries.length === 0){
      userListEl.innerHTML = '<li style="text-align: center; color: #6c757d;">No users registered</li>';
      return;
    }
    
    userEntries.forEach(([uname, urole]) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${getRoleIcon(urole)} ${uname} (${urole})</span>
        ${uname !== currentUser.username ? 
          `<button class="delete-btn" onclick="deleteUser('${uname}')">🗑️ Delete</button>` : 
          '<span style="color: #6c757d; font-style: italic;">Current User</span>'
        }
      `;
      userListEl.appendChild(li);
    });
  }

  window.deleteUser = function(username) {
    if(confirm(`Delete user ${username}? This will unassign their tickets.`)){
      delete users[username];
      tickets.forEach(t => {
        if(t.assignedTo === username) t.assignedTo = null;
      });
      renderUsers();
      renderAdminPanel(); // Refresh stats
    }
  };

  addUserBtn.addEventListener('click', () => {
    const username = newUserInput.value.trim();
    const role = newUserRoleSelect.value;
    if(!username){
      alert('Enter a username.');
      return;
    }
    if(users[username]){
      alert('User already exists.');
      return;
    }
    users[username] = role;
    newUserInput.value = '';
    renderUsers();
    renderAdminPanel(); // Refresh stats
  });

  //  category management
  const categoryListEl = document.getElementById('categoryList');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const addCategoryBtn = document.getElementById('addCategoryBtn');

  function renderCategories() {
    categoryListEl.innerHTML = '';
    if(categories.length === 0){
      categoryListEl.innerHTML = '<li style="text-align: center; color: #6c757d;">No categories defined</li>';
      return;
    }
    
    categories.forEach((cat,i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${cat}</span>
        <button class="delete-btn" onclick="deleteCategory(${i})">🗑️ Delete</button>
      `;
      categoryListEl.appendChild(li);
    });
  }

  window.deleteCategory = function(index) {
    const cat = categories[index];
    if(confirm(`Delete category "${cat}"?`)){
      categories.splice(index, 1);
      renderCategories();
      renderAdminPanel(); // Refresh stats
    }
  };

  addCategoryBtn.addEventListener('click', () => {
    const cat = newCategoryInput.value.trim();
    if(!cat){
      alert('Enter a category name.');
      return;
    }
    if(categories.includes(cat)){
      alert('Category already exists.');
      return;
    }
    categories.push(cat);
    newCategoryInput.value = '';
    renderCategories();
    renderAdminPanel(); // Refresh stats
  });

  renderUsers();
  renderCategories();
}

// Main content renderer
function renderMainContent() {
  if (currentUser.role === 'enduser') {
    if (selectedTicketId) {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if(ticket){
        renderTicketDetail(ticket);
      } else {
        renderTicketForm();
      }
    } else {
      renderTicketForm();
    }
  }
}

//  ticket detail for End User
function renderTicketDetail(ticket) {
  mainContent.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'ticket-detail';

  const title = document.createElement('h3');
  title.textContent = `${getStatusIcon(ticket.status)} ${ticket.subject}`;
  container.appendChild(title);

  // Info grid
  const infoGrid = document.createElement('div');
  infoGrid.className = 'ticket-info-grid';

  const infoItems = [
    { label: 'Category', value: ticket.category },
    { label: 'Status', value: ticket.status },
    { label: 'Created', value: formatTime(ticket.createdAt) },
    { label: 'Last Updated', value: formatTime(ticket.updatedAt) },
    { label: 'Assigned To', value: ticket.assignedTo || 'Unassigned' },
    { label: 'Votes', value: `👍 ${ticket.upvotes} | 👎 ${ticket.downvotes}` }
  ];

  infoItems.forEach(item => {
    const infoItem = document.createElement('div');
    infoItem.className = 'ticket-info-item';
    infoItem.innerHTML = `
      <div class="ticket-info-label">${item.label}</div>
      <div class="ticket-info-value">${item.value}</div>
    `;
    infoGrid.appendChild(infoItem);
  });

  container.appendChild(infoGrid);

  const description = document.createElement('div');
  description.className = 'ticket-desc';
  description.textContent = ticket.description;
  container.appendChild(description);

  //thread container
  const threadContainer = document.createElement('div');
  threadContainer.className = 'thread-container';

  if (ticket.comments.length === 0) {
    threadContainer.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 2rem;">💬 No comments yet. Be the first to comment!</div>';
  } else {
    ticket.comments.forEach(cmt => {
      const msg = document.createElement('div');
      msg.className = 'thread-message';

      const author = document.createElement('div');
      author.className = 'thread-author';
      author.innerHTML = `
        <span>${getRoleIcon(cmt.role)} ${cmt.author} (${cmt.role})</span>
        <span class="thread-time">${formatTime(cmt.timestamp)}</span>
      `;

      const content = document.createElement('div');
      content.className = 'thread-content';
      content.textContent = cmt.message;

      msg.appendChild(author);
      msg.appendChild(content);
      threadContainer.appendChild(msg);
    });
  }

  container.appendChild(threadContainer);

  //reply section
  if (ticket.status !== 'Closed') {
    const replySection = document.createElement('div');
    replySection.className = 'reply-section';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Add your comment or reply...';
    replySection.appendChild(textarea);

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '📤 Send';
    sendBtn.addEventListener('click', () => {
      const msg = textarea.value.trim();
      if (!msg) {
        alert('Please enter a message.');
        return;
      }
      ticket.comments.push({
        author: currentUser.username,
        role: currentUser.role,
        message: msg,
        timestamp: Date.now()
      });
      ticket.updatedAt = Date.now();
      textarea.value = '';
      renderTicketDetail(ticket);
      renderSidebar();
    });
    replySection.appendChild(sendBtn);
    container.appendChild(replySection);
  } else {
    const closedNotice = document.createElement('div');
    closedNotice.style.cssText = 'text-align: center; padding: 1rem; background: #f8d7da; color: #721c24; border-radius: 10px; margin-top: 1rem;';
    closedNotice.textContent = '🔒 This ticket is closed and cannot be modified.';
    container.appendChild(closedNotice);
  }

  mainContent.appendChild(container);
}

// ticket creation form
function renderTicketForm() {
  mainContent.innerHTML = '';
  const form = document.createElement('form');
  form.className = 'ticket-form';

  const title = document.createElement('h3');
  title.textContent = '➕ Create New Support Ticket';
  form.appendChild(title);

  form.innerHTML += `
    <label for="subject">📝 Subject *</label>
    <input type="text" id="subject" required maxlength="100" placeholder="Brief summary of your issue" autocomplete="off" />

    <label for="description">📄 Description *</label>
    <textarea id="description" required placeholder="Please provide detailed information about your issue..."></textarea>

    <label for="category">📂 Category *</label>
    <select id="category" required>
      <option value="">Select a category</option>
      ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
    </select>

    <label for="attachment">📎 Attachment (Optional)</label>
    <input type="file" id="attachment" disabled title="File upload feature coming soon" />

    <button type="submit">🚀 Submit Ticket</button>
  `;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const subject = form.subject.value.trim();
    const description = form.description.value.trim();
    const category = form.category.value;

    if (!subject || !description || !category) {
      alert('Please fill all required fields.');
      return;
    }

    const newTicket = {
      id: ticketIdCounter++,
      subject,
      description,
      category,
      status: "Open",
      creator: currentUser.username,
      assignedTo: null,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      upvotes: 0,
      downvotes: 0,
    };

    tickets.push(newTicket);
    selectedTicketId = newTicket.id;

    alert('🎉 Ticket created successfully!');
    renderSidebar();
    renderTicketDetail(newTicket);
  });

  mainContent.appendChild(form);
}

//  ticket detail for Support Agent
function renderTicketDetailAgent(ticket) {
  mainContent.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'ticket-detail';

  const title = document.createElement('h3');
  title.textContent = `${getStatusIcon(ticket.status)} ${ticket.subject}`;
  container.appendChild(title);

  // Info grid
  const infoGrid = document.createElement('div');
  infoGrid.className = 'ticket-info-grid';

  const infoItems = [
    { label: 'Category', value: ticket.category },
    { label: 'Status', value: ticket.status },
    { label: 'Created by', value: `${getRoleIcon('enduser')} ${ticket.creator}` },
    { label: 'Assigned To', value: ticket.assignedTo ? `${getRoleIcon('agent')} ${ticket.assignedTo}` : 'Unassigned' },
    { label: 'Created', value: formatTime(ticket.createdAt) },
    { label: 'Last Updated', value: formatTime(ticket.updatedAt) }
  ];

  infoItems.forEach(item => {
    const infoItem = document.createElement('div');
    infoItem.className = 'ticket-info-item';
    infoItem.innerHTML = `
      <div class="ticket-info-label">${item.label}</div>
      <div class="ticket-info-value">${item.value}</div>
    `;
    infoGrid.appendChild(infoItem);
  });

  container.appendChild(infoGrid);

  // Agent actions
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'agent-actions';

  if (ticket.assignedTo !== currentUser.username) {
    const assignBtn = document.createElement('button');
    assignBtn.textContent = '✋ Assign to Me';
    assignBtn.addEventListener('click', () => {
      ticket.assignedTo = currentUser.username;
      ticket.updatedAt = Date.now();
      renderTicketDetailAgent(ticket);
      renderSidebar();
    });
    actionsDiv.appendChild(assignBtn);
  }

  const statusLabel = document.createElement('label');
  statusLabel.textContent = '🔄 Change Status:';
  actionsDiv.appendChild(statusLabel);

  const statusSelect = document.createElement('select');
  ['Open', 'In Progress', 'Resolved', 'Closed'].forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${getStatusIcon(s)} ${s}`;
    if (s === ticket.status) opt.selected = true;
    statusSelect.appendChild(opt);
  });
  statusSelect.addEventListener('change', (e) => {
    ticket.status = e.target.value;
    ticket.updatedAt = Date.now();
    renderTicketDetailAgent(ticket);
    renderSidebar();
  });
  actionsDiv.appendChild(statusSelect);

  container.appendChild(actionsDiv);

  const description = document.createElement('div');
  description.className = 'ticket-desc';
  description.textContent = ticket.description;
  container.appendChild(description);

  // Thread container
  const threadContainer = document.createElement('div');
  threadContainer.className = 'thread-container';

  if (ticket.comments.length === 0) {
    threadContainer.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 2rem;">💬 No comments yet. Start the conversation!</div>';
  } else {
    ticket.comments.forEach(cmt => {
      const msg = document.createElement('div');
      msg.className = 'thread-message';

      const author = document.createElement('div');
      author.className = 'thread-author';
      author.innerHTML = `
        <span>${getRoleIcon(cmt.role)} ${cmt.author} (${cmt.role})</span>
        <span class="thread-time">${formatTime(cmt.timestamp)}</span>
      `;

      const content = document.createElement('div');
      content.className = 'thread-content';
      content.textContent = cmt.message;

      msg.appendChild(author);
      msg.appendChild(content);
      threadContainer.appendChild(msg);
    });
  }

  container.appendChild(threadContainer);

  // Reply form
  if (ticket.status !== 'Closed') {
    const replySection = document.createElement('div');
    replySection.className = 'reply-section';

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Reply to customer or add internal notes...';
    replySection.appendChild(textarea);

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '📤 Send Reply';
    sendBtn.addEventListener('click', () => {
      const msg = textarea.value.trim();
      if (!msg) {
        alert('Please enter a message.');
        return;
      }
      ticket.comments.push({
        author: currentUser.username,
        role: currentUser.role,
        message: msg,
        timestamp: Date.now()
      });
      ticket.updatedAt = Date.now();
      textarea.value = '';
      renderTicketDetailAgent(ticket);
      renderSidebar();
    });
    replySection.appendChild(sendBtn);
    container.appendChild(replySection);
  }

  mainContent.appendChild(container);
}

//  some sample data for demo
function initializeSampleData() {
  // Add sample users
  users['john_doe'] = 'enduser';
  users['sarah_agent'] = 'agent';
  users['admin_mike'] = 'admin';

  //  sample tickets
  const sampleTickets = [
    {
      id: ticketIdCounter++,
      subject: "Login issues with mobile app",
      description: "I can't log into the mobile app. It keeps showing 'Invalid credentials' even though I'm using the correct password.",
      category: "👤 Account",
      status: "Open",
      creator: "john_doe",
      assignedTo: null,
      comments: [],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      upvotes: 2,
      downvotes: 0
    },
    {
      id: ticketIdCounter++,
      subject: "Feature request: Dark mode",
      description: "It would be great to have a dark mode option in the application for better user experience during night time usage.",
      category: "✨ Feature Request",
      status: "In Progress",
      creator: "john_doe",
      assignedTo: "sarah_agent",
      comments: [
        {
          author: "sarah_agent",
          role: "agent",
          message: "Thank you for the suggestion! We're currently working on implementing dark mode. It should be available in the next release.",
          timestamp: Date.now() - 43200000
        }
      ],
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 43200000,
      upvotes: 5,
      downvotes: 1
    }
  ];

  tickets.push(...sampleTickets);
}

// Initialize the demo
function init() {
  initializeSampleData();
  logout();
}

// Start the application
init();
