// ===== Gottlieb Family Hub - Main Application Script =====
// Connected to Supabase Backend

// ===== Global State =====
let currentUser = null;
let familyMembers = {};
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = new Date();
let currentWeekStart = getWeekStart(new Date());

// Data caches
let eventsCache = [];
let todoListsCache = [];
let shoppingListsCache = [];
let announcementsCache = [];

// Realtime subscriptions
let subscriptions = [];

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load family members first
        await loadFamilyMembers();
        
        // Set up UI interactions
        setupLoginForm();
        setupNavigation();
        setupModals();
        setupCalendar();
        updateTodayDate();
        
        // Set up widget navigation links
        document.querySelectorAll('[data-goto]').forEach(btn => {
            btn.addEventListener('click', () => {
                navigateToSection(btn.dataset.goto);
            });
        });
        
        console.log('✅ Family Hub initialized successfully!');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        showToast('Failed to connect to database. Please refresh the page.', 'error');
    }
}

// ===== Load Family Members =====
async function loadFamilyMembers() {
    const members = await db.getFamilyMembers();
    familyMembers = {};
    members.forEach(member => {
        familyMembers[member.name] = member;
    });
    
    // Populate login dropdown
    const memberSelect = document.getElementById('family-member');
    memberSelect.innerHTML = '<option value="">Select your name...</option>';
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.name;
        option.textContent = member.display_name;
        memberSelect.appendChild(option);
    });
}

// ===== Login Functionality =====
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const memberSelect = document.getElementById('family-member');
        const passwordInput = document.getElementById('password');
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        const memberName = memberSelect.value;
        const pin = passwordInput.value;
        
        if (!memberName) {
            showToast('Please select your name', 'error');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Checking...</span>';
        
        try {
            const member = familyMembers[memberName];
            const verified = await db.verifyPin(member.id, pin);
            
            if (verified) {
                currentUser = verified;
                await loginSuccess();
            } else {
                // Shake animation for error
                loginForm.classList.add('shake');
                setTimeout(() => loginForm.classList.remove('shake'), 500);
                passwordInput.value = '';
                passwordInput.focus();
                showToast('Incorrect PIN. Try again!', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Come on in</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
        }
    });
}

async function loginSuccess() {
    // Update UI with user info
    document.getElementById('current-user').innerHTML = `
        <span class="user-avatar" style="background: ${currentUser.color}">${currentUser.avatar_letter}</span>
        <span class="user-name">${currentUser.display_name}</span>
    `;
    document.getElementById('dashboard-name').textContent = currentUser.display_name;
    
    // Transition screens
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-app').classList.add('active');
    
    // Load all data
    await loadAllData();
    
    // Set up realtime subscriptions
    setupRealtimeSubscriptions();
    
    showToast(`Welcome back, ${currentUser.display_name}! 🏠`, 'success');
}

