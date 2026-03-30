export function getUpcomingExpenses(expenses) {
  const today = new Date()
  const results = []

  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0
    if (amount <= 0) return

    if (!expense.is_recurring) {
      const date = new Date(expense.date)
      const diff = (date - today) / (1000 * 60 * 60 * 24)

      if (diff >= 0 && diff <= 30) {
        results.push({
          date,
          title: expense.title,
          category: expense.category,
          amount,
          frequency: "One-Time"
        })
      }

      return
    }

    if (expense.recurring_frequency === "weekly") {
      const recurringDay =
        expense.recurring_day_of_week != null
          ? Number(expense.recurring_day_of_week)
          : 0

      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)

        if (date.getDay() === recurringDay) {
          results.push({
            date,
            title: expense.title,
            category: expense.category,
            amount,
            frequency: "Weekly"
          })
          break
        }
      }
    }

    if (expense.recurring_frequency === "monthly") {
      const recurringDay =
        expense.recurring_day_of_month != null
          ? Number(expense.recurring_day_of_month)
          : 31

      const date = new Date(today.getFullYear(), today.getMonth(), recurringDay)

      if (date >= today) {
        results.push({
          date,
          title: expense.title,
          category: expense.category,
          amount,
          frequency: "Monthly"
        })
      }
    }

    if (expense.recurring_frequency === "yearly") {
      const month =
        expense.recurring_month_of_year != null
          ? Number(expense.recurring_month_of_year) - 1
          : 11

      const date = new Date(today.getFullYear(), month, 1)

      if (date >= today) {
        results.push({
          date,
          title: expense.title,
          category: expense.category,
          amount,
          frequency: "Yearly"
        })
      }
    }
  })

  return results.sort((a, b) => a.date - b.date)
}

export function renderUpcomingExpenses(expenses, formatMoney) {
  const body = document.getElementById("upcoming-expenses-body")
  const empty = document.getElementById("no-upcoming-expenses")

  body.innerHTML = ""

  if (!expenses.length) {
    empty.style.display = "block"
    return
  }

  empty.style.display = "none"

  expenses.forEach(exp => {
    const row = document.createElement("tr")

    row.innerHTML = `
      <td>${exp.date.toLocaleDateString()}</td>
      <td>${exp.title}</td>
      <td>${exp.category}</td>
      <td>${formatMoney(exp.amount)}</td>
      <td>${exp.frequency}</td>
    `

    body.appendChild(row)
  })
}