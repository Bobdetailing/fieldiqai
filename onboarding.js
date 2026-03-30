import { createClient } from "https://s://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://s://szyakeozorhmardkdfav.supabase.co",
  "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-"
);

const onboardingMessage = document.getElementById("onboarding-message");
const newBusinessModeCheckbox = document.getElementById("new-business-mode");

const expenseInputs = [
  document.getElementById("weekly-gas"),
  document.getElementById("monthly-vehicle-insurance"),
  document.getElementById("monthly-equipment-upkeep"),
  document.getElementById("monthly-liability-insurance"),
];

function showMessage(message, type = "error") {
  if (!onboardingMessage) return;
  onboardingMessage.textContent = message;
  onboardingMessage.className = `onboarding-message show ${type}`;
}

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

function updateNewBusinessMode() {
  const isNewBusiness = newBusinessModeCheckbox?.checked;

  expenseInputs.forEach((input) => {
    if (!input) return;
    input.disabled = isNewBusiness;
    if (isNewBusiness) input.value = "";

    const card = input.closest(".input-card");
    if (card) card.classList.toggle("disabled-card", isNewBusiness);
  });
}

if (newBusinessModeCheckbox) {
  newBusinessModeCheckbox.addEventListener("change", updateNewBusinessMode);
}

async function setupCompany() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    window.location.href = "auth.html";
    return;
  }

  const isNewBusiness = newBusinessModeCheckbox?.checked;

  const companyName = document.getElementById("company-name").value.trim();
  const weeklyGas = isNewBusiness ? 0 : parseFloat(document.getElementById("weekly-gas").value) || 0;
  const monthlyVehicleInsurance = isNewBusiness ? 0 : parseFloat(document.getElementById("monthly-vehicle-insurance").value) || 0;
  const monthlyEquipmentUpkeep = isNewBusiness ? 0 : parseFloat(document.getElementById("monthly-equipment-upkeep").value) || 0;
  const monthlyLiabilityInsurance = isNewBusiness ? 0 : parseFloat(document.getElementById("monthly-liability-insurance").value) || 0;

  if (!companyName) {
    showMessage("Please enter your business name.");
    return;
  }

  if (
    !isNewBusiness &&
    (weeklyGas <= 0 || monthlyVehicleInsurance <= 0 || monthlyEquipmentUpkeep <= 0 || monthlyLiabilityInsurance <= 0)
  ) {
    showMessage("Please fill out all 4 required basic expenses, or choose the new business option.");
    return;
  }

  showMessage("Saving your business setup...", "success");

  const { data: existingCompany, error: existingCompanyError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (existingCompanyError) {
    console.error("Existing company lookup error:", existingCompanyError);
    showMessage("Failed to check existing company.");
    return;
  }

  let companyId = existingCompany?.id || null;

  if (!companyId) {
    // ── New user — create company with active basic plan automatically ──────
    const { data: newCompany, error: companyInsertError } = await supabase
      .from("companies")
      .insert([{
        owner_user_id: user.id,
        name: companyName,
        estimated_weekly_gas_expense: weeklyGas,
        subscription_status: "active",   // free launch — everyone gets in
        plan_type: "basic",              // default plan
      }])
      .select()
      .single();

    if (companyInsertError || !newCompany) {
      console.error("Company insert error:", companyInsertError);
      showMessage("Error saving company.");
      return;
    }

    companyId = newCompany.id;
  } else {
    // ── Existing user updating their company ─────────────────────────────────
    const { error: companyUpdateError } = await supabase
      .from("companies")
      .update({
        name: companyName,
        estimated_weekly_gas_expense: weeklyGas,
        subscription_status: "active",
        plan_type: "basic",
      })
      .eq("id", companyId);

    if (companyUpdateError) {
      console.error("Company update error:", companyUpdateError);
      showMessage("Error updating company.");
      return;
    }
  }

  const today = getTodayDateString();

  const requiredExpenses = [
    {
      company_id: companyId,
      title: "Weekly Fuel Cost",
      category: "Fuel",
      amount: weeklyGas,
      date: today,
      notes: "Created during onboarding",
      is_recurring: true,
      recurring_frequency: "weekly",
      recurring_day_of_week: 0,
      recurring_day_of_month: null,
      recurring_month_of_year: null,
    },
    {
      company_id: companyId,
      title: "Vehicle Insurance",
      category: "Insurance",
      amount: monthlyVehicleInsurance,
      date: today,
      notes: "Created during onboarding",
      is_recurring: true,
      recurring_frequency: "monthly",
      recurring_day_of_week: null,
      recurring_day_of_month: 1,
      recurring_month_of_year: null,
    },
    {
      company_id: companyId,
      title: "Equipment Upkeep",
      category: "Equipment",
      amount: monthlyEquipmentUpkeep,
      date: today,
      notes: "Created during onboarding",
      is_recurring: true,
      recurring_frequency: "monthly",
      recurring_day_of_week: null,
      recurring_day_of_month: 1,
      recurring_month_of_year: null,
    },
    {
      company_id: companyId,
      title: "Liability Insurance",
      category: "Insurance",
      amount: monthlyLiabilityInsurance,
      date: today,
      notes: "Created during onboarding",
      is_recurring: true,
      recurring_frequency: "monthly",
      recurring_day_of_week: null,
      recurring_day_of_month: 1,
      recurring_month_of_year: null,
    },
  ];

  const expenseTitles = requiredExpenses.map(e => e.title);

  const { data: existingExpenses, error: existingExpensesError } = await supabase
    .from("expenses")
    .select("title")
    .eq("company_id", companyId)
    .in("title", expenseTitles);

  if (existingExpensesError) {
    console.error("Existing expenses lookup error:", existingExpensesError);
    showMessage("Failed to check required expenses.");
    return;
  }

  const existingTitles = new Set((existingExpenses || []).map(e => e.title));
  const expensesToInsert = requiredExpenses.filter(e => !existingTitles.has(e.title));

  if (expensesToInsert.length > 0) {
    const { error: expensesInsertError } = await supabase
      .from("expenses")
      .insert(expensesToInsert);

    if (expensesInsertError) {
      console.error("Expenses insert error:", expensesInsertError);
      showMessage("Company saved, but required expenses failed to save.");
      return;
    }
  }

  // ── Redirect straight to dashboard — no paywall during free launch ────────
  showMessage("Setup complete! Taking you to your dashboard...", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);
}

document.getElementById("save-company").addEventListener("click", setupCompany);
updateNewBusinessMode();