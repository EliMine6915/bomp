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

// Eindeutige Namen gewählt, um Konflikte mit dem globalen 'window'-Objekt zu vermeiden
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authCard = document.getElementById("authCard");
const userBar = document.getElementById("userBar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const verificationCard = document.getElementById("verificationCard");
const verificationEmail = document.getElementById("verificationEmail");
const backToAuthBtn = document.getElementById("backToAuthBtn");
const resendBtn = document.getElementById("resendBtn");
const resendHint = document.getElementById("resendHint");

// Neue Elemente für die OTP Verifizierung
const otpCodeInput = document.getElementById("otpCode");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

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
// AUTHENTICATION (Auf OTP umgestellt)
// ============================================

async function handleOtpRequest(isRegistering = false) {
    const emailValue = emailInput.value.trim();
    const nameValue = nameInput.value.trim();

    if (isRegistering && !nameValue) {
        showToast("Please enter your name", "error");
        nameInput.focus();
        return;
    }

    if (!emailValue) {
        showToast("Please enter your email address", "error");
        emailInput.focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
        showToast("Please enter a valid email address", "error");
        return;
    }

    loginBtn.disabled = true;
    registerBtn.disabled = true;

    // Fordert ein numerisches OTP per E-Mail an.
    // Falls der User neu ist, legt 'shouldCreateUser: true' den Account an.
    const { data, error } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
            data: isRegistering ? { full_name: nameValue } : {},
            shouldCreateUser: isRegistering
        }
    });

    loginBtn.disabled = false;
    registerBtn.disabled = false;

    if (error) {
        console.error("OTP Request Error:", error);
        showToast("Authentication failed: " + error.message, "error");
    } else {
        registeredEmail = emailValue;
        showVerificationScreen(emailValue);
        showToast("Verification code sent to your email!", "success");
    }
}

async function verifyOtpCode() {
    const code = otpCodeInput.value.trim();
    
    if (!code) {
        showToast("Please enter the verification code", "error");
        otpCodeInput.focus();
        return;
    }

    if (!registeredEmail) {
        showToast("Session expired. Please request a new code.", "error");
        hideVerificationScreen();
        return;
    }

    verifyOtpBtn.disabled = true;

    // Verifiziert den 6-8 stelligen Code beim Server
    const { data, error } = await supabase.auth.verifyOtp({
        email: registeredEmail,
        token: code,
        type: 'email'
    });

    verifyOtpBtn.disabled = false;

    if (error) {
        console.error("Verification Error:", error);
        showToast("Invalid or expired code. Please try again.", "error");
    } else {
        showToast("Successfully signed in!", "success");
    }
}

async function resendConfirmationEmail() {
    if (!registeredEmail) return;
    
    if (resendCountdown > 0) {
        showToast(`Wait ${resendCountdown} seconds before resending`, "error");
        return;
    }

    resendBtn.disabled = true;

    const { error } = await supabase.auth.signInWithOtp({
        email: registeredEmail
    });

    if (error) {
        console.error("Resend error:", error);
        showToast("Failed to resend code: " + error.message, "error");
        resendBtn.disabled = false;
    } else {
        showToast("New code sent successfully!", "success");
        
        // Start countdown
        resendCountdown = 60;
        resendBtn.textContent = "Resend (" + resendCountdown + "s)";
        
        const interval = setInterval(() => {
            resendCountdown--;
            if (resendCountdown <= 0) {
                clearInterval(interval);
                resendBtn.textContent = "Resend code";
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
    nameInput.value = "";
    emailInput.value = "";
    otpCodeInput.value = "";
    verificationEmail.textContent = emailValue;
    
    authCard.classList.add("hidden");
    verificationCard.classList.remove("hidden");
    userBar.classList.add("hidden");
    inputContainer.classList.add("hidden");
    
    resendCountdown = 0;
    resendBtn.disabled = false;
    resendBtn.textContent = "Resend code";
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
        userName.textContent = "";
        userEmail.textContent = "";
        
        authCard.classList.remove("hidden");
        verificationCard.classList.add("hidden");
        userBar.classList.add("hidden");
        inputContainer.classList.add("hidden");
        unsubscribeFromTodos();

        nameInput.value = "";
        emailInput.value = "";
    } else {
        // User is logged in
        currentUser = session.user;
        userName.textContent = session.user.user_metadata?.full_name || "";
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

loginBtn.addEventListener("click", () => handleOtpRequest(false));
registerBtn.addEventListener("click", () => handleOtpRequest(true));
verifyOtpBtn.addEventListener("click", verifyOtpCode);

logoutBtn.addEventListener("click", logout);
addBtn.addEventListener("click", addTodo);
backToAuthBtn.addEventListener("click", hideVerificationScreen);
resendBtn.addEventListener("click", resendConfirmationEmail);

nameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        emailInput.focus();
    }
});

emailInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        handleOtpRequest(false);
    }
});

otpCodeInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        verifyOtpCode();
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
