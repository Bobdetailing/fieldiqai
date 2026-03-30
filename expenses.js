import { createClient } from 'https://s://esm.sh/@supabase/supabase-js@2'
 
const supabase = createClient(
  "https://s://szyakeozorhmardkdfav.supabase.co",
  "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"
)
 
let currentCompany = null
let allExpenses    = []
let activeFilter   = "one-time"
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function formatMoney(value) {
  return "$" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
 
function getRecurringLabel(expense) {
  if (!expense.is_recurring) return "One-Time"
  const f = expense.recurring_frequency
  if (f === "daily")   return "Daily"
  if (f === "weekly")  return "Weekly"
  if (f === "monthly") return "Monthly"
  if (f === "yearly")  return "Yearly"
  return "Recurring"
}
 
function matchesFilter(expense, filter) {
  if (filter === "one-time") return !expense.is_recurring
  return expense.is_recurring && expense.recurring_frequency === filter
}
 
function getLocalDate(dateString) {
  return new Date(dateString + "T00:00:00")
}
 
function getTodayDateOnly() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
 
function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate()
}
 
function getLastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
 
// ─── Upcoming expenses logic ──────────────────────────────────────────────────
 
function getUpcomingExpenses(expenses) {
  const today   = getTodayDateOnly()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 30)
 
  const results = []
 
  ;(expenses || []).forEach(expense => {
    const amount = Number(expense.amount) || 0
    if (amount <= 0) return
 
    if (!expense.is_recurring) {
      if (!expense.date) return
      const expenseDate = getLocalDate(expense.date)
      if (expenseDate >= today && expenseDate <= endDate) {
        results.push({ date: expenseDate, title: expense.title || "", category: expense.category || "", amount, frequency: "One-Time" })
      }
      return
    }
 
    if (expense.recurring_frequency === "daily") {
      for (let i = 0; i <= 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        if (expense.date && date < getLocalDate(expense.date)) continue
        results.push({ date, title: expense.title || "", category: expense.category || "", amount, frequency: "Daily" })
      }
      return
    }
 
    if (expense.recurring_frequency === "weekly") {
      const recurringDay = expense.recurring_day_of_week != null ? Number(expense.recurring_day_of_week) : 0
      for (let i = 0; i <= 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        if (expense.date && date < getLocalDate(expense.date)) continue
        if (date.getDay() === recurringDay) {
          results.push({ date, title: expense.title || "", category: expense.category || "", amount, frequency: "Weekly" })
        }
      }
      return
    }
 
    if (expense.recurring_frequency === "monthly") {
      for (let i = 0; i <= 1; i++) {
        const monthDate    = new Date(today.getFullYear(), today.getMonth() + i, 1)
        const lastDay      = getLastDayOfMonth(monthDate.getFullYear(), monthDate.getMonth())
        const recurringDay = expense.recurring_day_of_month != null ? Number(expense.recurring_day_of_month) : lastDay
        const dueDate      = new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(recurringDay, lastDay))
        if (expense.date && dueDate < getLocalDate(expense.date)) continue
        if (dueDate >= today && dueDate <= endDate) {
          results.push({ date: dueDate, title: expense.title || "", category: expense.category || "", amount, frequency: "Monthly" })
        }
      }
      return
    }
 
    if (expense.recurring_frequency === "yearly") {
      const recurringMonth = expense.recurring_month_of_year != null ? Number(expense.recurring_month_of_year) - 1 : 11
      for (let i = 0; i <= 1; i++) {
        const dueDate = new Date(today.getFullYear() + i, recurringMonth, 1)
        if (expense.date && dueDate < getLocalDate(expense.date)) continue
        if (dueDate >= today && dueDate <= endDate) {
          results.push({ date: dueDate, title: expense.title || "", category: expense.category || "", amount, frequency: "Yearly" })
        }
      }
    }
  })
 
  return results.sort((a, b) => a.date - b.date)
}
 
