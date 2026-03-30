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
  } else {
    hourlyFields.classList.add("hidden")
    dailyFields.classList.remove("hidden")
  }
}

function togglePayMode() {
  if (payMode.value === "custom") {
    samePaySection.classList.add("hidden")
    customPaySection.classList.remove("hidden")
    if (employeeRowsContainer.children.length === 0) {
      addEmployeeRow()
    }
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
    const rows = document.querySelectorAll(".employee-row")
    rows.forEach(row => {
      const type = row.querySelector(".custom-pay-type")?.value
      const hours = parseFloat(row.querySelector(".custom-hours")?.value) || 0
      const rate = parseFloat(row.querySelector(".custom-rate")?.value) || 0
      if (type === "hourly") {
        total += hours * rate
      } else {
        total += rate
      }
    })
    return total
  }

  const employeeCount = parseFloat(document.getElementById("employeeCount").value) || 1

  if (payType.value === "hourly") {
    const hours = parseFloat(document.getElementById("employeeHours").value) || 0
    const rate = parseFloat(document.getElementById("employeePay").value) || 0
    return hours * rate * employeeCount
  }

  const dailyPay = parseFloat(document.getElementById("employeeDaily").value) || 0
  return dailyPay * employeeCount
}

function calculateExtraExpenses() {
  let total = 0
  const rows = document.querySelectorAll(".expense-row")
  rows.forEach(row => {
    const inputs = row.querySelectorAll("input")
    const amount = parseFloat(inputs[1]?.value) || 0
    total += amount
  })
  return total
}

async function saveJob() {
  try {
    const jobTitle = document.getElementById("jobTitle").value.trim() || "Job"
    const revenue = parseFloat(document.getElementById("revenue").value) || 0
    const baseCost = parseFloat(document.getElementById("cost").value) || 0
    const selectedJobDate =
      document.getElementById("jobDate")?.value ||
      new Date().toISOString().split("T")[0]

    const employeeTotal = calculateEmployeeTotal()
    const extraExpenses = calculateExtraExpenses()
    const totalCost = baseCost + employeeTotal + extraExpenses

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      alert("User not logged in")
      return
    }

    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("owner_user_id", user.id)
      .single()

    if (companyError || !company) {
      console.error(companyError)
      alert("Company not found")
      return
    }

    const { error } = await supabaseClient
      .from("jobs")
      .insert([{
        company_id: company.id,
        title: jobTitle,
        revenue: revenue,
        cost: totalCost,
        status: "completed",
        date: selectedJobDate
      }])

    if (error) {
      console.error("Supabase Insert Error:", error)
      alert("Error saving job")
      return
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