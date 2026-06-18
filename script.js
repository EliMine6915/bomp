// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL = "https://azjolejrfglvqwuqoxyt.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_eEfPK72iOaXYEZjhhdh1zA_0IMWBUya"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// DOM ELEMENTS
// ============================================

const todoInput = document.getElementById("todoInput");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");
const inputContainer = document.getElementById("inputContainer");
const notificationContainer = document.getElementById("notificationContainer");

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authCard = document.getElementById("authCard");
const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");

const verificationCard = document.getElementById("verificationCard");
const verificationEmail = document.getElementById("verificationEmail");
const backToAuthBtn = document.getElementById("backToAuthBtn");
const resendBtn = document.getElementById("resendBtn");
const resendHint = document.getElementById("resendHint");

// ============================================
// STATE
// ============================================

let currentUser = null;
let todoSubscription = null;
let registeredEmail = null;
let resendCountdown = 0;

// ============================================
// NOTIFICATIONS / TOASTS
// ============================================

function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = type === "success" ? "ph-check-circle" : "ph-warning-circle";

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span class="toast-text">${message}</span>
    `;

    notificationContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(420px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// TODO MANAGEMENT
// ============================================

async function loadTodos() {
    if (!currentUser) return;
    todoList.innerHTML = "";

    const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading todos:", error);
        showToast("Failed to load tasks: " + error.message, "error");
        return;
    }

    if (data && data.length > 0) {
        data.forEach(renderTodo);
    } else {
        todoList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">No tasks yet. Create your first one below!</p>';
    }
}

function renderTodo(todo) {
    const item = document.createElement("div");
    item.className = todo.completed ? "todo-item completed" : "todo-item";
    item.dataset.todoId = todo.id;

    item.innerHTML = `
        <button class="icon-btn check-btn" title="${todo.completed ? 'Mark incomplete' : 'Mark complete'}">
            <i class="ph ${todo.completed ? "ph-check-circle-fill" : "ph-circle"}"></i>
        </button>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="icon-btn delete-btn" title="Delete task">
            <i class="ph ph-trash"></i>
        </button>
    `;

    // Toggle completion status
    item.querySelector(".check-btn").addEventListener("click", async () => {
        const { error } = await supabase
            .from("todos")
            .update({ completed: !todo.completed })
            .eq("id", todo.id);
        
        if (error) {
            console.error("Error updating todo:", error);
            showToast("Failed to update task: " + error.message, "error");
        }
    });

    // Delete todo
    item.querySelector(".delete-btn").addEventListener("click", async () => {
        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", todo.id);

        if (error) {
            console.error("Error deleting todo:", error);
            showToast("Failed to delete task: " + error.message, "error");
        }
    });

    todoList.appendChild(item);
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text || !currentUser) return;

    addBtn.disabled = true;

    const { error } = await supabase
        .from("todos")
        .insert({
            text,
            user_id: currentUser.id,
            completed: false
        });

    addBtn.disabled = false;

    if (error) {
        console.error("Error adding todo:", error);
        showToast("Failed to create task: " + error.message, "error");
    } else {
        todoInput.value = "";
        todoInput.focus();
        showToast("Task added!", "success");
    }
}

// Subscribe to real-time updates
function subscribeToTodos() {
    if (todoSubscription) {
        supabase.removeChannel(todoSubscription);
    }

    todoSubscription = supabase
        .channel('public:todos')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'todos',
            filter: `user_id=eq.${currentUser.id}`
        }, () => {
            loadTodos(); 
        })
        .subscribe();
}

function unsubscribeFromTodos() {
    if (todoSubscription) {
        supabase.removeChannel(todoSubscription);
        todoSubscription = null;
    }
}

// ============================================
// AUTHENTICATION
// ============================================

async function login() {
    const emailValue = email.value.trim();
    const passwordValue = password.value;

    if (!emailValue || !passwordValue) {
        showToast("Please enter email and password", "error");
        return;
    }

    loginBtn.disabled = true;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue
    });

    loginBtn.disabled = false;

    if (error) {
        console.error("Login error:", error);
        
        if (error.message.includes("Email not confirmed")) {
            showToast("Please confirm your email address first", "error");
            // Show verification screen
            registeredEmail = emailValue;
            showVerificationScreen(emailValue);
        } else if (error.message.includes("Invalid login credentials")) {
            showToast("Invalid email or password", "error");
        } else {
            showToast("Sign in failed: " + error.message, "error");
        }
    } else {
        showToast("Welcome back!", "success");
    }
}

async function register() {
    const emailValue = email.value.trim();
    const passwordValue = password.value;

    if (!emailValue || !passwordValue) {
        showToast("Please enter email and password", "error");
        return;
    }

    if (passwordValue.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        showToast("Please enter a valid email address", "error");
        return;
    }

    registerBtn.disabled = true;

    const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
        options: {
            emailRedirectTo: window.location.origin
        }
    });

    registerBtn.disabled = false;

    if (error) {
        console.error("Registration error:", error);
        
        if (error.message.includes("already registered")) {
            showToast("This email is already registered. Please log in instead.", "error");
        } else if (error.message.includes("invalid")) {
            showToast("Invalid email format", "error");
        } else {
            showToast("Registration failed: " + error.message, "error");
        }
    } else {
        // Show verification screen
        registeredEmail = emailValue;
        showVerificationScreen(emailValue);
        showToast("Check your email to confirm registration!", "success");
    }
}

async function resendConfirmationEmail() {
    if (!registeredEmail) return;
    
    if (resendCountdown > 0) {
        showToast(`Wait ${resendCountdown} seconds before resending`, "error");
        return;
    }

    resendBtn.disabled = true;

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail
    });

    if (error) {
        console.error("Resend error:", error);
        showToast("Failed to resend: " + error.message, "error");
        resendBtn.disabled = false;
    } else {
        showToast("Confirmation email sent!", "success");
        
        // Start countdown
        resendCountdown = 60;
        resendBtn.textContent = "Resend (" + resendCountdown + "s)";
        
        const interval = setInterval(() => {
            resendCountdown--;
            if (resendCountdown <= 0) {
                clearInterval(interval);
                resendBtn.textContent = "Resend confirmation";
                resendBtn.disabled = false;
            } else {
                resendBtn.textContent = "Resend (" + resendCountdown + "s)";
            }
        }, 1000);
    }
}

async function logout() {
    logoutBtn.disabled = true;
    unsubscribeFromTodos();
    
    const { error } = await supabase.auth.signOut();
    
    logoutBtn.disabled = false;

    if (error) {
        console.error("Logout error:", error);
        showToast("Logout failed: " + error.message, "error");
    } else {
        showToast("Signed out successfully", "success");
    }
}

// ============================================
// UI STATE MANAGEMENT
// ============================================

function showVerificationScreen(emailValue) {
    email.value = "";
    password.value = "";
    verificationEmail.textContent = emailValue;
    
    authCard.classList.add("hidden");
    verificationCard.classList.remove("hidden");
    userBar.classList.add("hidden");
    inputContainer.classList.add("hidden");
    
    resendCountdown = 0;
    resendBtn.disabled = false;
    resendBtn.textContent = "Resend confirmation";
}

function hideVerificationScreen() {
    verificationCard.classList.add("hidden");
    authCard.classList.remove("hidden");
    registeredEmail = null;
    resendCountdown = 0;
}

function handleAuthStateChange(session) {
    if (!session) {
        // User is logged out
        currentUser = null;
        todoList.innerHTML = "";
        userEmail.textContent = "";
        
        authCard.classList.remove("hidden");
        verificationCard.classList.add("hidden");
        userBar.classList.add("hidden");
        inputContainer.classList.add("hidden");
        unsubscribeFromTodos();

        email.value = "";
        password.value = "";
    } else {
        // User is logged in
        currentUser = session.user;
        userEmail.textContent = session.user.email;
        
        authCard.classList.add("hidden");
        verificationCard.classList.add("hidden");
        userBar.classList.remove("hidden");
        inputContainer.classList.remove("hidden");
        
        subscribeToTodos(); 
        loadTodos();        
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);
addBtn.addEventListener("click", addTodo);
backToAuthBtn.addEventListener("click", hideVerificationScreen);
resendBtn.addEventListener("click", resendConfirmationEmail);

email.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        password.focus();
    }
});

password.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        login();
    }
});

todoInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        addTodo();
    }
});

// ============================================
// INITIALIZATION
// ============================================

// Check for verification token in URL
window.addEventListener('load', async () => {
    const hash = window.location.hash;
    
    if (hash.includes('type=signup') || hash.includes('access_token')) {
        // URL has auth callback, let Supabase handle it
        const result = await supabase.auth.getSession();
    }
});

// Check for existing session on page load
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event);
    handleAuthStateChange(session);
});

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
