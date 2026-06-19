import { elements } from "./dom.js";
import { submitAuth, watchAuthState } from "./auth.js";
import { addTodo, startTodoSync, stopTodoSync } from "./todos.js";
import { setAuthMode, showSignedIn, showSignedOut } from "./ui.js";

elements.toggleLoginTab.addEventListener("click", () => setAuthMode(false));
elements.toggleRegisterTab.addEventListener("click", () => setAuthMode(true));
elements.submitAuthBtn.addEventListener("click", handleAuthSubmit);
elements.togglePasswordBtn.addEventListener("click", togglePasswordVisibility);
elements.addBtn.addEventListener("click", addTodo);

elements.nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") elements.emailInput.focus();
});

elements.emailInput.addEventListener("keydown", event => {
    if (event.key === "Enter") elements.passwordInput.focus();
});

elements.passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") handleAuthSubmit();
});

elements.todoInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addTodo();
});

watchAuthState(user => {
    if (!user) {
        stopTodoSync();
        showSignedOut();
        return;
    }

    showSignedIn(user);
    startTodoSync(user);
});

setAuthMode(false);

async function handleAuthSubmit() {
    const user = await submitAuth();

    if (!user) return;

    showSignedIn(user);
    startTodoSync(user);
}

function togglePasswordVisibility() {
    const isPasswordHidden = elements.passwordInput.type === "password";
    const icon = elements.togglePasswordBtn.querySelector("i");

    elements.passwordInput.type = isPasswordHidden ? "text" : "password";
    elements.togglePasswordBtn.setAttribute(
        "aria-label",
        isPasswordHidden ? "Hide password" : "Show password"
    );
    elements.togglePasswordBtn.title = isPasswordHidden ? "Hide password" : "Show password";
    icon.className = `ph ${isPasswordHidden ? "ph-eye-slash" : "ph-eye"}`;
}