async function loadAllData() {
    try {
        // Load everything in parallel
        await Promise.all([
            loadDashboard(),
            loadCalendarData(),
            loadTodoLists(),
            loadShoppingLists(),
            loadAnnouncements(),
            loadMeals()
        ]);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Logout functionality
document.getElementById('logout-btn')?.addEventListener('click', () => {
    // Clean up subscriptions
    subscriptions.forEach(sub => db.unsubscribe(sub));
    subscriptions = [];
    
    currentUser = null;
    document.getElementById('main-app').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('password').value = '';
    document.getElementById('family-member').value = '';
});

// ===== Realtime Subscriptions =====
function setupRealtimeSubscriptions() {
    // Subscribe to events changes
    subscriptions.push(
        db.subscribeToTable('events', () => {
            loadCalendarData();
            loadDashboardEvents();
        })
    );
    
    // Subscribe to todo items changes
    subscriptions.push(
        db.subscribeToTable('todo_items', () => {
            loadTodoLists();
            loadDashboardTasks();
        })
    );
    
    // Subscribe to shopping items changes
    subscriptions.push(
        db.subscribeToTable('shopping_items', () => {
            loadShoppingLists();
            loadDashboardShopping();
        })
    );
    
    // Subscribe to announcements changes
    subscriptions.push(
        db.subscribeToTable('announcements', () => {
            loadAnnouncements();
            loadDashboardAnnouncements();
        })
    );
    
    // Subscribe to family member status changes
    subscriptions.push(
        db.subscribeToTable('family_members', async () => {
            await loadFamilyMembers();
            loadDashboardFamilyStatus();
        })
    );
}

// ===== Dashboard =====
async function loadDashboard() {
    await Promise.all([
        loadDashboardEvents(),
        loadDashboardTasks(),
        loadDashboardAnnouncements(),
        loadDashboardShopping(),
        loadDashboardMeals(),
        loadDashboardFamilyStatus()
    ]);
}

async function loadDashboardEvents() {
    try {
        const events = await db.getUpcomingEvents(3);
        const container = document.querySelector('.widget-events .widget-content');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="empty-message">No upcoming events</p>';
            return;
        }
        
        container.innerHTML = await Promise.all(events.map(async event => {
            const rsvps = await db.getRSVPsForEvent(event.id);
            const goingCount = rsvps.filter(r => r.status === 'going').length;
            const pendingCount = rsvps.filter(r => r.status === 'pending').length;
            
            const date = new Date(event.event_date + 'T00:00:00');
            const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = date.getDate();
            
            return `
                <div class="event-preview">
                    <div class="event-date-badge" style="background: var(--${event.color || 'terracotta'})">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="event-info">
                        <h4>${event.title}</h4>
                        <p>${event.event_time ? formatTime(event.event_time) : ''} ${event.location ? 'at ' + event.location : ''}</p>
                        <div class="rsvp-status">
                            ${goingCount > 0 ? `<span class="rsvp-yes">${goingCount} going</span>` : ''}
                            ${pendingCount > 0 ? `<span class="rsvp-pending">${pendingCount} pending</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        })).then(html => html.join(''));
    } catch (error) {
        console.error('Error loading dashboard events:', error);
    }
}

async function loadDashboardTasks() {
    try {
        const allItems = await db.getTodoItems();
        const myTasks = allItems.filter(item => 
            !item.completed && 
            (item.assigned_to === currentUser.id || !item.assigned_to)
        ).slice(0, 3);
        
        const container = document.querySelector('.widget-tasks .widget-content');
        
        if (myTasks.length === 0) {
            container.innerHTML = '<p class="empty-message">No tasks! Enjoy your day 🎉</p>';
            return;
        }
        
        container.innerHTML = `
            <ul class="task-preview-list">
                ${myTasks.map(task => `
                    <li class="task-item ${task.completed ? 'completed' : ''}">
                        <label class="checkbox-container">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                   onchange="toggleDashboardTask('${task.id}', this.checked)">
                            <span class="checkmark"></span>
                        </label>
                        <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                        ${task.due_date ? `<span class="task-due ${isUrgent(task.due_date) ? 'urgent' : ''}">${formatDueDate(task.due_date)}</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    } catch (error) {
        console.error('Error loading dashboard tasks:', error);
    }
}

async function loadDashboardAnnouncements() {
    try {
        const announcements = await db.getAnnouncements();
        const recent = announcements.slice(0, 2);
        
        const container = document.querySelector('.widget-announcements .widget-content');
        
        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-message">No announcements yet</p>';
            return;
        }
        
        container.innerHTML = recent.map(ann => `
            <div class="announcement-card ${ann.is_pinned ? 'pinned' : ''}">
                <div class="announcement-meta">
                    <span class="announcement-author">${ann.author?.display_name || 'Unknown'}</span>
                    <span class="announcement-time">${timeAgo(ann.created_at)}</span>
                    ${ann.is_pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
                </div>
                <p>${truncateText(ann.content, 100)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading dashboard announcements:', error);
    }
}

async function loadDashboardShopping() {
    try {
        const lists = await db.getShoppingLists();
        const container = document.querySelector('.widget-shopping .widget-content');
        
        if (lists.length === 0) {
            container.innerHTML = '<p class="empty-message">No shopping lists</p>';
            return;
        }
        
        const listsWithCounts = await Promise.all(lists.slice(0, 3).map(async list => {
            const items = await db.getShoppingItems(list.id);
            return { ...list, itemCount: items.length };
        }));
        
        container.innerHTML = `
            <div class="shopping-summary">
                ${listsWithCounts.map(list => `
                    <div class="list-preview" onclick="navigateToSection('shopping')">
                        <span class="list-name">${list.emoji} ${list.name}</span>
                        <span class="list-count">${list.itemCount} items</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard shopping:', error);
    }
}

async function loadDashboardMeals() {
    try {
        const today = new Date();
        const weekStart = getWeekStart(today);
        const meals = await db.getMealsForWeek(weekStart);
        
        const container = document.querySelector('.widget-meals .widget-content');
        
        // Get next 3 days of meals
        const days = [];
        for (let i = 0; i < 3; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dinner = meals.find(m => m.meal_date === dateStr && m.meal_type === 'dinner');
            days.push({
                label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
                meal: dinner?.name || 'Not planned'
            });
        }
        
        container.innerHTML = `
            <div class="meal-preview-grid">
                ${days.map(day => `
                    <div class="meal-day">
                        <span class="day-name">${day.label}</span>
                        <span class="meal-name">${day.meal}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard meals:', error);
    }
}

async function loadDashboardFamilyStatus() {
    try {
        const members = Object.values(familyMembers);
        const container = document.querySelector('.widget-whereabouts .widget-content');
        
        container.innerHTML = `
            <div class="family-status-grid">
                ${members.map(member => `
                    <div class="member-status" onclick="updateMyStatus('${member.id}')" 
                         style="cursor: ${member.id === currentUser.id ? 'pointer' : 'default'}">
                        <span class="member-avatar" style="background: ${member.color}">${member.avatar_letter}</span>
                        <span class="member-name">${member.display_name}</span>
                        <span class="status-badge">${member.status_emoji || '🏠'} ${member.status || 'Home'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading family status:', error);
    }
}

// ===== Navigation =====
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            navigateToSection(sectionId);
        });
    });
}

