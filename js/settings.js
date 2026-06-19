import {
    onAuthStateChanged,
    sendPasswordResetEmail,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { auth } from "./firebase-app.js";
import { showToast } from "./ui.js";
import { getFirstName } from "./user.js";

const signedOutPanel = document.getElementById("signedOutPanel");
const settingsPanel = document.getElementById("settingsPanel");
const settingsTitle = document.getElementById("settingsTitle");
const settingsTagline = document.getElementById("settingsTagline");
const settingsUserName = document.getElementById("settingsUserName");
const settingsUserEmail = document.getElementById("settingsUserEmail");
const accountEmail = document.getElementById("accountEmail");
const displayNameInput = document.getElementById("displayName");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const resetPasswordBtn = document.getElementById("resetPasswordBtn");
const settingsLogoutBtn = document.getElementById("settingsLogoutBtn");

let currentUser = null;

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (!user) {
        settingsTitle.textContent = "settings";
        settingsTagline.textContent = "Account and preferences";
        signedOutPanel.classList.remove("hidden");
        settingsPanel.classList.add("hidden");
        return;
    }

    const firstName = getFirstName(user);

    signedOutPanel.classList.add("hidden");
    settingsPanel.classList.remove("hidden");
    settingsTitle.textContent = firstName ? `${firstName}'s settings` : "settings";
    settingsTagline.textContent = firstName
        ? `Make bomp feel right for you, ${firstName}`
        : "Account and preferences";
    settingsUserName.textContent = user.displayName || "User";
    settingsUserEmail.textContent = user.email || "";
    accountEmail.textContent = firstName
        ? `Signed in as ${firstName} with ${user.email || "this account"}`
        : user.email || "";
    displayNameInput.value = user.displayName || "";
});

saveProfileBtn.addEventListener("click", async () => {
    if (!currentUser) return;

    const displayName = displayNameInput.value.trim();

    if (!displayName) {
        showToast("Please enter your name", "error");
        displayNameInput.focus();
        return;
    }

    saveProfileBtn.disabled = true;

    try {
        await updateProfile(currentUser, { displayName });
        const firstName = displayName.split(/\s+/)[0];
        settingsTitle.textContent = `${firstName}'s settings`;
        settingsTagline.textContent = `Make bomp feel right for you, ${firstName}`;
        settingsUserName.textContent = displayName;
        showToast("Profile saved", "success");
    } catch (error) {
        console.error("Profile update error:", error);
        showToast("Failed to save profile: " + error.message, "error");
    } finally {
        saveProfileBtn.disabled = false;
    }
});

resetPasswordBtn.addEventListener("click", async () => {
    if (!currentUser?.email) return;

    resetPasswordBtn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showToast("Password reset email sent", "success");
    } catch (error) {
        console.error("Password reset error:", error);
        showToast("Failed to send reset email: " + error.message, "error");
    } finally {
        resetPasswordBtn.disabled = false;
    }
});

settingsLogoutBtn.addEventListener("click", async () => {
    settingsLogoutBtn.disabled = true;

    try {
        await signOut(auth);
        window.location.href = "./";
    } catch (error) {
        console.error("Logout error:", error);
        showToast("Logout failed: " + error.message, "error");
        settingsLogoutBtn.disabled = false;
    }
});

displayNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") saveProfileBtn.click();
});
