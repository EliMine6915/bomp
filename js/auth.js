import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { auth } from "./firebase-app.js";
import { elements } from "./dom.js";
import { getAuthMode, showToast } from "./ui.js";

export function watchAuthState(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function submitAuth() {
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    const name = elements.nameInput.value.trim();
    const isRegisterMode = getAuthMode() === "register";

    if (isRegisterMode && !name) {
        showToast("Please enter your name", "error");
        elements.nameInput.focus();
        return;
    }

    if (!email) {
        showToast("Please enter your email address", "error");
        elements.emailInput.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Please enter a valid email address", "error");
        elements.emailInput.focus();
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        elements.passwordInput.focus();
        return;
    }

    elements.submitAuthBtn.disabled = true;

    try {
        if (isRegisterMode) {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName: name });
            showToast("Account created successfully", "success");
            return credential.user;
        }

        const credential = await signInWithEmailAndPassword(auth, email, password);
        showToast("Signed in successfully", "success");
        return credential.user;
    } catch (error) {
        console.error("Firebase auth error:", error);
        showToast(getAuthErrorMessage(error), "error");
        return null;
    } finally {
        elements.submitAuthBtn.disabled = false;
    }
}

function getAuthErrorMessage(error) {
    const messages = {
        "auth/email-already-in-use": "This email address is already registered.",
        "auth/invalid-credential": "Email or password is incorrect.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/user-not-found": "No account exists for this email address.",
        "auth/wrong-password": "Email or password is incorrect."
    };

    return messages[error.code] || "Authentication failed: " + error.message;
}
