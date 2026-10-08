// Web checkout for Armory AI Pro.
//
// Signs the buyer in to their Armory AI account (or creates one), then sends
// them to RevenueCat's hosted checkout with their user id in the URL, so the
// purchase lands on the same RevenueCat customer the app and server use.
// Promo codes: ?code=XYZ on this page pre-fills the field; it's passed on as
// RevenueCat's `discount_code`.

// RevenueCat Web Purchase Link (Funnels → Purchase Links → Production URL).
// Empty until web billing is set up; the page then says checkout opens soon.
const CHECKOUT_URL = "";
const API = "https://armory-ai-production.up.railway.app";

const $ = (id) => document.getElementById(id);
const form = $("checkout");
const params = new URLSearchParams(location.search);
let mode = "signin";

if (params.get("success") === "1") {
  $("success").hidden = false;
  form.hidden = true;
}
if (params.get("code")) $("code").value = params.get("code").trim().toUpperCase();
if (params.get("plan") === "monthly") form.plan.value = "$rc_monthly";
if (!CHECKOUT_URL) {
  $("not-ready").hidden = false;
  $("submit").disabled = true;
}

function setMode(next) {
  mode = next;
  $("tab-signin").setAttribute("aria-selected", String(next === "signin"));
  $("tab-signup").setAttribute("aria-selected", String(next === "signup"));
  $("terms-row").hidden = next !== "signup";
  $("password-hint").hidden = next !== "signup";
  $("password").autocomplete = next === "signup" ? "new-password" : "current-password";
  showError(null);
}
$("tab-signin").addEventListener("click", () => setMode("signin"));
$("tab-signup").addEventListener("click", () => setMode("signup"));

function showError(message) {
  $("error").hidden = !message;
  $("error").textContent = message || "";
}

async function authenticate(email, password) {
  const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
  const body = mode === "signup" ? { email, password, acceptTerms: true } : { email, password };
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data.user;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!CHECKOUT_URL) return;
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return showError("Enter your email and password.");
  if (mode === "signup" && !$("terms").checked) return showError("Please accept the Terms and Privacy Policy.");

  $("submit").disabled = true;
  $("submit").textContent = "Opening checkout…";
  showError(null);
  try {
    const user = await authenticate(email, password);
    const url = new URL(CHECKOUT_URL.replace(/\/$/, "") + "/" + encodeURIComponent(user.id));
    url.searchParams.set("email", user.email || email);
    url.searchParams.set("package_id", form.plan.value);
    const code = $("code").value.trim();
    if (code) url.searchParams.set("discount_code", code);
    location.href = url.toString();
  } catch (error) {
    showError(error.message);
    $("submit").disabled = false;
    $("submit").textContent = "Continue to secure checkout";
  }
});
