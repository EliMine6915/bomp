import { elements } from "./dom.js";
import { submitAuth, watchAuthState } from "./auth.js";
import { addTodo, startTodoSync, stopTodoSync } from "./todos.js";
import { setAuthMode, showSignedIn, showSignedOut } from "./ui.js";

elements.toggleLoginTab.addEventListener("click", () => setAuthMode(false));
elements.toggleRegisterTab.addEventListener("click", () => setAuthMode(true));
elements.submitAuthBtn.addEventListener("click", submitAuth);
elements.addBtn.addEventListener("click", addTodo);

elements.nameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") elements.emailInput.focus();
});

elements.emailInput.addEventListener("keydown", event => {
    if (event.key === "Enter") elements.passwordInput.focus();
});

elements.passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") submitAuth();
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
