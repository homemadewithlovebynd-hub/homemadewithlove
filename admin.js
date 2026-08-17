const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

const loginCard = document.getElementById("login-card");
const dashboard = document.getElementById("dashboard");
const resetCard = document.getElementById("reset-card");
const loginError = document.getElementById("login-error");
const resetMessage = document.getElementById("reset-message");
const resetError = document.getElementById("reset-error");
const resetSuccess = document.getElementById("reset-success");
let editingId = null;

function showLogin() {
  dashboard.classList.add("hidden");
  resetCard.classList.add("hidden");
  loginCard.classList.remove("hidden");
}
function showDashboard() {
  loginCard.classList.add("hidden");
  resetCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadAdminProducts();
}
function showReset() {
  loginCard.classList.add("hidden");
  dashboard.classList.add("hidden");
  resetCard.classList.remove("hidden");
}
function clearMessages() {
  [loginError, resetMessage, resetError, resetSuccess].forEach(e => e.textContent = "");
}

// Supabase detects the recovery session from the URL and emits PASSWORD_RECOVERY.
db.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    clearMessages();
    showReset();
  }
});

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  if (session) showDashboard();
  else showLogin();
}

document.getElementById("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  clearMessages();

  const emailValue = document.getElementById("email").value.trim();
  const passwordValue = document.getElementById("password").value;

  const { error } = await db.auth.signInWithPassword({
    email: emailValue,
    password: passwordValue
  });

  if (error) loginError.textContent = error.message;
  else showDashboard();
});

// Send the reset email. The user must first enter their admin email in the login form.
document.getElementById("forgot-password").addEventListener("click", async () => {
  clearMessages();

  const emailValue = document.getElementById("email").value.trim();
  if (!emailValue) {
    loginError.textContent = "Enter your admin email first, then click Forgot password?";
    return;
  }

  const redirectTo = `${window.location.origin}/admin`;

  const { error } = await db.auth.resetPasswordForEmail(emailValue, {
    redirectTo
  });

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  resetMessage.textContent =
    "Reset link sent. Check your email and Spam/Junk folder.";
});

document.getElementById("reset-form").addEventListener("submit", async e => {
  e.preventDefault();
  clearMessages();

  const p1 = document.getElementById("new-password").value;
  const p2 = document.getElementById("confirm-password").value;

  if (p1.length < 8) {
    resetError.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (p1 !== p2) {
    resetError.textContent = "Passwords do not match.";
    return;
  }

  const { error } = await db.auth.updateUser({ password: p1 });

  if (error) {
    resetError.textContent = error.message;
    return;
  }

  resetSuccess.textContent = "Password updated successfully. You can now sign in.";
  setTimeout(async () => {
    await db.auth.signOut();
    showLogin();
  }, 1200);
});

document.getElementById("logout").onclick = async () => {
  await db.auth.signOut();
  showLogin();
};

const form = document.getElementById("product-form");
const formMessage = document.getElementById("form-message");

form.addEventListener("submit", async e => {
  e.preventDefault();
  formMessage.textContent = "Saving…";

  let imageUrl = null;
  const file = document.getElementById("image").files[0];

  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      formMessage.textContent = "Image must be under 5 MB.";
      return;
    }
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("product-images").upload(path, file, {
      upsert: false,
      contentType: file.type
    });
    if (up.error) {
      formMessage.textContent = up.error.message;
      return;
    }
    imageUrl = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  const payload = {
    name: document.getElementById("name").value.trim(),
    category: document.getElementById("category").value,
    price: Number(document.getElementById("price").value),
    description: document.getElementById("description").value.trim(),
    available: document.getElementById("available").checked
  };
  if (imageUrl) payload.image_url = imageUrl;

  const result = editingId
    ? await db.from("products").update(payload).eq("id", editingId)
    : await db.from("products").insert(payload);

  if (result.error) {
    formMessage.textContent = result.error.message;
    return;
  }

  formMessage.textContent = "Saved.";
  resetForm();
  loadAdminProducts();
});

document.getElementById("cancel-edit").onclick = resetForm;

async function loadAdminProducts() {
  const { data, error } = await db.from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("admin-products").textContent = error.message;
    return;
  }

  document.getElementById("count").textContent = (data || []).length;
  document.getElementById("admin-products").innerHTML = (data || []).map(p => `
    <div class="admin-product">
      <img class="admin-thumb" src="${esc(p.image_url || "placeholder.svg")}" alt="">
      <div class="admin-info">
        <strong>${esc(p.name)}</strong>
        <small>₹${Number(p.price).toLocaleString("en-IN")} • ${esc(p.category)} • ${p.available ? "Available" : "Hidden"}</small>
      </div>
      <div class="admin-actions">
        <button class="small-btn" onclick="editProduct('${p.id}')">Edit</button>
        <button class="small-btn danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </div>
    </div>`).join("") || "<p class='muted'>No products yet.</p>";
}

window.editProduct = async id => {
  const { data, error } = await db.from("products").select("*").eq("id", id).single();
  if (error) return alert(error.message);

  editingId = id;
  document.getElementById("form-title").textContent = "Edit product";
  document.getElementById("name").value = data.name;
  document.getElementById("category").value = data.category;
  document.getElementById("price").value = data.price;
  document.getElementById("description").value = data.description || "";
  document.getElementById("available").checked = data.available;
  document.getElementById("cancel-edit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async id => {
  if (!confirm("Delete this product?")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) alert(error.message);
  else loadAdminProducts();
};

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("available").checked = true;
  document.getElementById("form-title").textContent = "Add product";
  document.getElementById("cancel-edit").classList.add("hidden");
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

boot();