function navigateToSection(sectionId) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    
    // Show correct section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
}

// ===== Modal Management =====
function setupModals() {
    // Event Modal
    const eventModal = document.getElementById('event-modal');
    const addEventBtn = document.getElementById('add-event-btn');
    const eventForm = document.getElementById('event-form');
    
    addEventBtn?.addEventListener('click', () => {
        populateEventInvites();
        openModal(eventModal);
    });
    
    eventForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createEvent();
        closeModal(eventModal);
        eventForm.reset();
    });
    
    // Todo Modal
    const todoModal = document.getElementById('todo-modal');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoForm = document.getElementById('todo-form');
    
    addTodoBtn?.addEventListener('click', () => {
        populateTodoAssignees();
        populateTodoLists();
        openModal(todoModal);
    });
    
    todoForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createTodo();
        closeModal(todoModal);
        todoForm.reset();
    });
    
    // Announcement Modal
    const announcementModal = document.getElementById('announcement-modal');
    const newAnnouncementBtn = document.getElementById('new-announcement-btn');
    const announcementForm = document.getElementById('announcement-form');
    
    newAnnouncementBtn?.addEventListener('click', () => openModal(announcementModal));
    
    announcementForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createAnnouncement();
        closeModal(announcementModal);
        announcementForm.reset();
    });
    
    // Close modal buttons
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Color picker in event modal
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
        });
    });
}

function populateEventInvites() {
    const container = document.querySelector('.invite-checkboxes');
    container.innerHTML = Object.values(familyMembers).map(member => `
        <label class="checkbox-label">
            <input type="checkbox" name="invite" value="${member.id}" checked> ${member.display_name}
        </label>
    `).join('');
}

function populateTodoAssignees() {
    const select = document.getElementById('todo-assignee');
    select.innerHTML = '<option value="">Anyone</option>';
    Object.values(familyMembers).forEach(member => {
        select.innerHTML += `<option value="${member.id}">${member.display_name}</option>`;
    });
}

function populateTodoLists() {
    const select = document.getElementById('todo-list-select');
    select.innerHTML = todoListsCache.map(list => 
        `<option value="${list.id}">${list.emoji} ${list.name}</option>`
    ).join('');
    select.innerHTML += '<option value="new">+ Create New List</option>';
}

