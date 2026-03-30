import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderChart } from "./charts.js"

const supabase = createClient(
  "https://szyakeozorhmardkdfav.supabase.co",
  "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"
)

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

function getEarliestDate(jobs, expenses) {
  const earliestJobDate = (jobs || [])
    .filter(job => job.date)
    .map(job => getLocalDate(job.date))
    .sort((a, b) => a - b)[0]

  const earliestExpenseDate = (expenses || [])
    .filter(expense => expense.date)
    .map(expense => getLocalDate(expense.date))
    .sort((a, b) => a - b)[0]

  if (earliestJobDate && earliestExpenseDate) {
    return earliestJobDate < earliestExpenseDate ? earliestJobDate : earliestExpenseDate
  }

  return earliestJobDate || earliestExpenseDate || null
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
  const earliestDate = getEarliestDate(jobs, expenses)

  return {
    daily:   getProfitForDate(jobs, expenses, today),
    weekly:  sumProfitBetweenDates(jobs, expenses, startOfWeek, today),
    monthly: sumProfitBetweenDates(jobs, expenses, startOfMonth, today),
    yearly:  sumProfitBetweenDates(jobs, expenses, startOfYear, today),
    allTime: earliestDate ? sumProfitBetweenDates(jobs, expenses, earliestDate, today) : 0
  }
}

function calculateMonthlySummary(jobs, expenses) {
  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const today        = getTodayDateOnly()

  const monthJobs = (jobs || []).filter(job => {
    if (!job.date) return false
    const d = getLocalDate(job.date)
    return d >= startOfMonth && d <= today
  })

  const jobCount      = monthJobs.length
  const totalRevenue  = monthJobs.reduce((sum, job) => sum + (Number(job.revenue) || 0), 0)
  const totalJobCost  = monthJobs.reduce((sum, job) => sum + (Number(job.cost) || 0), 0)

  let totalExpenses = 0
  const cursor = new Date(startOfMonth)
  while (cursor <= today) {
    ;(expenses || []).forEach(expense => {
      totalExpenses += getExpenseAmountForDate(expense, cursor)
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  const netProfit        = totalRevenue - totalJobCost - totalExpenses
  const avgProfitPerJob  = jobCount > 0 ? (totalRevenue - totalJobCost) / jobCount : 0

  return { jobCount, totalRevenue, totalExpenses, netProfit, avgProfitPerJob }
}

function renderMonthlySummary(summary) {
  const set = (id, val, isMoney = true) => {
    const el = document.getElementById(id)
    if (el) el.innerText = isMoney ? formatMoney(val) : val
  }

  set("jobs-this-month", summary.jobCount, false)
  set("avg-profit-per-job", summary.avgProfitPerJob)
  set("total-revenue-month", summary.totalRevenue)
  set("total-expenses-month", summary.totalExpenses)

  const netEl = document.getElementById("net-profit-month")
  if (netEl) {
    netEl.innerText    = formatMoney(summary.netProfit)
    netEl.style.color  = summary.netProfit >= 0 ? "#22c55e" : "#ef4444"
  }
}

function buildDailyChartData(jobs, expenses) {
  const now = new Date()
  const result = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    result.push({ label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), profit: getProfitForDate(jobs, expenses, date) })
  }
  return result
}

function buildWeeklyChartData(jobs, expenses) {
  const now = new Date()
  const result = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = getWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7)))
    const weekEnd   = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    result.push({ label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }), profit: sumProfitBetweenDates(jobs, expenses, weekStart, weekEnd) })
  }
  return result
}

function buildMonthlyChartData(jobs, expenses) {
  const now = new Date()
  const result = []
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    result.push({ label: start.toLocaleDateString("en-US", { month: "short" }), profit: sumProfitBetweenDates(jobs, expenses, start, end) })
  }
  return result
}

function buildYearlyChartData(jobs, expenses) {
  const currentYear = new Date().getFullYear()
  const result = []
  for (let month = 0; month < 12; month++) {
    const start = new Date(currentYear, month, 1)
    const end   = new Date(currentYear, month + 1, 0)
    result.push({ label: new Date(currentYear, month, 1).toLocaleDateString("en-US", { month: "short" }), profit: sumProfitBetweenDates(jobs, expenses, start, end) })
  }
  return result
}

