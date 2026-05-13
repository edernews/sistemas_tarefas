// Supabase Configuration
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// State management
let tasks = [];
let currentFilter = 'Todas';
let currentUser = null;

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const visibleTasksCount = document.getElementById('visible-tasks-count');
const progressPercentage = document.getElementById('progress-percentage');
const progressFill = document.getElementById('progress-fill');
const filterBtns = document.querySelectorAll('.filter-btn');
const btnLogout = document.querySelector('.btn-exit');

// Initialize
async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html';
        return;
    }

    currentUser = session.user;
    document.getElementById('user-display-name').textContent = currentUser.email;
    await fetchTasks();
    setupEventListeners();
}

// Logout Logic (Robust delegation)
document.addEventListener('click', async (e) => {
    if (e.target.closest('.btn-exit')) {
        e.preventDefault();
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Erro ao sair:', err.message);
            // Fallback: force redirect even if signOut fails
            window.location.href = 'index.html';
        }
    }
});

// Fetch Tasks from Supabase
async function fetchTasks() {
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        tasks = data;
        renderTasks();
        updateProgress();
    } catch (err) {
        console.error('Erro ao buscar tarefas:', err.message);
    }
}

// Event Listeners
function setupEventListeners() {
    taskForm.addEventListener('submit', handleAddTask);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
}

// Add Task
async function handleAddTask(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');
    const dateInput = document.getElementById('task-date');
    
    const newTask = {
        title: titleInput.value,
        category: categorySelect.value,
        priority: prioritySelect.value,
        due_date: dateInput.value || 'Sem data',
        completed: false
    };
    
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([newTask])
            .select();

        if (error) throw error;
        
        tasks.unshift(data[0]);
        renderTasks();
        updateProgress();
        
        // Reset form
        taskForm.reset();
        lucide.createIcons();
    } catch (err) {
        alert('Erro ao adicionar tarefa: ' + err.message);
    }
}

// Toggle Task
async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = !task.completed;

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ completed: newStatus })
            .eq('id', id);

        if (error) throw error;

        tasks = tasks.map(t => 
            t.id === id ? { ...t, completed: newStatus } : t
        );
        renderTasks();
        updateProgress();
    } catch (err) {
        alert('Erro ao atualizar tarefa: ' + err.message);
    }
}

// Delete Task
async function deleteTask(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        try {
            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', id);

            if (error) throw error;

            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
            updateProgress();
        } catch (err) {
            alert('Erro ao excluir tarefa: ' + err.message);
        }
    }
}

// Update Progress Bar
function updateProgress() {
    if (tasks.length === 0) {
        progressPercentage.textContent = '0%';
        progressFill.style.width = '0%';
        return;
    }
    
    const completedCount = tasks.filter(t => t.completed).length;
    const percentage = Math.round((completedCount / tasks.length) * 100);
    
    progressPercentage.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
}

// Render Tasks
function renderTasks() {
    let filteredTasks = tasks;
    
    if (currentFilter === 'Pendentes') {
        filteredTasks = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'Concluídas') {
        filteredTasks = tasks.filter(t => t.completed);
    }
    
    visibleTasksCount.textContent = filteredTasks.length;
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <i data-lucide="clipboard-list"></i>
                <p>${tasks.length === 0 ? 'Nenhuma tarefa adicionada ainda.' : 'Nenhuma tarefa corresponde ao filtro.'}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    taskList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="checkbox-container" onclick="toggleTask('${task.id}')">
                <div class="custom-checkbox">
                    <i data-lucide="check"></i>
                </div>
            </div>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    <span class="tag tag-${task.category.toLowerCase()}">${task.category}</span>
                    <span class="priority-${task.priority.toLowerCase()}">
                        <i data-lucide="flag" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i>
                        ${task.priority}
                    </span>
                    <span class="due-date">
                        <i data-lucide="calendar" style="width:12px; height:12px;"></i>
                        ${formatDate(task.due_date)}
                    </span>
                </div>
            </div>
            <button class="btn-delete" onclick="deleteTask('${task.id}')">
                <i data-lucide="trash-2"></i>
            </button>
        </div>
    `).join('');
    
    lucide.createIcons();
}

// Helper: Format Date
function formatDate(dateStr) {
    if (!dateStr || dateStr === 'Sem data') return 'Sem data';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Start the app
init();