function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== Event Creation =====
async function createEvent() {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const location = document.getElementById('event-location').value;
    const description = document.getElementById('event-description').value;
    const color = document.querySelector('.color-option.active')?.dataset.color || 'terracotta';
    const invites = Array.from(document.querySelectorAll('input[name="invite"]:checked')).map(cb => cb.value);
    
    try {
        const event = await db.createEvent({
            title,
            event_date: date,
            event_time: time || null,
            location: location || null,
            description: description || null,
            color,
            created_by: currentUser.id
        });
        
        if (invites.length > 0) {
            await db.createEventInvites(event.id, invites);
        }
        
        await loadCalendarData();
        await loadDashboardEvents();
        showToast('Event created! 📅', 'success');
    } catch (error) {
        console.error('Error creating event:', error);
        showToast('Failed to create event', 'error');
    }
}

// ===== Todo Creation =====
async function createTodo() {
    const text = document.getElementById('todo-title').value;
    const assignee = document.getElementById('todo-assignee').value;
    const dueDate = document.getElementById('todo-due').value;
    const listId = document.getElementById('todo-list-select').value;
    const priority = document.querySelector('input[name="priority"]:checked')?.value || 'medium';
    
    try {
        if (listId === 'new') {
            const listName = prompt('Enter new list name:');
            if (!listName) return;
            const newList = await db.createTodoList(listName, '📋', currentUser.id);
            await db.createTodoItem({
                list_id: newList.id,
                text,
                assigned_to: assignee || null,
                due_date: dueDate || null,
                priority,
                created_by: currentUser.id
            });
        } else {
            await db.createTodoItem({
                list_id: listId,
                text,
                assigned_to: assignee || null,
                due_date: dueDate || null,
                priority,
                created_by: currentUser.id
            });
        }
        
        await loadTodoLists();
        await loadDashboardTasks();
        showToast('Task added! ✓', 'success');
    } catch (error) {
        console.error('Error creating todo:', error);
        showToast('Failed to add task', 'error');
    }
}

// ===== Announcement Creation =====
async function createAnnouncement() {
    const title = document.getElementById('announcement-title').value;
    const content = document.getElementById('announcement-content').value;
    const isPinned = document.getElementById('pin-announcement').checked;
    
    try {
        await db.createAnnouncement({
            title: title || null,
            content,
            is_pinned: isPinned,
            author_id: currentUser.id
        });
        
        await loadAnnouncements();
        await loadDashboardAnnouncements();
        showToast('Announcement posted! 📢', 'success');
    } catch (error) {
        console.error('Error creating announcement:', error);
        showToast('Failed to post announcement', 'error');
    }
}

// ===== Calendar =====
function setupCalendar() {
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

async function loadCalendarData() {
    try {
        eventsCache = await db.getEvents();
        renderCalendar();
        renderEventsForDate(selectedDate);
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

function renderCalendar() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById('calendar-month-year').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    // Previous month's trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
        const dayEl = createDayElement(prevMonthLastDay - i, true);
        calendarDays.appendChild(dayEl);
    }
    
    // Current month's days
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const dayEvents = getEventsForDate(date);
        
        const dayEl = createDayElement(day, false, isToday, isSelected, dayEvents);
        dayEl.addEventListener('click', () => {
            selectedDate = new Date(currentYear, currentMonth, day);
            renderCalendar();
            renderEventsForDate(selectedDate);
        });
        calendarDays.appendChild(dayEl);
    }
    
    // Next month's leading days
    const remainingDays = 42 - (startingDay + totalDays);
    for (let i = 1; i <= remainingDays; i++) {
        const dayEl = createDayElement(i, true);
        calendarDays.appendChild(dayEl);
    }
}

function createDayElement(day, isOtherMonth, isToday = false, isSelected = false, events = []) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    if (isToday) dayEl.classList.add('today');
    if (isSelected) dayEl.classList.add('selected');
    
    dayEl.innerHTML = `
        <span class="day-number">${day}</span>
        <div class="event-dots">
            ${events.slice(0, 3).map(e => `<span class="event-dot" style="background: var(--${e.color || 'terracotta'})"></span>`).join('')}
        </div>
    `;
    
    return dayEl;
}

function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return eventsCache.filter(event => event.event_date === dateStr);
}