function renderUpcomingExpenses(expenses) {
  const body    = document.getElementById("upcoming-expenses-body")
  const empty   = document.getElementById("no-upcoming-expenses")
  const total   = document.getElementById("upcoming-total")
 
  if (!body || !empty) return
  body.innerHTML = ""
 
  const upcoming = getUpcomingExpenses(expenses)
 
  if (!upcoming.length) {
    empty.style.display = "block"
    if (total) total.textContent = formatMoney(0)
    return
  }
 
  empty.style.display = "none"
 
  const totalAmount = upcoming.reduce((sum, e) => sum + e.amount, 0)
  if (total) total.textContent = formatMoney(totalAmount)
 
  upcoming.forEach(expense => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${expense.date.toLocaleDateString("en-US")}</td>
      <td><span class="expense-title-cell">${expense.title}</span></td>
      <td><span class="category-badge category-${(expense.category || "other").toLowerCase()}">${expense.category}</span></td>
      <td class="amount-cell">${formatMoney(expense.amount)}</td>
      <td><span class="type-badge">${expense.frequency}</span></td>
    `
    body.appendChild(row)
  })
}
 
// ─── Auth / company ───────────────────────────────────────────────────────────
 
async function getCurrentUserCompany() {
  if (currentCompany) return currentCompany
 
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) { window.location.href = "auth.html"; return null }
 
  const { data: company, error: companyError } = await supabase
    .from("companies").select("*").eq("owner_user_id", user.id).single()
 
  if (companyError || !company) { console.error("Company not found", companyError); return null }
 
  currentCompany = company
  return company
}
 
// ─── Fuel estimate ────────────────────────────────────────────────────────────
 
function updateFuelRequirementUI(company) {
  const addBtn  = document.getElementById("toggle-expense-form")
  const fuelMsg = document.getElementById("fuel-required-message")
  const hasFuel = company && Number(company.estimated_weekly_gas_expense) > 0
  addBtn.disabled = !hasFuel
  fuelMsg.style.display = hasFuel ? "none" : "block"
}
 
async function loadGasEstimate() {
  const company = await getCurrentUserCompany()
  if (!company) return
  const gasInput = document.getElementById("weekly-gas-estimate")
  if (gasInput && company.estimated_weekly_gas_expense != null) {
    gasInput.value = company.estimated_weekly_gas_expense
  }
  updateFuelRequirementUI(company)
}
 
async function saveGasEstimate() {
  const company  = await getCurrentUserCompany()
  if (!company) return
  const gasValue = parseFloat(document.getElementById("weekly-gas-estimate").value)
  if (!gasValue || gasValue <= 0) { alert("Please enter your weekly fuel cost."); return }
 
  const { data, error } = await supabase
    .from("companies")
    .update({ estimated_weekly_gas_expense: gasValue })
    .eq("id", company.id)
    .select().single()
 
  if (error) { console.error("Fuel save error:", error); alert("Failed to save fuel cost."); return }
 
  currentCompany = data
  updateFuelRequirementUI(currentCompany)
 
  const btn = document.getElementById("save-gas-estimate")
  btn.textContent = "Saved ✓"
  setTimeout(() => { btn.textContent = "Save" }, 2000)
}
 
// ─── Recurring day options ────────────────────────────────────────────────────
 
function fillRecurringDayOptions() {
  const frequency = document.getElementById("recurring-frequency").value
  const dayWrap   = document.getElementById("recurring-day-wrap")
  const dayLabel  = document.getElementById("recurring-day-label")
  const daySelect = document.getElementById("recurring-day-value")
 
  daySelect.innerHTML = ""
 
  if (frequency === "daily") { dayWrap.style.display = "none"; return }
 
  dayWrap.style.display = "block"
 
  if (frequency === "weekly") {
    dayLabel.innerText = "Day of Week"
    const opts = [
      { value: "", text: "Auto (Sunday)" },
      { value: "1", text: "Monday" }, { value: "2", text: "Tuesday" },
      { value: "3", text: "Wednesday" }, { value: "4", text: "Thursday" },
      { value: "5", text: "Friday" }, { value: "6", text: "Saturday" },
      { value: "0", text: "Sunday" }
    ]
    opts.forEach(o => { const el = document.createElement("option"); el.value = o.value; el.textContent = o.text; daySelect.appendChild(el) })
    return
  }
 
  if (frequency === "monthly") {
    dayLabel.innerText = "Day of Month"
    const def = document.createElement("option"); def.value = ""; def.textContent = "Auto (last day)"; daySelect.appendChild(def)
    for (let i = 1; i <= 31; i++) { const el = document.createElement("option"); el.value = String(i); el.textContent = String(i); daySelect.appendChild(el) }
    return
  }
 
  if (frequency === "yearly") {
    dayLabel.innerText = "Month of Year"
    const def = document.createElement("option"); def.value = ""; def.textContent = "Auto (December)"; daySelect.appendChild(def)
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    months.forEach((m, i) => { const el = document.createElement("option"); el.value = String(i + 1); el.textContent = m; daySelect.appendChild(el) })
    return
  }
 
  dayWrap.style.display = "none"
}
 
function updateExpenseModeUI() {
  const mode             = document.getElementById("expense-mode").value
  const recurringSection = document.getElementById("recurring-section")
  const dayWrap          = document.getElementById("recurring-day-wrap")
  const freqEl           = document.getElementById("recurring-frequency")
  const dayEl            = document.getElementById("recurring-day-value")
 
  if (mode === "recurring") {
    recurringSection.classList.remove("hidden")
    fillRecurringDayOptions()
  } else {
    recurringSection.classList.add("hidden")
    dayWrap.style.display = "none"
    freqEl.value = "daily"
    dayEl.innerHTML = ""
  }
}
 
// ─── Render expenses table ────────────────────────────────────────────────────
 
function renderExpenses() {
  const body         = document.getElementById("expenses-body")
  const emptyMessage = document.getElementById("empty-expenses-message")
 
  body.innerHTML = ""
 
  const filtered = allExpenses.filter(e => matchesFilter(e, activeFilter))
 
  if (!filtered.length) {
    emptyMessage.style.display = "block"
    return
  }
 
  emptyMessage.style.display = "none"
 
  filtered.forEach(expense => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${expense.date || "—"}</td>
      <td><span class="expense-title-cell">${expense.title || ""}</span></td>
      <td><span class="category-badge category-${(expense.category || "other").toLowerCase()}">${expense.category || ""}</span></td>
      <td class="amount-cell">${formatMoney(expense.amount || 0)}</td>
      <td><span class="type-badge">${getRecurringLabel(expense)}</span></td>
      <td class="notes-cell">${expense.notes || "—"}</td>
      <td class="actions-cell">
        <button class="row-edit-btn" data-id="${expense.id}">Edit</button>
        <button class="row-delete-btn" data-id="${expense.id}">Delete</button>
      </td>
    `
    body.appendChild(row)
  })
 
  document.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Delete this expense?")) return
      const { error } = await supabase.from("expenses").delete().eq("id", btn.dataset.id)
      if (error) { console.error(error); alert("Failed to delete expense."); return }
      await loadExpenses()
    })
  })
 
  document.querySelectorAll(".row-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const expense = allExpenses.find(e => e.id === btn.dataset.id)
      if (expense) openEditModal(expense)
    })
  })
}
 
