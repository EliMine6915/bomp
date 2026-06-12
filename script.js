const todoInput = document.getElementById("todoInput");
const addBtn = document.getElementById("addBtn");
const todoList = document.getElementById("todoList");

function createTodo(text) {
    const item = document.createElement("div");
    item.className = "todo-item";

    item.innerHTML = `
        <button class="icon-btn check-btn">
            <i class="ph ph-circle"></i>
        </button>

        <span class="todo-text">${text}</span>

        <button class="icon-btn delete-btn">
            <i class="ph ph-trash"></i>
        </button>
    `;

    const checkBtn = item.querySelector(".check-btn");
    const deleteBtn = item.querySelector(".delete-btn");
    const icon = checkBtn.querySelector("i");

    checkBtn.addEventListener("click", () => {
        item.classList.toggle("completed");

        if (item.classList.contains("completed")) {
            icon.className = "ph ph-check-circle";
        } else {
            icon.className = "ph ph-circle";
        }
    });

    deleteBtn.addEventListener("click", () => {
        item.remove();
    });

    todoList.prepend(item);
}

function addTodo() {
    const text = todoInput.value.trim();

    if (!text) return;

    createTodo(text);
    todoInput.value = "";
}

addBtn.addEventListener("click", addTodo);

todoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        addTodo();
    }
});
