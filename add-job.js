const SUPABASE_URL = "https://szyakeozorhmardkdfav.supabase.co"
const SUPABASE_KEY = "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const expensesContainer = document.getElementById("expensesContainer")
const employeeRowsContainer = document.getElementById("employeeRowsContainer")

const payMode = document.getElementById("payMode")
const samePaySection = document.getElementById("samePaySection")
const customPaySection = document.getElementById("customPaySection")

const payType = document.getElementById("payType")
const hourlyFields = document.getElementById("hourlyFields")
const dailyFields = document.getElementById("dailyFields")

function toggleSamePayFields() {
  if (payType.value === "hourly") {
    hourlyFields.classList.remove("hidden")
    dailyFields.classList.add("hidden")
    document.getElementById("daily-pay-info").classList.add("hidden")
  } else {
    hourlyFields.classList.add("hidden")
    dailyFields.classList.remove("hidden")
    document.getElementById("daily-pay-info").classList.remove("hidden")
  }
}

function togglePayMode() {
  if (payMode.value === "custom") {
    samePaySection.classList.add("hidden")
    customPaySection.classList.remove("hidden")
    if (employeeRowsContainer.children.length === 0) addEmployeeRow()
  } else {
    samePaySection.classList.remove("hidden")
    customPaySection.classList.add("hidden")
  }
}

function addExpenseRow() {
  const div = document.createElement("div")
  div.className = "expense-row"
  div.innerHTML = `
    <div class="expense-inner">
      <input type="text" placeholder="Expense reason" />
      <input type="number" step="0.01" placeholder="Amount ($)" />
    </div>
  `
  expensesContainer.appendChild(div)
}

function updateEmployeeRow(row) {
  const type = row.querySelector(".custom-pay-type")?.value
  const hoursInput = row.querySelector(".custom-hours")
  const rateInput = row.querySelector(".custom-rate")
  if (!hoursInput || !rateInput) return
  if (type === "hourly") {
    hoursInput.style.display = "block"
    hoursInput.placeholder = "Hours"
    rateInput.placeholder = "Hourly Rate ($)"
  } else {
    hoursInput.style.display = "none"
    hoursInput.value = ""
    rateInput.placeholder = "Daily Pay ($)"
  }
}

function addEmployeeRow() {
  const div = document.createElement("div")
  div.className = "employee-row"
  div.innerHTML = `
    <select class="custom-pay-type">
      <option value="hourly">Hourly</option>
      <option value="daily">Daily</option>
    </select>
    <input type="number" step="0.01" class="custom-hours" placeholder="Hours" />
    <input type="number" step="0.01" class="custom-rate" placeholder="Hourly Rate ($)" />
  `
  employeeRowsContainer.appendChild(div)
  const typeSelect = div.querySelector(".custom-pay-type")
  typeSelect.addEventListener("change", () => updateEmployeeRow(div))
  updateEmployeeRow(div)
}

function calculateEmployeeTotal() {
  if (payMode.value === "custom") {
    let total = 0
    document.querySelectorAll(".employee-row").forEach(row => {
      const type = row.querySelector(".custom-pay-type")?.value
      const hours = parseFloat(row.querySelector(".custom-hours")?.value) || 0
      const rate = parseFloat(row.querySelector(".custom-rate")?.value) || 0
      total += type === "hourly" ? hours * rate : rate
    })
    return total
  }
  const count = parseFloat(document.getElementById("employeeCount").value) || 1
  if (payType.value === "hourly") {
    const hours = parseFloat(document.getElementById("employeeHours").value) || 0
    const rate = parseFloat(document.getElementById("employeePay").value) || 0
    return hours * rate * count
  }
  const daily = parseFloat(document.getElementById("employeeDaily").value) || 0
  return daily * count
}

function calculateExtraExpenses() {
  let total = 0
  document.querySelectorAll(".expense-row").forEach(row => {
    const inputs = row.querySelectorAll("input")
    total += parseFloat(inputs[1]?.value) || 0
  })
  return total
}

function getLocalDateString(date) {
  return date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0")
}

