import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = "https://szyakeozorhmardkdfav.supabase.co"
const supabaseKey = "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"

const supabase = createClient(supabaseUrl, supabaseKey)

const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const signupBtn = document.getElementById("signupBtn")
const loginBtn = document.getElementById("loginBtn")
const message = document.getElementById("message")

// SIGN UP
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value
  const password = passwordInput.value

  const { error } = await supabase.auth.signUp({
    email,
    password
  })

  if (error) {
    message.textContent = error.message
  } else {
    message.textContent = "Signup successful! Check your email."
  }
})

// LOGIN
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value
  const password = passwordInput.value

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    message.textContent = error.message
  } else {
    message.textContent = "Login successful!"
    window.location.href = "dashboard.html"
  }
})