const SUPABASE_URL =
    "https://azjolejrfglvqwuqoxyt.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_eEfPK72iOaXYEZjhhdh1zA_0IMWBUya";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const todoInput = document.getElementById("todoInput");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");

const email = document.getElementById("email");
const password = document.getElementById("password");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const authCard = document.getElementById("authCard");
const userBar = document.getElementById("userBar");
const userEmail = document.getElementById("userEmail");

let currentUser = null;

async function loadTodos() {
    todoList.innerHTML = "";

    const { data } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

    data.forEach(renderTodo);
}

function renderTodo(todo) {
    const item = document.createElement("div");

    item.className = todo.completed
        ? "todo-item completed"
        : "todo-item";

    item.innerHTML = `
        <button class="icon-btn check-btn">
            <i class="ph ${
                todo.completed
                    ? "ph-check-circle"
                    : "ph-circle"
            }"></i>
        </button>

        <span class="todo-text">
            ${todo.text}
        </span>

        <button class="icon-btn delete-btn">
            <i class="ph ph-trash"></i>
        </button>
    `;

    item
        .querySelector(".check-btn")
        .addEventListener("click", async () => {

            await supabase
                .from("todos")
                .update({
                    completed: !todo.completed
                })
                .eq("id", todo.id);

            loadTodos();
        });

    item
        .querySelector(".delete-btn")
        .addEventListener("click", async () => {

            await supabase
                .from("todos")
                .delete()
                .eq("id", todo.id);

            loadTodos();
        });

    todoList.appendChild(item);
}

async function addTodo() {
    const text = todoInput.value.trim();

    if (!text) return;

    await supabase
        .from("todos")
        .insert({
            text,
            user_id: currentUser.id
        });

    todoInput.value = "";
    loadTodos();
}

async function login() {
    const { error } =
        await supabase.auth.signInWithPassword({
            email: email.value,
            password: password.value
        });

    if (error) {
        alert(error.message);
    }
}

async function register() {
    const { error } =
        await supabase.auth.signUp({
            email: email.value,
            password: password.value
        });

    if (error) {
        alert(error.message);
    }
}

async function logout() {
    await supabase.auth.signOut();
}

async function checkUser() {

    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        authCard.classList.remove("hidden");
        userBar.classList.add("hidden");
        return;
    }

    currentUser = session.user;

    userEmail.textContent =
        session.user.email;

    authCard.classList.add("hidden");
    userBar.classList.remove("hidden");

    loadTodos();
}

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);

addBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        addTodo();
    }
});

supabase.auth.onAuthStateChange(() => {
    checkUser();
});

checkUser();