function isUsingDailyPay() {
  if (payMode.value === "same" && payType.value === "daily") return true
  if (payMode.value === "custom") {
    const rows = document.querySelectorAll(".employee-row")
    for (const row of rows) {
      if (row.querySelector(".custom-pay-type")?.value === "daily") return true
    }
  }
  return false
}

async function saveJob() {
  try {
    const jobTitle = document.getElementById("jobTitle").value.trim() || "Job"
    const revenue = parseFloat(document.getElementById("revenue").value) || 0
    const baseCost = parseFloat(document.getElementById("cost").value) || 0
    const selectedDate = document.getElementById("jobDate")?.value || getLocalDateString(new Date())

    // Validate date — max 3 days future
    const [y, m, d] = selectedDate.split("-").map(Number)
    const jobDate = new Date(y, m - 1, d)
    const today = new Date(); today.setHours(0,0,0,0)
    const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 3)
    if (jobDate > maxDate) {
      alert("Job date can't be more than 3 days in the future.")
      return
    }

    const extraExpenses = calculateExtraExpenses()
    const employeeTotal = calculateEmployeeTotal()
    const usingDaily = isUsingDailyPay()

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) { alert("Not logged in"); return }

    const { data: company, error: companyError } = await supabaseClient
      .from("companies").select("*").eq("owner_user_id", user.id).single()
    if (companyError || !company) { alert("Company not found"); return }

    if (usingDaily) {
      // ── Daily pay mode: split across all jobs that day ──────────────────

      // 1. Fetch all existing jobs for this date
      const { data: existingJobs } = await supabaseClient
        .from("jobs")
        .select("id, cost, revenue")
        .eq("company_id", company.id)
        .eq("date", selectedDate)

      const existingCount = (existingJobs || []).length
      const totalJobsToday = existingCount + 1 // including this new one
      const dailyPayShare = employeeTotal / totalJobsToday

      // 2. Recalculate cost for this new job
      const newJobCost = baseCost + dailyPayShare + extraExpenses

      // 3. Save the new job
      const { error: insertError } = await supabaseClient
        .from("jobs")
        .insert([{
          company_id: company.id,
          title: jobTitle,
          revenue,
          cost: newJobCost,
          status: "completed",
          date: selectedDate
        }])

      if (insertError) { alert("Error saving job"); return }

      // 4. Update all existing jobs from today — recalculate their employee share
      if (existingJobs && existingJobs.length > 0) {
        for (const job of existingJobs) {
          // Get the non-employee portion of their cost
          // We store total cost so we need to redistribute the daily pay share
          // Each existing job gets the same new dailyPayShare
          const { data: fullJob } = await supabaseClient
            .from("jobs").select("*").eq("id", job.id).single()

          if (fullJob) {
            // Recalculate: remove old daily pay share, add new one
            const oldShare = employeeTotal / existingCount
            const nonEmployeeCost = fullJob.cost - oldShare
            const updatedCost = nonEmployeeCost + dailyPayShare

            await supabaseClient
              .from("jobs")
              .update({ cost: updatedCost })
              .eq("id", job.id)
          }
        }
      }

    } else {
      // ── Hourly/non-daily pay: normal save ────────────────────────────────
      const totalCost = baseCost + employeeTotal + extraExpenses
      const { error } = await supabaseClient
        .from("jobs")
        .insert([{
          company_id: company.id,
          title: jobTitle,
          revenue,
          cost: totalCost,
          status: "completed",
          date: selectedDate
        }])
      if (error) { alert("Error saving job"); return }
    }

    window.location.href = "dashboard.html"

  } catch (err) {
    console.error("Unexpected error:", err)
    alert("Unexpected error saving job")
  }
}

if (payType) payType.addEventListener("change", toggleSamePayFields)
if (payMode) payMode.addEventListener("change", togglePayMode)

document.getElementById("addExpense").addEventListener("click", addExpenseRow)
document.getElementById("addEmployeeRow").addEventListener("click", addEmployeeRow)
document.getElementById("saveJob").addEventListener("click", saveJob)

toggleSamePayFields()
togglePayMode()