async function renderEventsForDate(date) {
    const eventsList = document.getElementById('events-list');
    const dateTitle = document.getElementById('selected-date-title');
    
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
        dateTitle.textContent = "Today's Events";
    } else {
        dateTitle.textContent = `Events for ${date.toLocaleDateString('en-US', options)}`;
    }
    
    const dayEvents = getEventsForDate(date);
    
    if (dayEvents.length === 0) {
        eventsList.innerHTML = `
            <div class="empty-state">
                <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
                    No events scheduled for this day.<br>
                    <button class="btn btn-primary" style="margin-top: 1rem;" onclick="document.getElementById('add-event-btn').click()">
                        Add Event
                    </button>
                </p>
            </div>
        `;
        return;
    }
    
    const eventsHtml = await Promise.all(dayEvents.map(async event => {
        const rsvps = await db.getRSVPsForEvent(event.id);
        const myRsvp = rsvps.find(r => r.member_id === currentUser.id);
        
        return `
            <div class="event-card" style="border-left-color: var(--${event.color || 'terracotta'})">
                <h4>${event.title}</h4>
                <p class="event-time">${event.event_time ? formatTime(event.event_time) : 'All day'}</p>
                ${event.location ? `<p class="event-location">📍 ${event.location}</p>` : ''}
                <div class="rsvp-buttons">
                    <button class="rsvp-btn ${myRsvp?.status === 'going' ? 'going' : ''}" 
                            onclick="updateRSVP('${event.id}', 'going')">
                        ✓ Going
                    </button>
                    <button class="rsvp-btn ${myRsvp?.status === 'maybe' ? 'maybe' : ''}"
                            onclick="updateRSVP('${event.id}', 'maybe')">
                        ? Maybe
                    </button>
                    <button class="rsvp-btn ${myRsvp?.status === 'declined' ? 'declined' : ''}"
                            onclick="updateRSVP('${event.id}', 'declined')">
                        ✕ Can't
                    </button>
                </div>
            </div>
        `;
    }));
    
    eventsList.innerHTML = eventsHtml.join('');
}

async function updateRSVP(eventId, status) {
    try {
        await db.setRSVP(eventId, currentUser.id, status);
        await renderEventsForDate(selectedDate);
        await loadDashboardEvents();
        showToast(`RSVP updated to "${status}"`, 'success');
    } catch (error) {
        console.error('Error updating RSVP:', error);
        showToast('Failed to update RSVP', 'error');
    }
}

// ===== Todo Lists =====
async function loadTodoLists() {
    try {
        todoListsCache = await db.getTodoLists();
        const container = document.querySelector('.todo-lists-container');
        
        const listsHtml = await Promise.all(todoListsCache.map(async list => {
            const items = await db.getTodoItems(list.id);
            const activeCount = items.filter(i => !i.completed).length;
            
            return `
                <div class="todo-list-card" data-list-id="${list.id}">
                    <div class="todo-list-header">
                        <h3>${list.emoji} ${list.name}</h3>
                        <span class="todo-count">${activeCount} tasks</span>
                    </div>
                    <ul class="todo-list">
                        ${items.map(item => `
                            <li class="todo-item ${item.completed ? 'completed' : ''}" 
                                data-priority="${item.priority}" data-item-id="${item.id}">
                                <label class="checkbox-container">
                                    <input type="checkbox" ${item.completed ? 'checked' : ''} 
                                           onchange="toggleTodoItem('${item.id}', this.checked)">
                                    <span class="checkmark"></span>
                                </label>
                                <div class="todo-content">
                                    <span class="todo-text">${item.text}</span>
                                    <div class="todo-meta">
                                        <span class="assigned-to">${item.assigned_to_member?.display_name || 'Anyone'}</span>
                                        ${item.due_date ? `<span class="due-date ${isUrgent(item.due_date) ? 'urgent' : ''}">${formatDueDate(item.due_date)}</span>` : ''}
                                    </div>
                                </div>
                                <button class="btn-icon todo-actions" onclick="deleteTodoItem('${item.id}')">🗑️</button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }));
        
        container.innerHTML = listsHtml.join('');
        
        // Set up filter buttons
        setupTodoFilters();
    } catch (error) {
        console.error('Error loading todo lists:', error);
    }
}

function setupTodoFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTodos(btn.dataset.filter);
        });
    });
}

