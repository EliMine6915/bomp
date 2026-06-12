// Deine Supabase Verbindungsdaten
const SUPABASE_URL = "https://azjolejrfglvqwuqoxyt.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_eEfPK72iOaXYEZjhhdh1zA_0IMWBUya"; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM-Elemente holen
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

let currentUser = null;
let todoSubscription = null;

// --- FUNKTION FÜR SCHICKE FEHLERMELDUNGEN (TOASTS) ---
function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Icon je nach Typ auswählen
    const icon = type === "success" ? "ph-check-circle" : "ph-warning-circle";

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span class="toast-text">${message}</span>
    `;

    notificationContainer.appendChild(toast);

    // Nach 4 Sekunden automatisch ausblenden und löschen
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "scale(0.95)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- TO-DO STRUKTUR & FUNKTIONEN ---

async function loadTodos() {
    if (!currentUser) return;
    todoList.innerHTML = "";

    const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        showToast("Fehler beim Laden der Aufgaben: " + error.message, "error");
        return;
    }

    if (data) {
        data.forEach(renderTodo);
    }
}

function renderTodo(todo) {
    const item = document.createElement("div");
    item.className = todo.completed ? "todo-item completed" : "todo-item";

    item.innerHTML = `
        <button class="icon-btn check-btn">
            <i class="ph ${todo.completed ? "ph-check-circle" : "ph-circle"}"></i>
        </button>
        <span class="todo-text">${todo.text}</span>
        <button class="icon-btn delete-btn">
            <i class="ph ph-trash"></i>
        </button>
    `;

    // Status ändern
    item.querySelector(".check-btn").addEventListener("click", async () => {
        const { error } = await supabase
            .from("todos")
            .update({ completed: !todo.completed })
            .eq("id", todo.id);
        
        if (error) showToast("Änderung fehlgeschlagen: " + error.message, "error");
    });

    // To-Do löschen
    item.querySelector(".delete-btn").addEventListener("click", async () => {
        const { error } = await supabase
            .from("todos")
            .delete()
            .eq("id", todo.id);

        if (error) showToast("Löschen fehlgeschlagen: " + error.message, "error");
    });

    todoList.appendChild(item);
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text || !currentUser) return;

    const { error } = await supabase
        .from("todos")
        .insert({
            text,
            user_id: currentUser.id
        });

    if (error) {
        showToast("Fehler beim Erstellen: " + error.message, "error");
    } else {
        todoInput.value = "";
    }
}

// Real-time Verbindung für Live-Updates (postgres_changes)
function subscribeToTodos() {
    if (todoSubscription) {
        supabase.removeChannel(todoSubscription);
    }

    todoSubscription = supabase
        .channel('public:todos')
        .on('postgres_changes', { event: '*', filter: `user_id=eq.${currentUser.id}`, schema: 'public', table: 'todos' }, () => {
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

// --- AUTH STRUKTUR ---

async function login() {
    const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
    });

    if (error) {
        showToast("Login fehlgeschlagen: " + error.message, "error");
    } else {
        showToast("Erfolgreich angemeldet!", "success");
    }
}

async function register() {
    const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
            emailRedirectTo: window.location.origin
        }
    });

    if (error) {
        showToast("Registrierung fehlgeschlagen: " + error.message, "error");
    } else {
        showToast("Erfolgreich! Bitte bestätige den Link in deinem E-Mail-Postfach.", "success");
    }
}

async function logout() {
    unsubscribeFromTodos();
    await supabase.auth.signOut();
    showToast("Erfolgreich abgemeldet.", "success");
}

// Steuert, welche UI-Elemente je nach Login-Status sichtbar sind
function handleAuthStateChange(session) {
    if (!session) {
        currentUser = null;
        todoList.innerHTML = "";
        userEmail.textContent = "";
        
        authCard.classList.remove("hidden");
        userBar.classList.add("hidden");
        inputContainer.classList.add("hidden");
        unsubscribeFromTodos();
    } else {
        currentUser = session.user;
        userEmail.textContent = session.user.email;
        
        authCard.classList.add("hidden");
        userBar.classList.remove("hidden");
        inputContainer.classList.remove("hidden");
        
        subscribeToTodos(); 
        loadTodos();        
    }
}

// Event-Listeners registrieren
loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);
addBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        addTodo();
    }
});

// Automatische Erkennung ob User bereits eingeloggt ist beim Neuladen
supabase.auth.onAuthStateChange((event, session) => {
    handleAuthStateChange(session);
});