// ─── Load expenses ────────────────────────────────────────────────────────────
 
async function loadExpenses() {
  const company = await getCurrentUserCompany()
  if (!company) return
 
  const { data: expenses, error } = await supabase
    .from("expenses").select("*").eq("company_id", company.id).order("date", { ascending: false })
 
  if (error) { console.error("Expenses error:", error); return }
 
  allExpenses = expenses || []
  renderExpenses()
  renderUpcomingExpenses(allExpenses)
}
 
// ─── Save new expense ─────────────────────────────────────────────────────────
 
async function saveExpense() {
  const company = await getCurrentUserCompany()
  if (!company) return
 
  const title    = document.getElementById("expense-title").value.trim()
  const category = document.getElementById("expense-category").value
  const amount   = parseFloat(document.getElementById("expense-amount").value) || 0
  const date     = document.getElementById("expense-date").value
  const notes    = document.getElementById("expense-notes").value.trim()
  const mode     = document.getElementById("expense-mode").value
  const isRecurring        = mode === "recurring"
  const recurringFrequency = isRecurring ? document.getElementById("recurring-frequency").value : null
  const recurringDayValue  = isRecurring ? document.getElementById("recurring-day-value").value : ""
 
  if (!title || !date || amount <= 0) { alert("Please fill in title, amount, and date."); return }
 
  let recurringDayOfWeek   = null
  let recurringDayOfMonth  = null
  let recurringMonthOfYear = null
 
  if (isRecurring) {
    if (recurringFrequency === "weekly")  recurringDayOfWeek   = recurringDayValue === "" ? 0  : Number(recurringDayValue)
    if (recurringFrequency === "monthly") recurringDayOfMonth  = recurringDayValue === "" ? 31 : Number(recurringDayValue)
    if (recurringFrequency === "yearly")  recurringMonthOfYear = recurringDayValue === "" ? 12 : Number(recurringDayValue)
  }
 
  const { error } = await supabase.from("expenses").insert([{
    company_id: company.id, title, category, amount, date, notes,
    is_recurring: isRecurring,
    recurring_frequency: isRecurring ? recurringFrequency : null,
    recurring_day_of_week: isRecurring ? recurringDayOfWeek : null,
    recurring_day_of_month: isRecurring ? recurringDayOfMonth : null,
    recurring_month_of_year: isRecurring ? recurringMonthOfYear : null
  }])
 
  if (error) { console.error("Expense insert error:", error); alert("Error saving expense."); return }
 
  document.getElementById("expense-title").value    = ""
  document.getElementById("expense-amount").value   = ""
  document.getElementById("expense-notes").value    = ""
  document.getElementById("expense-mode").value     = "one-time"
  document.getElementById("expense-category").value = "Fuel"
  document.getElementById("expense-date").value     = new Date().toISOString().split("T")[0]
  document.getElementById("recurring-frequency").value  = "daily"
  document.getElementById("recurring-day-value").innerHTML = ""
  updateExpenseModeUI()
  document.getElementById("expense-form-wrap").style.display = "none"
 
  await loadExpenses()
}
 