function filterTodos(filter) {
    const items = document.querySelectorAll('.todo-item');
    items.forEach(item => {
        const isCompleted = item.classList.contains('completed');
        const assignedTo = item.querySelector('.assigned-to')?.textContent;
        
        let show = true;
        switch (filter) {
            case 'mine':
                show = assignedTo === currentUser.display_name || assignedTo === 'Anyone';
                break;
            case 'completed':
                show = isCompleted;
                break;
            case 'shared':
                show = assignedTo === 'Anyone';
                break;
        }
        item.style.display = show ? '' : 'none';
    });
}

async function toggleTodoItem(itemId, completed) {
    try {
        await db.toggleTodoItem(itemId, completed);
    } catch (error) {
        console.error('Error toggling todo:', error);
        showToast('Failed to update task', 'error');
    }
}

async function toggleDashboardTask(itemId, completed) {
    await toggleTodoItem(itemId, completed);
    await loadDashboardTasks();
}

async function deleteTodoItem(itemId) {
    if (!confirm('Delete this task?')) return;
    try {
        await db.deleteTodoItem(itemId);
        await loadTodoLists();
        showToast('Task deleted', 'success');
    } catch (error) {
        console.error('Error deleting todo:', error);
        showToast('Failed to delete task', 'error');
    }
}

// ===== Shopping Lists =====
async function loadShoppingLists() {
    try {
        shoppingListsCache = await db.getShoppingLists();
        const container = document.querySelector('.shopping-lists-grid');
        
        const listsHtml = await Promise.all(shoppingListsCache.map(async list => {
            const items = await db.getShoppingItems(list.id);
            const checkedCount = items.filter(i => i.checked).length;
            const totalCount = items.length;
            const percentage = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
            
            return `
                <div class="shopping-list-card ${list.is_featured ? 'featured' : ''}" data-list-id="${list.id}">
                    <div class="shopping-list-header">
                        <div class="list-title-section">
                            <span class="list-emoji">${list.emoji}</span>
                            <h3>${list.name}</h3>
                        </div>
                        <div class="list-actions">
                            <button class="btn-icon" title="More options">⋮</button>
                        </div>
                    </div>
                    <div class="shopping-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="progress-text">${checkedCount} of ${totalCount} items</span>
                    </div>
                    <ul class="shopping-items">
                        ${items.map(item => `
                            <li class="shopping-item ${item.checked ? 'checked' : ''}" data-item-id="${item.id}">
                                <label class="checkbox-container">
                                    <input type="checkbox" ${item.checked ? 'checked' : ''} 
                                           onchange="toggleShoppingItem('${item.id}', this.checked)">
                                    <span class="checkmark"></span>
                                </label>
                                <span class="item-name">${item.name}</span>
                                <span class="item-added-by">${item.added_by_member?.display_name || ''}</span>
                            </li>
                        `).join('')}
                    </ul>
                    <div class="add-item-form">
                        <input type="text" placeholder="Add an item..." class="add-item-input" 
                               onkeypress="handleShoppingItemKeypress(event, '${list.id}')">
                        <button class="btn btn-small" onclick="addShoppingItem('${list.id}')">Add</button>
                    </div>
                </div>
            `;
        }));
        
        container.innerHTML = listsHtml.join('');
    } catch (error) {
        console.error('Error loading shopping lists:', error);
    }
}

async function toggleShoppingItem(itemId, checked) {
    try {
        await db.toggleShoppingItem(itemId, checked);
    } catch (error) {
        console.error('Error toggling shopping item:', error);
        showToast('Failed to update item', 'error');
    }
}

function handleShoppingItemKeypress(event, listId) {
    if (event.key === 'Enter') {
        addShoppingItem(listId);
    }
}

async function addShoppingItem(listId) {
    const card = document.querySelector(`[data-list-id="${listId}"]`);
    const input = card.querySelector('.add-item-input');
    const name = input.value.trim();
    
    if (!name) return;
    
    try {
        await db.createShoppingItem(listId, name, currentUser.id);
        input.value = '';
        await loadShoppingLists();
    } catch (error) {
        console.error('Error adding shopping item:', error);
        showToast('Failed to add item', 'error');
    }
}

