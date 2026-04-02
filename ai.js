import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  "https://szyakeozorhmardkdfav.supabase.co",
  "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"
)

const FUNCTION_NAME = "hyper-endpoint"
const MAX_CUSTOM_QUESTION_LENGTH = 140
const DAILY_AI_LIMIT = 10

let currentBusinessName = "your business"

const promptConfigs = {
  "How can I cut costs right now?": {
    instruction: `You are a straight-talking financial advisor for a blue collar service business owner. 
Start your response with ONE short punchy sentence (max 15 words) that summarizes the situation in plain language — like something a trusted advisor would say before breaking it down. Something like "Your fuel and insurance costs are the biggest targets right now." Then give the full breakdown.
Focus on cutting unnecessary expenses, reducing recurring costs, and improving profit quickly. Give practical and direct advice. No fluff, no corporate speak.`
  },
  "Based on my current profit, can I afford to advertise?": {
    instruction: `You are a straight-talking financial advisor for a blue collar service business owner.
Start your response with ONE short punchy sentence (max 15 words) that gives the bottom line upfront — like "Based on your numbers, you're close but not quite there yet." Then explain why.
Focus on whether the business can afford advertising based on current profit, expenses, and financial stability. Be conservative and practical. No fluff.`
  },
  "How much more profit should I make before scaling?": {
    instruction: `You are a straight-talking financial advisor for a blue collar service business owner.
Start your response with ONE short punchy sentence (max 15 words) that gives the honest bottom line — like "You need more cushion before you grow." Then explain what that looks like with their numbers.
Focus on whether the business is financially ready to scale. Be direct and specific. No fluff.`
  },
  "What is hurting my profit the most right now?": {
    instruction: `You are a straight-talking financial advisor for a blue collar service business owner.
Start your response with ONE short punchy sentence (max 15 words) that names the biggest problem directly — like "Your recurring expenses are eating most of what you bring in." Then break it down.
Focus on identifying the biggest things currently reducing profit. Be blunt and useful. No fluff.`
  }
}

// ─── Daily limit helpers ──────────────────────────────────────────────────────

function getTodayKey(userId) {
  const now = new Date()
  const dateStr = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0")
  return `ai_usage_${userId}_${dateStr}`
}

function getUsageCount(userId) {
  const key = getTodayKey(userId)
  return parseInt(localStorage.getItem(key) || "0", 10)
}

function incrementUsage(userId) {
  const key = getTodayKey(userId)
  const current = getUsageCount(userId)
  localStorage.setItem(key, current + 1)
}

function updateUsageDisplay(userId) {
  const count = getUsageCount(userId)
  const remaining = Math.max(0, DAILY_AI_LIMIT - count)
  const el = document.getElementById("ai-usage-counter")
  if (el) {
    el.textContent = `${remaining} AI request${remaining === 1 ? "" : "s"} remaining today`
    el.className = remaining <= 2 ? "ai-usage-counter low" : "ai-usage-counter"
  }
}

function isLimitReached(userId) {
  return getUsageCount(userId) >= DAILY_AI_LIMIT
}

// ─── Visual state helpers ─────────────────────────────────────────────────────

function setStatusMessage(text) {
  const el = document.getElementById("ai-response-status")
  if (el) el.textContent = text
}

function setThinking() {
  const card     = document.getElementById("ai-response-card")
  const response = document.getElementById("ai-response")
  if (card)     { card.classList.remove("has-response"); card.classList.add("thinking") }
  if (response) { response.classList.remove("has-content"); response.classList.add("thinking-state"); response.innerText = `Analyzing ${currentBusinessName}...` }
  setStatusMessage(`Analyzing ${currentBusinessName}...`)
}

function setResponse(text) {
  const card     = document.getElementById("ai-response-card")
  const response = document.getElementById("ai-response")
  if (card)     { card.classList.remove("thinking"); card.classList.add("has-response") }
  if (response) { response.classList.remove("thinking-state"); response.classList.add("has-content"); response.innerText = text }
  setStatusMessage("Fieldiq AI's live advisor is connected and waiting for a message")
}

function setActivePrompt(btn) {
  document.querySelectorAll(".ai-prompt-btn").forEach(b => b.classList.remove("active"))
  if (btn) btn.classList.add("active")
}

