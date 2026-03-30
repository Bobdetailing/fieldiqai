import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://szyakeozorhmardkdfav.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WqRLpDuFC8YBkdtOuzGtSg_16n08qa-";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const messageBox = document.getElementById("paywall-message");
const buttons = document.querySelectorAll("[data-plan]");

function showMessage(message, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `paywall-message show ${type}`;
}

async function startCheckout(plan) {
  showMessage("Preparing secure checkout...", "success");

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    showMessage("You need to be logged in before choosing a plan.");
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: { plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    if (error) {
      console.error("Function invoke error:", error);
      showMessage(error.message || "Failed to create checkout session.");
      return;
    }

    if (!data?.url) {
      console.error("Missing checkout URL:", data);
      showMessage("Checkout URL was not returned.");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Checkout error:", error);
    showMessage(error.message || "Something went wrong starting checkout.");
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.getAttribute("data-plan");
    startCheckout(plan);
  });
});