// ===== Announcements =====
async function loadAnnouncements() {
    try {
        announcementsCache = await db.getAnnouncements();
        const container = document.querySelector('.announcements-feed');
        
        const announcementsHtml = await Promise.all(announcementsCache.map(async ann => {
            const reactions = await db.getReactionsForAnnouncement(ann.id);
            const comments = await db.getCommentsForAnnouncement(ann.id);
            
            // Group reactions by emoji
            const reactionCounts = {};
            reactions.forEach(r => {
                if (!reactionCounts[r.emoji]) {
                    reactionCounts[r.emoji] = { count: 0, hasUserReacted: false };
                }
                reactionCounts[r.emoji].count++;
                if (r.member_id === currentUser.id) {
                    reactionCounts[r.emoji].hasUserReacted = true;
                }
            });
            
            return `
                <article class="announcement-full ${ann.is_pinned ? 'pinned' : ''}" data-announcement-id="${ann.id}">
                    <div class="announcement-header">
                        <div class="author-info">
                            <span class="author-avatar" style="background: ${ann.author?.color || '#ccc'}">${ann.author?.avatar_letter || '?'}</span>
                            <div class="author-details">
                                <span class="author-name">${ann.author?.display_name || 'Unknown'}</span>
                                <span class="post-time">${timeAgo(ann.created_at)}</span>
                            </div>
                        </div>
                        <div class="announcement-badges">
                            ${ann.is_pinned ? '<span class="badge pinned">📌 Pinned</span>' : ''}
                            <button class="btn-icon">⋮</button>
                        </div>
                    </div>
                    <div class="announcement-body">
                        ${ann.title ? `<h3>${ann.title}</h3>` : ''}
                        <p>${ann.content}</p>
                    </div>
                    <div class="announcement-reactions">
                        ${['❤️', '👍', '😂', '🎉'].map(emoji => {
                            const data = reactionCounts[emoji] || { count: 0, hasUserReacted: false };
                            return `
                                <button class="reaction-btn ${data.hasUserReacted ? 'active' : ''}" 
                                        onclick="toggleReaction('${ann.id}', '${emoji}')">
                                    ${emoji}${data.count > 0 ? ' ' + data.count : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>
                    ${comments.length > 0 || true ? `
                        <div class="announcement-comments">
                            ${comments.map(comment => `
                                <div class="comment">
                                    <span class="comment-avatar" style="background: ${comment.author?.color || '#ccc'}">${comment.author?.avatar_letter || '?'}</span>
                                    <div class="comment-content">
                                        <span class="comment-author">${comment.author?.display_name || 'Unknown'}</span>
                                        <p>${comment.content}</p>
                                    </div>
                                </div>
                            `).join('')}
                            <div class="add-comment">
                                <input type="text" placeholder="Add a comment..." 
                                       onkeypress="handleCommentKeypress(event, '${ann.id}')">
                                <button class="btn btn-small" onclick="addComment('${ann.id}')">Post</button>
                            </div>
                        </div>
                    ` : ''}
                </article>
            `;
        }));
        
        container.innerHTML = announcementsHtml.join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

async function toggleReaction(announcementId, emoji) {
    try {
        await db.toggleReaction(announcementId, currentUser.id, emoji);
        await loadAnnouncements();
    } catch (error) {
        console.error('Error toggling reaction:', error);
    }
}

function handleCommentKeypress(event, announcementId) {
    if (event.key === 'Enter') {
        addComment(announcementId);
    }
}

async function addComment(announcementId) {
    const article = document.querySelector(`[data-announcement-id="${announcementId}"]`);
    const input = article.querySelector('.add-comment input');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        await db.createComment(announcementId, currentUser.id, content);
        input.value = '';
        await loadAnnouncements();
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
    }
}

// ===== Meals =====
async function loadMeals() {
    try {
        const meals = await db.getMealsForWeek(currentWeekStart);
        renderMealPlanner(meals);
    } catch (error) {
        console.error('Error loading meals:', error);
    }
}

function renderMealPlanner(meals) {
    const container = document.querySelector('.meal-planner-grid');
    const weekTitle = document.getElementById('meal-week-title');
    
    const startDate = new Date(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    
    weekTitle.textContent = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    const today = new Date();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const isToday = date.toDateString() === today.toDateString();
        
        const dayMeals = {
            breakfast: meals.find(m => m.meal_date === dateStr && m.meal_type === 'breakfast'),
            lunch: meals.find(m => m.meal_date === dateStr && m.meal_type === 'lunch'),
            dinner: meals.find(m => m.meal_date === dateStr && m.meal_type === 'dinner')
        };
        
        days.push({ date, dateStr, isToday, meals: dayMeals });
    }
    
    container.innerHTML = days.map(day => `
        <div class="meal-day-card ${day.isToday ? 'today' : ''}">
            <div class="meal-day-header">
                <span class="day-label">${day.date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                <span class="day-date">${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                ${day.isToday ? '<span class="today-badge">Today</span>' : ''}
            </div>
            ${['breakfast', 'lunch', 'dinner'].map(type => {
                const meal = day.meals[type];
                const emoji = type === 'breakfast' ? '🍳' : type === 'lunch' ? '🥗' : '🍽️';
                return `
                    <div class="meal-slot ${meal ? 'filled' : ''}" onclick="promptMeal('${day.dateStr}', '${type}')">
                        <span class="meal-type">${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        <span class="meal-content ${meal ? '' : 'empty'}">${meal?.name || '+ Add'}</span>
                        ${meal?.chef ? `<span class="meal-chef">Chef: ${meal.chef.display_name}</span>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
    
    // Set up week navigation
    document.getElementById('prev-week')?.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        loadMeals();
    });
    
    document.getElementById('next-week')?.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        loadMeals();
    });
}

async function promptMeal(dateStr, mealType) {
    const name = prompt(`What's for ${mealType} on ${dateStr}?`);
    if (!name) return;
    
    try {
        await db.setMeal(dateStr, mealType, name, currentUser.id);
        await loadMeals();
        await loadDashboardMeals();
        showToast('Meal planned! 🍽️', 'success');
    } catch (error) {
        console.error('Error setting meal:', error);
        showToast('Failed to plan meal', 'error');
    }
}

// ===== Status Update =====
async function updateMyStatus(memberId) {
    if (memberId !== currentUser.id) return;
    
    const statuses = [
        { status: 'Home', emoji: '🏠' },
        { status: 'Work', emoji: '💼' },
        { status: 'School', emoji: '📚' },
        { status: 'Out', emoji: '🚗' },
        { status: 'Gym', emoji: '💪' },
        { status: 'Shopping', emoji: '🛒' }
    ];
    
    const choice = prompt(`Update your status:\n${statuses.map((s, i) => `${i + 1}. ${s.emoji} ${s.status}`).join('\n')}\n\nEnter number:`);
    
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < statuses.length) {
        try {
            await db.updateMemberStatus(currentUser.id, statuses[index].status, statuses[index].emoji);
            currentUser.status = statuses[index].status;
            currentUser.status_emoji = statuses[index].emoji;
            showToast(`Status updated to ${statuses[index].emoji} ${statuses[index].status}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Failed to update status', 'error');
        }
    }
}

// ===== Utility Functions =====
function updateTodayDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
        dateEl.textContent = today.toLocaleDateString('en-US', options);
    }
}

function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (date < today) return 'Overdue';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isUrgent(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return date <= tomorrow;
}

function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add styles if not already present
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 24px;
                border-radius: 12px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                animation: toastIn 0.3s ease, toastOut 0.3s ease 2.7s;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            .toast-success { background: #7BA87B; }
            .toast-error { background: #C4755C; }
            .toast-info { background: #7B9BAA; }
            @keyframes toastIn {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes toastOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Add shake animation CSS
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    .shake { animation: shake 0.5s ease-in-out; }
    .empty-message {
        color: var(--text-muted);
        text-align: center;
        padding: 1rem;
        font-style: italic;
    }
`;
document.head.appendChild(shakeStyle);

// Make functions globally available
window.updateRSVP = updateRSVP;
window.toggleTodoItem = toggleTodoItem;
window.toggleDashboardTask = toggleDashboardTask;
window.deleteTodoItem = deleteTodoItem;
window.toggleShoppingItem = toggleShoppingItem;
window.addShoppingItem = addShoppingItem;
window.handleShoppingItemKeypress = handleShoppingItemKeypress;
window.toggleReaction = toggleReaction;
window.addComment = addComment;
window.handleCommentKeypress = handleCommentKeypress;
window.promptMeal = promptMeal;
window.updateMyStatus = updateMyStatus;
window.navigateToSection = navigateToSection;