function setLimitReached() {
  const overlay = document.getElementById("limit-overlay")
  if (overlay) overlay.classList.add("open")
  setStatusMessage("Daily limit reached — resets at midnight")
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatMoney(value) {
  return "$" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function getLocalDate(dateString) {
  return new Date(dateString + "T00:00:00")
}

function getTodayDateOnly() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getProfitFromJob(job) {
  return (Number(job.revenue) || 0) - (Number(job.cost) || 0)
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}

function getWeekStart(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = result.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diffToMonday)
  return result
}

function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function doesRecurringExpenseOccurOnDate(expense, targetDate) {
  if (!expense.is_recurring) return false
  const startDate = expense.date ? getLocalDate(expense.date) : null
  if (startDate && targetDate < startDate) return false
  const frequency = expense.recurring_frequency
  if (frequency === "daily") return true
  if (frequency === "weekly") {
    const recurringDay = expense.recurring_day_of_week != null ? Number(expense.recurring_day_of_week) : 0
    return targetDate.getDay() === recurringDay
  }
  if (frequency === "monthly") {
    const lastDay = getLastDayOfMonth(targetDate.getFullYear(), targetDate.getMonth())
    const recurringDay = expense.recurring_day_of_month != null ? Number(expense.recurring_day_of_month) : lastDay
    return targetDate.getDate() === Math.min(recurringDay, lastDay)
  }
  if (frequency === "yearly") {
    const recurringMonth = expense.recurring_month_of_year != null ? Number(expense.recurring_month_of_year) - 1 : 11
    return targetDate.getMonth() === recurringMonth && targetDate.getDate() === 1
  }
  return false
}

function getExpenseAmountForDate(expense, targetDate) {
  const amount = Number(expense.amount) || 0
  if (amount <= 0) return 0
  if (!expense.is_recurring) {
    if (!expense.date) return 0
    return isSameDate(getLocalDate(expense.date), targetDate) ? amount : 0
  }
  return doesRecurringExpenseOccurOnDate(expense, targetDate) ? amount : 0
}

function getProfitForDate(jobs, expenses, targetDate) {
  let total = 0
  ;(jobs || []).forEach(job => {
    if (isSameDate(getLocalDate(job.date), targetDate)) total += getProfitFromJob(job)
  })
  ;(expenses || []).forEach(expense => {
    total -= getExpenseAmountForDate(expense, targetDate)
  })
  return total
}

function sumProfitBetweenDates(jobs, expenses, startDate, endDate) {
  let total = 0
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    total += getProfitForDate(jobs, expenses, cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
  return total
}

function calculateProfitTotals(jobs, expenses) {
  const now          = new Date()
  const today        = getTodayDateOnly()
  const startOfWeek  = getWeekStart(today)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear  = new Date(now.getFullYear(), 0, 1)
  return {
    daily:   getProfitForDate(jobs, expenses, today),
    weekly:  sumProfitBetweenDates(jobs, expenses, startOfWeek, today),
    monthly: sumProfitBetweenDates(jobs, expenses, startOfMonth, today),
    yearly:  sumProfitBetweenDates(jobs, expenses, startOfYear, today)
  }
}

function summarizeExpenses(expenses) {
  if (!expenses.length) return "No expenses found."
  return expenses.slice(0, 12).map(expense => {
    const amount = formatMoney(expense.amount || 0)
    if (!expense.is_recurring) return `- ${expense.title || "Untitled"}: ${amount} one-time`
    return `- ${expense.title || "Untitled"}: ${amount} recurring ${expense.recurring_frequency || ""}`.trim()
  }).join("\n")
}

function getCustomInstruction(question) {
  return `You are a straight-talking financial advisor for a blue collar service business owner.
Start your response with ONE short punchy sentence (max 15 words) that gives the honest bottom line upfront — plain language, like something a trusted advisor would say before breaking it down.
Then answer this question using only the company's real profit and expense data when possible: "${question}".
If the question is too broad or cannot be answered from the available data, say that more detail in the Expenses tab or more completed jobs in Job History would help. Keep it short, useful, no fluff.`
}

function getBusinessName(company) {
  return company.business_name || company.company_name || company.name || company.title || "your business"
}

// ─── Upgrade / AI state ───────────────────────────────────────────────────────

function showUpgradeState() {
  const app      = document.getElementById("ai-app")
  const required = document.getElementById("ai-pro-required")
  if (app)      app.style.display      = "none"
  if (required) required.style.display = "flex"
  const upgradeBtn = document.getElementById("upgrade-ai-btn")
  if (upgradeBtn) upgradeBtn.onclick = () => { window.location.href = "paywall.html" }
}

function showAiState() {
  const app      = document.getElementById("ai-app")
  const required = document.getElementById("ai-pro-required")
  if (required) required.style.display = "none"
  if (app)      app.style.display      = "block"
}

// ─── Run AI prompt ────────────────────────────────────────────────────────────

async function runAiPrompt(selectedPrompt, customInstructionOverride = null, activeBtn = null) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { window.location.href = "auth.html"; return }

  // Check daily limit
  if (isLimitReached(user.id)) {
    setLimitReached()
    updateUsageDisplay(user.id)
    return
  }

  setThinking()
  setActivePrompt(activeBtn)

  let instruction = ""
  if (customInstructionOverride) {
    instruction = customInstructionOverride
  } else {
    const config = promptConfigs[selectedPrompt]
    if (!config) { setResponse("Invalid AI option selected."); return }
    instruction = config.instruction
  }

  const { data: company, error: companyError } = await supabase
    .from("companies").select("*").eq("owner_user_id", user.id).single()

  if (companyError || !company) { setResponse("Company not found."); return }
  if (company.subscription_status !== "active") { setResponse("An active subscription is required."); return }

  // ── AI PRO LOCK REMOVED FOR FREE LAUNCH ────────────────────────────────────
  // Uncomment when payments go live:
  // if (company.plan_type !== "ai_pro") { showUpgradeState(); return }
  // ───────────────────────────────────────────────────────────────────────────

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs").select("revenue, cost, date").eq("company_id", company.id)
  if (jobsError) { setResponse("Failed to load jobs."); return }

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("title, amount, date, is_recurring, recurring_frequency, recurring_day_of_week, recurring_day_of_month, recurring_month_of_year")
    .eq("company_id", company.id)
  if (expensesError) { setResponse("Failed to load expenses."); return }

  const safeJobs     = jobs || []
  const safeExpenses = expenses || []
  const profits      = calculateProfitTotals(safeJobs, safeExpenses)

  const companyData = `
Company Name: ${getBusinessName(company)}
Daily Profit: ${formatMoney(profits.daily)}
Weekly Profit: ${formatMoney(profits.weekly)}
Monthly Profit: ${formatMoney(profits.monthly)}
Yearly Profit: ${formatMoney(profits.yearly)}
Weekly Fuel Estimate: ${formatMoney(company.estimated_weekly_gas_expense || 0)}

Expenses:
${summarizeExpenses(safeExpenses)}

Special Instruction:
${instruction}
  `.trim()

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { prompt: selectedPrompt, companyData }
  })

  if (error) { console.error("AI invoke error:", error); setResponse("Failed to get AI response."); return }
  if (data?.error) { console.error("AI function error:", data); setResponse(data.error || "AI request failed."); return }

  // Increment usage after successful response
  incrementUsage(user.id)
  updateUsageDisplay(user.id)

  setResponse(data?.answer || "No response returned.")
}

