import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  "https://szyakeozorhmardkdfav.supabase.co",
  "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"
)

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatMoney(value) {
  return "$" + Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatMonthLabel(dateString) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function formatJobDate(dateString) {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function groupJobsByMonth(jobs) {
  const groups = {}
  jobs.forEach(job => {
    const label = formatMonthLabel(job.date)
    if (!groups[label]) groups[label] = []
    groups[label].push(job)
  })
  return groups
}

// ─── Edit modal elements ──────────────────────────────────────────────────────

const editModal     = document.getElementById("edit-modal")
const modalClose    = document.getElementById("modal-close")
const modalCancel   = document.getElementById("modal-cancel")
const modalSave     = document.getElementById("modal-save")
const editPayMode   = document.getElementById("edit-pay-mode")
const editSamePay   = document.getElementById("edit-same-pay")
const editCustomPay = document.getElementById("edit-custom-pay")
const editPayType   = document.getElementById("edit-pay-type")
const editHourly    = document.getElementById("edit-hourly-fields")
const editDaily     = document.getElementById("edit-daily-fields")
const editEmpRows   = document.getElementById("edit-employee-rows")
const editExpenses  = document.getElementById("edit-expenses-container")
const costPreview   = document.getElementById("edit-cost-preview")

// ─── Pay mode toggles ─────────────────────────────────────────────────────────

function toggleEditPayMode() {
  const mode = editPayMode.value
  editSamePay.classList.toggle("hidden", mode !== "same")
  editCustomPay.classList.toggle("hidden", mode !== "custom")
  updateCostPreview()
}

function toggleEditPayType() {
  const type = editPayType.value
  editHourly.classList.toggle("hidden", type !== "hourly")
  editDaily.classList.toggle("hidden", type !== "daily")
  updateCostPreview()
}

editPayMode.addEventListener("change", toggleEditPayMode)
editPayType.addEventListener("change", toggleEditPayType)

// ─── Add employee row ─────────────────────────────────────────────────────────

function addEditEmployeeRow() {
  const div = document.createElement("div")
  div.className = "employee-row"
  div.innerHTML = `
    <select class="custom-pay-type">
      <option value="hourly">Hourly</option>
      <option value="daily">Daily</option>
    </select>
    <input type="number" step="0.01" class="custom-hours" placeholder="Hours" />
    <input type="number" step="0.01" class="custom-rate" placeholder="Rate ($)" />
  `
  editEmpRows.appendChild(div)

  div.querySelector(".custom-pay-type").addEventListener("change", () => {
    updateEmployeeRow(div)
    updateCostPreview()
  })

  div.querySelectorAll("input").forEach(i => i.addEventListener("input", updateCostPreview))
  updateEmployeeRow(div)
}

function updateEmployeeRow(row) {
  const type = row.querySelector(".custom-pay-type")?.value
  const hoursInput = row.querySelector(".custom-hours")
  const rateInput  = row.querySelector(".custom-rate")
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

document.getElementById("edit-add-employee").addEventListener("click", addEditEmployeeRow)

// ─── Add expense row ──────────────────────────────────────────────────────────

function addEditExpenseRow(reason = "", amount = "") {
  const div = document.createElement("div")
  div.className = "expense-row"
  div.innerHTML = `
    <div class="expense-inner">
      <input type="text" placeholder="Expense reason" value="${reason}" />
      <input type="number" step="0.01" placeholder="Amount ($)" value="${amount}" />
    </div>
  `
  div.querySelectorAll("input").forEach(i => i.addEventListener("input", updateCostPreview))
  editExpenses.appendChild(div)
}

document.getElementById("edit-add-expense").addEventListener("click", () => addEditExpenseRow())

// ─── Calculate total cost from modal fields ───────────────────────────────────

function calculateEditTotal() {
  const baseCost = parseFloat(document.getElementById("edit-base-cost").value) || 0
  const mode     = editPayMode.value

  let employeeTotal = 0

  if (mode === "same") {
    const count = parseFloat(document.getElementById("edit-emp-count").value) || 1
    const type  = editPayType.value
    if (type === "hourly") {
      const hours = parseFloat(document.getElementById("edit-emp-hours").value) || 0
      const rate  = parseFloat(document.getElementById("edit-emp-rate").value) || 0
      employeeTotal = hours * rate * count
    } else {
      const daily = parseFloat(document.getElementById("edit-emp-daily").value) || 0
      employeeTotal = daily * count
    }
  } else if (mode === "custom") {
    document.querySelectorAll("#edit-employee-rows .employee-row").forEach(row => {
      const type  = row.querySelector(".custom-pay-type")?.value
      const hours = parseFloat(row.querySelector(".custom-hours")?.value) || 0
      const rate  = parseFloat(row.querySelector(".custom-rate")?.value) || 0
      employeeTotal += type === "hourly" ? hours * rate : rate
    })
  }

  let extraExpenses = 0
  document.querySelectorAll("#edit-expenses-container .expense-row").forEach(row => {
    const inputs = row.querySelectorAll("input")
    extraExpenses += parseFloat(inputs[1]?.value) || 0
  })

  return baseCost + employeeTotal + extraExpenses
}

function updateCostPreview() {
  const total = calculateEditTotal()
  costPreview.textContent = formatMoney(total)
  costPreview.style.color = total >= 0 ? "#22c55e" : "#ef4444"
}

// Listen to all relevant inputs for live preview
function bindPreviewListeners() {
  const ids = ["edit-base-cost", "edit-emp-count", "edit-emp-hours", "edit-emp-rate", "edit-emp-daily"]
  ids.forEach(id => {
    const el = document.getElementById(id)
    if (el) el.addEventListener("input", updateCostPreview)
  })
}

bindPreviewListeners()

// ─── Open / close modal ───────────────────────────────────────────────────────

function openEditModal(job) {
  // Reset
  editEmpRows.innerHTML = ""
  editExpenses.innerHTML = ""

  document.getElementById("edit-job-id").value    = job.id
  document.getElementById("edit-title").value     = job.title || ""
  document.getElementById("edit-date").value      = job.date || ""
  document.getElementById("edit-revenue").value   = job.revenue || ""
  document.getElementById("edit-base-cost").value = job.cost || ""
  document.getElementById("edit-notes").value     = job.notes || ""

  // Default pay mode to none
  editPayMode.value = "none"
  toggleEditPayMode()
  toggleEditPayType()
  updateCostPreview()

  editModal.style.display = "flex"
}

function closeEditModal() {
  editModal.style.display = "none"
}

modalClose.addEventListener("click", closeEditModal)
modalCancel.addEventListener("click", closeEditModal)
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal()
})

// ─── Save edited job ──────────────────────────────────────────────────────────

modalSave.addEventListener("click", async () => {
  const jobId   = document.getElementById("edit-job-id").value
  const title   = document.getElementById("edit-title").value.trim() || "Job"
  const date    = document.getElementById("edit-date").value
  const revenue = parseFloat(document.getElementById("edit-revenue").value) || 0
  const cost    = calculateEditTotal()
  const notes   = document.getElementById("edit-notes").value.trim()

  modalSave.textContent = "Saving..."
  modalSave.disabled = true

  const { error } = await supabase
    .from("jobs")
    .update({ title, date, revenue, cost, notes })
    .eq("id", jobId)

  modalSave.textContent = "Save Changes"
  modalSave.disabled = false

  if (error) {
    console.error("Update error:", error)
    alert("Failed to update job.")
    return
  }

  closeEditModal()
  loadJobs()
})

// ─── Load & render jobs ───────────────────────────────────────────────────────

async function loadJobs() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) { window.location.href = "auth.html"; return }

  const { data: company, error: companyError } = await supabase
    .from("companies").select("*").eq("owner_user_id", user.id).single()

  if (companyError || !company) { console.error("Company not found", companyError); return }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, date, revenue, cost, status, notes")
    .eq("company_id", company.id)
    .order("date", { ascending: false })

  if (jobsError) { console.error("Jobs error:", jobsError); return }

  const groupsContainer = document.getElementById("jobs-groups")
  const emptyMessage    = document.getElementById("empty-message")

  groupsContainer.innerHTML = ""

  if (!jobs || jobs.length === 0) {
    if (emptyMessage) emptyMessage.style.display = "block"
    return
  }

  if (emptyMessage) emptyMessage.style.display = "none"

  const groupedJobs = groupJobsByMonth(jobs)

  Object.entries(groupedJobs).forEach(([monthLabel, monthJobs]) => {
    const monthProfit  = monthJobs.reduce((sum, job) => sum + ((Number(job.revenue) || 0) - (Number(job.cost) || 0)), 0)
    const profitColor  = monthProfit >= 0 ? "#22c55e" : "#ef4444"

    const section = document.createElement("div")
    section.className = "month-group"

    section.innerHTML = `
      <details class="month-details" open>
        <summary class="month-summary">
          <div class="month-summary-left">
            <div class="month-title">${monthLabel}</div>
            <div class="month-subtitle">${monthJobs.length} job${monthJobs.length === 1 ? "" : "s"}</div>
          </div>
          <div class="month-profit" style="color:${profitColor}">${formatMoney(monthProfit)}</div>
        </summary>
        <div class="month-jobs"></div>
      </details>
    `

    const jobsContainer = section.querySelector(".month-jobs")

    monthJobs.forEach(job => {
      const revenue   = Number(job.revenue) || 0
      const cost      = Number(job.cost) || 0
      const profit    = revenue - cost
      const profitCol = profit >= 0 ? "#22c55e" : "#ef4444"

      const jobCard = document.createElement("div")
      jobCard.className = "job-card"

      jobCard.innerHTML = `
        <details class="job-details-wrap">
          <summary class="job-summary">
            <div class="job-summary-left">
              <div class="job-title">${job.title || "Job"}</div>
              <div class="job-date">${formatJobDate(job.date)}</div>
            </div>
            <div class="job-profit" style="color:${profitCol}">${formatMoney(profit)}</div>
          </summary>

          <div class="job-detail-body">
            <div class="job-stat-row">
              <div class="job-stat">
                <span class="job-stat-label">Revenue</span>
                <span class="job-stat-value">${formatMoney(revenue)}</span>
              </div>
              <div class="job-stat">
                <span class="job-stat-label">Cost</span>
                <span class="job-stat-value">${formatMoney(cost)}</span>
              </div>
              <div class="job-stat">
                <span class="job-stat-label">Profit</span>
                <span class="job-stat-value" style="color:${profitCol}">${formatMoney(profit)}</span>
              </div>
              <div class="job-stat">
                <span class="job-stat-label">Status</span>
                <span class="job-stat-value job-status">${job.status || "completed"}</span>
              </div>
            </div>
            ${job.notes ? `<div class="job-notes"><span class="job-notes-label">Notes</span><p>${job.notes}</p></div>` : ""}
            <div class="job-actions">
              <button class="edit-job-btn" data-job-id="${job.id}">Edit</button>
              <button class="delete-job-btn" data-job-id="${job.id}">Delete</button>
            </div>
          </div>
        </details>
      `

      jobsContainer.appendChild(jobCard)
    })

    groupsContainer.appendChild(section)
  })

  // ── Delete handlers
  document.querySelectorAll(".delete-job-btn").forEach(button => {
    button.addEventListener("click", async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const jobId = button.getAttribute("data-job-id")
      if (!window.confirm("Are you sure you want to delete this job?")) return
      const { error } = await supabase.from("jobs").delete().eq("id", jobId)
      if (error) { console.error("Delete error:", error); alert("Failed to delete job."); return }
      loadJobs()
    })
  })

  // ── Edit handlers
  document.querySelectorAll(".edit-job-btn").forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      const jobId = button.getAttribute("data-job-id")
      const job   = jobs.find(j => j.id === jobId)
      if (job) openEditModal(job)
    })
  })
}

// ─── Logout ───────────────────────────────────────────────────────────────────

document.getElementById("logout-btn").addEventListener("click", async () => {
  await supabase.auth.signOut()
  window.location.href = "auth.html"
})

loadJobs()