function buildAllTimeChartData(jobs, expenses) {
  const today        = getTodayDateOnly()
  const earliestDate = getEarliestDate(jobs, expenses)
  if (!earliestDate) return []

  const result = []
  let runningTotal = 0
  const cursor = new Date(earliestDate)

  while (cursor <= today) {
    runningTotal += getProfitForDate(jobs, expenses, cursor)
    result.push({ label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }), profit: runningTotal })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

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
        const date = new Date(today); date.setDate(today.getDate() + i)
        if (expense.date && date < getLocalDate(expense.date)) continue
        results.push({ date, title: expense.title || "", category: expense.category || "", amount, frequency: "Daily" })
      }
      return
    }

    if (expense.recurring_frequency === "weekly") {
      const recurringDay = expense.recurring_day_of_week != null ? Number(expense.recurring_day_of_week) : 0
      for (let i = 0; i <= 30; i++) {
        const date = new Date(today); date.setDate(today.getDate() + i)
        if (expense.date && date < getLocalDate(expense.date)) continue
        if (date.getDay() === recurringDay) results.push({ date, title: expense.title || "", category: expense.category || "", amount, frequency: "Weekly" })
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
        if (dueDate >= today && dueDate <= endDate) results.push({ date: dueDate, title: expense.title || "", category: expense.category || "", amount, frequency: "Monthly" })
      }
      return
    }

    if (expense.recurring_frequency === "yearly") {
      const recurringMonth = expense.recurring_month_of_year != null ? Number(expense.recurring_month_of_year) - 1 : 11
      for (let i = 0; i <= 1; i++) {
        const dueDate = new Date(today.getFullYear() + i, recurringMonth, 1)
        if (expense.date && dueDate < getLocalDate(expense.date)) continue
        if (dueDate >= today && dueDate <= endDate) results.push({ date: dueDate, title: expense.title || "", category: expense.category || "", amount, frequency: "Yearly" })
      }
    }
  })

  return results.sort((a, b) => a.date - b.date)
}

function renderUpcomingExpenses(expenses) {
  const body  = document.getElementById("upcoming-expenses-body")
  const empty = document.getElementById("no-upcoming-expenses")
  if (!body || !empty) return
  body.innerHTML = ""
  if (!expenses.length) { empty.style.display = "block"; return }
  empty.style.display = "none"
  expenses.forEach(expense => {
    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${expense.date.toLocaleDateString("en-US")}</td>
      <td>${expense.title}</td>
      <td>${expense.category}</td>
      <td>${formatMoney(expense.amount)}</td>
      <td>${expense.frequency}</td>
    `
    body.appendChild(row)
  })
}

function colorStatValue(id, value) {
  const el = document.getElementById(id)
  if (!el) return
  el.style.color = value < 0 ? "#ef4444" : "#ffffff"
}

function getBusinessName(company) {
  return company.business_name || company.company_name || company.name || company.title || "Your Business"
}

async function loadDashboard() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) { window.location.href = "auth.html"; return }

  const emailElement = document.getElementById("user-email")
  if (emailElement) emailElement.innerText = user.email

  const { data: company, error: companyError } = await supabase
    .from("companies").select("*").eq("owner_user_id", user.id).single()

  if (companyError || !company) { window.location.href = "onboarding.html"; return }

  const name = getBusinessName(company)

  // Set business name in header
  const businessNameEl = document.getElementById("business-name")
  if (businessNameEl) businessNameEl.innerText = name

  // Set business name in sidebar
  const sidebarNameEl = document.getElementById("sidebar-business-name")
  if (sidebarNameEl) sidebarNameEl.textContent = name

  // ── PAYWALL REMOVED FOR FREE LAUNCH ──────────────────────────────────────
  // Uncomment when payments go live:
  // if (!company.subscription_status || company.subscription_status !== "active") {
  //   window.location.href = "paywall.html"
  //   return
  // }
  // ─────────────────────────────────────────────────────────────────────────

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs").select("revenue, cost, date").eq("company_id", company.id)
  if (jobsError) { console.error("Jobs error:", jobsError); return }

  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("title, category, amount, date, is_recurring, recurring_frequency, recurring_day_of_week, recurring_day_of_month, recurring_month_of_year")
    .eq("company_id", company.id)
  if (expensesError) { console.error("Expenses error:", expensesError); return }

  const safeJobs     = jobs || []
  const safeExpenses = expenses || []
  const totals       = calculateProfitTotals(safeJobs, safeExpenses)

  const fields = [
    ["daily-profit",    totals.daily],
    ["weekly-profit",   totals.weekly],
    ["monthly-profit",  totals.monthly],
    ["yearly-profit",   totals.yearly],
    ["all-time-profit", totals.allTime],
  ]

  fields.forEach(([id, value]) => {
    const el = document.getElementById(id)
    if (el) el.innerText = formatMoney(value)
    colorStatValue(id, value)
  })

  renderChart("dailyChart",   buildDailyChartData(safeJobs, safeExpenses),   totals.daily)
  renderChart("weeklyChart",  buildWeeklyChartData(safeJobs, safeExpenses),  totals.weekly)
  renderChart("monthlyChart", buildMonthlyChartData(safeJobs, safeExpenses), totals.monthly)
  renderChart("yearlyChart",  buildYearlyChartData(safeJobs, safeExpenses),  totals.yearly)
  renderChart("allTimeChart", buildAllTimeChartData(safeJobs, safeExpenses), totals.allTime)

  renderMonthlySummary(calculateMonthlySummary(safeJobs, safeExpenses))
  renderUpcomingExpenses(getUpcomingExpenses(safeExpenses))
}

async function logout() {
  await supabase.auth.signOut()
  window.location.href = "auth.html"
}

loadDashboard()

window.logout = logout