// ─── Edit modal ───────────────────────────────────────────────────────────────
 
const editModal = document.getElementById("edit-expense-modal")
 
function openEditModal(expense) {
  document.getElementById("edit-expense-id").value       = expense.id
  document.getElementById("edit-expense-title").value    = expense.title || ""
  document.getElementById("edit-expense-category").value = expense.category || "Fuel"
  document.getElementById("edit-expense-amount").value   = expense.amount || ""
  document.getElementById("edit-expense-date").value     = expense.date || ""
  document.getElementById("edit-expense-notes").value    = expense.notes || ""
  editModal.style.display = "flex"
}
 
function closeEditModal() { editModal.style.display = "none" }
 
document.getElementById("edit-modal-close").addEventListener("click", closeEditModal)
document.getElementById("edit-modal-cancel").addEventListener("click", closeEditModal)
editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditModal() })
 
document.getElementById("edit-modal-save").addEventListener("click", async () => {
  const id       = document.getElementById("edit-expense-id").value
  const title    = document.getElementById("edit-expense-title").value.trim() || "Expense"
  const category = document.getElementById("edit-expense-category").value
  const amount   = parseFloat(document.getElementById("edit-expense-amount").value) || 0
  const date     = document.getElementById("edit-expense-date").value
  const notes    = document.getElementById("edit-expense-notes").value.trim()
 
  const saveBtn = document.getElementById("edit-modal-save")
  saveBtn.textContent = "Saving..."
  saveBtn.disabled = true
 
  const { error } = await supabase.from("expenses").update({ title, category, amount, date, notes }).eq("id", id)
 
  saveBtn.textContent = "Save Changes"
  saveBtn.disabled = false
 
  if (error) { console.error("Update error:", error); alert("Failed to update expense."); return }
 
  closeEditModal()
  await loadExpenses()
})
 
// ─── Tabs ─────────────────────────────────────────────────────────────────────
 
function setupTabs() {
  document.querySelectorAll(".expense-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".expense-tab").forEach(t => t.classList.remove("active"))
      tab.classList.add("active")
      activeFilter = tab.dataset.filter
      renderExpenses()
    })
  })
}
 
// ─── Toggle form ──────────────────────────────────────────────────────────────
 
document.getElementById("toggle-expense-form").addEventListener("click", () => {
  const form = document.getElementById("expense-form-wrap")
  form.style.display = form.style.display === "none" ? "block" : "none"
})
 
// ─── Logout ───────────────────────────────────────────────────────────────────
 
document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut()
  window.location.href = "auth.html"
})
 
// ─── Init ─────────────────────────────────────────────────────────────────────
 
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("save-expense").addEventListener("click", saveExpense)
  document.getElementById("save-gas-estimate").addEventListener("click", saveGasEstimate)
  document.getElementById("expense-mode").addEventListener("change", updateExpenseModeUI)
  document.getElementById("recurring-frequency").addEventListener("change", fillRecurringDayOptions)
 
  setupTabs()
  updateExpenseModeUI()
  await loadGasEstimate()
  await loadExpenses()
})
 