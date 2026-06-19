import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { db } from "./firebase-app.js";
import { elements } from "./dom.js";
import { escapeHtml, showEmptyTodos, showToast } from "./ui.js";

let currentUser = null;
let unsubscribeTodos = null;

export function startTodoSync(user) {
    stopTodoSync();
    currentUser = user;
    elements.todoList.innerHTML = "";

    const todosQuery = query(
        collection(db, "todos"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    unsubscribeTodos = onSnapshot(
        todosQuery,
        snapshot => {
            elements.todoList.innerHTML = "";

            if (snapshot.empty) {
                showEmptyTodos(currentUser);
                return;
            }

            snapshot.forEach(documentSnapshot => {
                renderTodo({
                    id: documentSnapshot.id,
                    ...documentSnapshot.data()
                });
            });
        },
        error => {
            console.error("Error loading todos:", error);
            showToast("Failed to load tasks: " + error.message, "error");
        }
    );
}

export function stopTodoSync() {
    if (unsubscribeTodos) {
        unsubscribeTodos();
        unsubscribeTodos = null;
    }

    currentUser = null;
}

export async function addTodo() {
    const text = elements.todoInput.value.trim();
    if (!text || !currentUser) return;

    elements.addBtn.disabled = true;

    try {
        await addDoc(collection(db, "todos"), {
            text,
            completed: false,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
        });

        elements.todoInput.value = "";
        elements.todoInput.focus();
        showToast("Task added!", "success");
    } catch (error) {
        console.error("Error adding todo:", error);
        showToast("Failed to create task: " + error.message, "error");
    } finally {
        elements.addBtn.disabled = false;
    }
}

function renderTodo(todo) {
    const item = document.createElement("div");
    item.className = todo.completed ? "todo-item completed" : "todo-item";
    item.dataset.todoId = todo.id;

    item.innerHTML = `
        <button class="icon-btn check-btn" title="${todo.completed ? "Mark incomplete" : "Mark complete"}">
            <i class="ph ${todo.completed ? "ph-check-circle-fill" : "ph-circle"}"></i>
        </button>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="icon-btn delete-btn" title="Delete task">
            <i class="ph ph-trash"></i>
        </button>
    `;

    item.querySelector(".check-btn").addEventListener("click", async () => {
        try {
            await updateDoc(doc(db, "todos", todo.id), {
                completed: !todo.completed
            });
        } catch (error) {
            console.error("Error updating todo:", error);
            showToast("Failed to update task: " + error.message, "error");
        }
    });

    item.querySelector(".delete-btn").addEventListener("click", async () => {
        try {
            await deleteDoc(doc(db, "todos", todo.id));
        } catch (error) {
            console.error("Error deleting todo:", error);
            showToast("Failed to delete task: " + error.message, "error");
        }
    });

    elements.todoList.appendChild(item);
}
