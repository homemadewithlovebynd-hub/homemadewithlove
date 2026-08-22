const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const ADMIN_USER_ID = "a7ebcd42-0d22-43cd-b8b3-06e131d7cbed";

function isAdminSession(session) {
  return !!session?.user?.id && session.user.id === ADMIN_USER_ID;
}

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
  // Never render the product-management dashboard for non-admin accounts.
  dashboard.classList.remove("hidden");
  loginCard.classList.add("hidden");
  resetCard.classList.add("hidden");
  loadAdminProducts();
  loadAdminOrders();
  loadSiteContentAdmin();
  return;
}
function showDashboardLegacy() {
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
db.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    if (!isAdminSession(session)) {
      await db.auth.signOut();
      showLogin();
      loginError.textContent = "This account does not have administrator access.";
      return;
    }
    clearMessages();
    showReset();
  }
});

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  if (isAdminSession(session)) {
    showDashboard();
  } else {
    if (session) await db.auth.signOut();
    showLogin();
  }
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

  if (error) {
    loginError.textContent = error.message;
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!isAdminSession(session)) {
    await db.auth.signOut();
    loginError.textContent = "This account does not have administrator access.";
    return;
  }
  showDashboard();
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
    available: document.getElementById("available").checked,
    stock_quantity: Math.max(0, Number(document.getElementById("stock-quantity").value || 0)),
    new_arrival: document.getElementById("new-arrival").checked
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
  loadAdminOrders();
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
        <small>₹${Number(p.price).toLocaleString("en-IN")} • ${esc(p.category)} • ${p.available && Number(p.stock_quantity || 0) > 0 ? `Stock: ${Number(p.stock_quantity || 0)}` : "Out of Stock"}${p.new_arrival ? " • New Arrival" : ""}</small>
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
  document.getElementById("stock-quantity").value = Number(data.stock_quantity || 0);
  document.getElementById("new-arrival").checked = !!data.new_arrival;
  document.getElementById("cancel-edit").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteProduct = async id => {
  if (!confirm("Delete this product?")) return;
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) alert(error.message);
  else loadAdminProducts();
};


async function loadAdminOrders() {
  const el = document.getElementById("admin-orders");
  if (!el) return;
  const { data, error } = await db.from("orders").select("id,customer_name,customer_email,status,total,created_at,order_items(product_name,quantity,unit_price,line_total)").order("created_at", { ascending: false });
  if (error) { el.innerHTML = `<p class="error">${esc(error.message)}</p>`; return; }
  if (!data?.length) { el.innerHTML = "<p class='muted'>No orders yet.</p>"; return; }
  el.innerHTML = data.map(o => {
    const items = (o.order_items || []).map(i => `${esc(i.product_name)} × ${i.quantity}`).join(", ");
    const date = new Date(o.created_at).toLocaleString("en-IN");
    const action = o.status === "pending"
      ? `<button class="small-btn" onclick="confirmOrder('${o.id}')">Confirm</button><button class="small-btn danger" onclick="cancelOrder('${o.id}')">Cancel</button>`
      : `<span class="order-status ${esc(o.status)}">${esc(o.status)}</span>`;
    return `<div class="admin-order"><div><strong>Order ${esc(o.id.slice(0,8))}</strong><small>${esc(date)} • ${esc(o.customer_name || "Guest")}${o.customer_email ? ` • ${esc(o.customer_email)}` : ""}</small><p>${items || "No items"}</p><strong>₹${Number(o.total).toLocaleString("en-IN")}</strong></div><div class="admin-actions">${action}</div></div>`;
  }).join("");
}
window.confirmOrder = async id => {
  if (!confirm("Confirm this order? Stock is already reserved.")) return;
  const { error } = await db.rpc("confirm_order", { p_order_id: id });
  if (error) alert(error.message); else loadAdminOrders();
};
window.cancelOrder = async id => {
  if (!confirm("Cancel this order and return its reserved stock to inventory?")) return;
  const { error } = await db.rpc("cancel_order", { p_order_id: id });
  if (error) alert(error.message); else { loadAdminProducts(); loadAdminOrders(); }
};
const refreshOrders = document.getElementById("refresh-orders");
if (refreshOrders) refreshOrders.onclick = loadAdminOrders;

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById("available").checked = true;
  document.getElementById("stock-quantity").value = 0;
  document.getElementById("new-arrival").checked = false;
  document.getElementById("form-title").textContent = "Add product";
  document.getElementById("cancel-edit").classList.add("hidden");
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

boot();


/* Editable storefront sections */
async function loadSiteContentAdmin(){
  const contentList=document.getElementById("site-content-list");
  if(!contentList)return;
  const {data,error}=await db.from("site_content").select("slug,title,body").order("slug");
  if(error){contentList.innerHTML=`<p class="error">${esc(error.message)}<br><small>Run the new site-content.sql migration once in Supabase.</small></p>`;return;}
  contentList.innerHTML=(data||[]).map(row=>`<div class="site-content-row" data-slug="${esc(row.slug)}"><div class="site-content-title"><strong>${esc(row.title)}</strong><small>${esc(row.slug)}</small></div><label>Section title<input class="site-content-input" value="${esc(row.title)}" maxlength="160"></label><label>Section content<textarea class="site-content-body" rows="6" maxlength="5000">${esc(row.body)}</textarea></label><div class="form-actions"><button class="small-btn save-site-content" type="button">Save section</button><span class="content-save-message"></span></div></div>`).join("")||"<p class='muted'>No editable sections found.</p>";
  contentList.querySelectorAll(".save-site-content").forEach(btn=>btn.addEventListener("click",async()=>{
    const row=btn.closest(".site-content-row"),slug=row.dataset.slug,title=row.querySelector(".site-content-input").value.trim(),body=row.querySelector(".site-content-body").value.trim(),msg=row.querySelector(".content-save-message");
    if(!title||!body){msg.textContent="Title and content are required.";return;}
    btn.disabled=true;msg.textContent="Saving…";
    const {error}=await db.from("site_content").update({title,body,updated_at:new Date().toISOString()}).eq("slug",slug);
    btn.disabled=false;msg.textContent=error?error.message:"Saved ✓";setTimeout(()=>msg.textContent="",1800);
  }));
}


