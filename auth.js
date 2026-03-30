import { createClient } from "https://s://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://s://szyakeozorhmardkdfav.supabase.co";
const supabaseKey = "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-";
const supabase = createClient(supabaseUrl, supabaseKey);

// Change these if you want different redirects later
const SIGNUP_REDIRECT = "onboarding.html";
const LOGIN_REDIRECT = "dashboard.html";

const authMessage = document.getElementById("auth-message");

function showMessage(message, type = "error") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = `auth-message show ${type}`;
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    showMessage("Creating your account...", "success");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showMessage(`Signup error: ${error.message}`, "error");
      console.error(error);
      return;
    }

    const user = data.user;

    if (!user) {
      showMessage("Signup worked, but no user was returned.", "error");
      return;
    }

    showMessage("Account created successfully!", "success");

    setTimeout(() => {
      window.location.href = SIGNUP_REDIRECT;
    }, 700);
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    showMessage("Logging you in...", "success");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showMessage(`Login error: ${error.message}`, "error");
      console.error(error);
      return;
    }

    const user = data.user;

    if (!user) {
      showMessage("Login worked, but no user was returned.", "error");
      return;
    }

    showMessage("Login successful!", "success");

    setTimeout(() => {
      window.location.href = LOGIN_REDIRECT;
    }, 500);
  });
}