// ─── Custom question ──────────────────────────────────────────────────────────

function setupCustomQuestion() {
  const input  = document.getElementById("custom-ai-question")
  const count  = document.getElementById("question-count")
  const button = document.getElementById("custom-ai-submit")
  if (!input || !count || !button) return

  input.addEventListener("input", () => {
    if (input.value.length > MAX_CUSTOM_QUESTION_LENGTH) {
      input.value = input.value.slice(0, MAX_CUSTOM_QUESTION_LENGTH)
    }
    count.innerText = `${input.value.length} / ${MAX_CUSTOM_QUESTION_LENGTH}`
  })

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") button.click()
  })

  button.addEventListener("click", () => {
    const question = input.value.trim()
    if (!question) { setResponse("Please enter a short question."); return }
    if (question.length > MAX_CUSTOM_QUESTION_LENGTH) { setResponse("Please keep your question shorter."); return }
    setActivePrompt(null)
    runAiPrompt(question, getCustomInstruction(question), null)
  })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function initializeAiPage() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) { window.location.href = "auth.html"; return }

  const emailElement = document.getElementById("user-email")
  if (emailElement) emailElement.innerText = user.email

  const { data: company, error: companyError } = await supabase
    .from("companies").select("*").eq("owner_user_id", user.id).single()

  if (companyError || !company) { window.location.href = "onboarding.html"; return }

  // ── PAYWALL REMOVED FOR FREE LAUNCH ────────────────────────────────────────
  // Uncomment when payments go live:
  // if (company.subscription_status !== "active") { window.location.href = "paywall.html"; return }
  // ───────────────────────────────────────────────────────────────────────────

  // ── AI PRO LOCK REMOVED FOR FREE LAUNCH ────────────────────────────────────
  // Uncomment when payments go live:
  // if (company.plan_type !== "ai_pro") { showUpgradeState(); return }
  // ───────────────────────────────────────────────────────────────────────────

  currentBusinessName = getBusinessName(company)

  showAiState()
  updateUsageDisplay(user.id)

  document.querySelectorAll(".ai-prompt-btn").forEach(button => {
    button.addEventListener("click", () => {
      runAiPrompt(button.dataset.prompt, null, button)
    })
  })

  setupCustomQuestion()
}

document.addEventListener("DOMContentLoaded", initializeAiPage)
