import { elements } from "./dom.js";
import { getFirstName } from "./user.js";

let isRegisterMode = false;

export function getAuthMode() {
    return isRegisterMode ? "register" : "login";
}

export function setAuthMode(toRegister) {
    isRegisterMode = toRegister;

    elements.toggleRegisterTab.classList.toggle("active", isRegisterMode);
    elements.toggleLoginTab.classList.toggle("active", !isRegisterMode);
    elements.nameGroup.classList.toggle("hidden", !isRegisterMode);

    elements.authTitle.textContent = isRegisterMode ? "Create Account" : "Welcome Back";
    elements.submitAuthText.textContent = isRegisterMode ? "Register" : "Sign In";
    elements.passwordInput.autocomplete = isRegisterMode ? "new-password" : "current-password";
}

export function showToast(message, type = "error") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "ph-check-circle" : "ph-warning-circle";

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <span class="toast-text">${escapeHtml(message)}</span>
    `;

    elements.notificationContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(420px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export function showSignedOut() {
    elements.todoList.innerHTML = "";
    elements.tagline.textContent = "Manage your tasks with elegance";
    elements.todoInput.placeholder = "Add a new task...";
    elements.authCard.classList.remove("hidden");
    elements.settingsButton.classList.add("hidden");
    elements.inputContainer.classList.add("hidden");
    elements.nameInput.value = "";
    elements.emailInput.value = "";
    elements.passwordInput.value = "";
}

export function showSignedIn(user) {
    const firstName = getFirstName(user);

    elements.tagline.textContent = firstName
        ? `Good to see you, ${firstName}`
        : "Good to see you";
    elements.todoInput.placeholder = firstName
        ? `What's next, ${firstName}?`
        : "What's next?";
    elements.authCard.classList.add("hidden");
    elements.settingsButton.classList.remove("hidden");
    elements.inputContainer.classList.remove("hidden");
}

export function showEmptyTodos(user) {
    const firstName = getFirstName(user);
    const message = firstName
        ? `No tasks yet, ${firstName}. Create your first one below!`
        : "No tasks yet. Create your first one below!";

    elements.todoList.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">${escapeHtml(message)}</p>`;
}

export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
