const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const grid = document.getElementById("product-grid");
const statusEl = document.getElementById("status");
let products = [];
let category = "All";
let cart = JSON.parse(localStorage.getItem("homemadewithlove_cart") || "{}");

document.getElementById("year").textContent = new Date().getFullYear();

function saveCart() {
  localStorage.setItem("homemadewithlove_cart", JSON.stringify(cart));
  renderCart();
}

function cartCount() {
  return Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return Object.values(cart).reduce((sum, item) => sum + item.price * item.qty, 0);
}

async function loadProducts(){
  statusEl.textContent = "Loading products…";
  const { data, error } = await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){ statusEl.textContent = "Unable to load products. Check the setup in config.js."; console.error(error); return; }
  products = data || [];
  // Remove cart entries for products that no longer exist.
  Object.keys(cart).forEach(id => {
    if (!products.some(p => p.id === id && p.available)) delete cart[id];
  });
  saveCart();
  render();
}

function render(){
  const visible = products.filter(p => p.available && (category==="All" || p.category===category));
  statusEl.textContent = visible.length ? "" : "No products available in this category.";
  grid.innerHTML = visible.map(p => {
    const img = p.image_url || "placeholder.svg";
    const item = cart[p.id];
    const qty = item ? item.qty : 0;
    return `<article class="product-card">
      <img class="product-image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-meta"><h3 class="product-name">${escapeHtml(p.name)}</h3><div class="price">₹${Number(p.price).toLocaleString("en-IN")}</div></div>
        <p class="description">${escapeHtml(p.description || "")}</p>
        <div class="add-row">
          ${qty ? `<div class="qty-control">
            <button type="button" class="qty-btn" data-action="minus" data-id="${escapeHtml(p.id)}">−</button>
            <strong>${qty}</strong>
            <button type="button" class="qty-btn" data-action="plus" data-id="${escapeHtml(p.id)}">+</button>
          </div>
          <button type="button" class="add-btn added" data-action="add" data-id="${escapeHtml(p.id)}">${qty} added</button>`
          : `<button type="button" class="add-btn" data-action="add" data-id="${escapeHtml(p.id)}">Add to cart</button>`}
        </div>
      </div>
    </article>`;
  }).join("");
  updateCartBadge();
}

function addToCart(id) {
  const p = products.find(x => x.id === id && x.available);
  if (!p) return;
  if (!cart[id]) cart[id] = { id: p.id, name: p.name, price: Number(p.price), qty: 0 };
  cart[id].qty++;
  saveCart();
  render();
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  saveCart();
  render();
}

grid.addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "add" || btn.dataset.action === "plus") addToCart(id);
  if (btn.dataset.action === "minus") changeQty(id, -1);
});

function updateCartBadge() {
  document.getElementById("cart-count").textContent = cartCount();
}

function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const emptyEl = document.getElementById("cart-empty");
  const checkout = document.getElementById("checkout-whatsapp");
  const clear = document.getElementById("clear-cart");
  const entries = Object.values(cart);

  updateCartBadge();
  document.getElementById("cart-total").textContent = `₹${cartTotal().toLocaleString("en-IN")}`;

  if (!entries.length) {
    itemsEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    checkout.disabled = true;
    clear.disabled = true;
    return;
  }

  emptyEl.classList.add("hidden");
  checkout.disabled = false;
  clear.disabled = false;
  itemsEl.innerHTML = entries.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <strong>${escapeHtml(item.name)}</strong>
        <small>₹${item.price.toLocaleString("en-IN")} each</small>
      </div>
      <div class="cart-item-right">
        <div class="qty-control">
          <button type="button" class="qty-btn" data-cart-action="minus" data-id="${escapeHtml(item.id)}">−</button>
          <strong>${item.qty}</strong>
          <button type="button" class="qty-btn" data-cart-action="plus" data-id="${escapeHtml(item.id)}">+</button>
        </div>
        <strong>₹${(item.price * item.qty).toLocaleString("en-IN")}</strong>
      </div>
    </div>`).join("");
}

document.getElementById("cart-items").addEventListener("click", e => {
  const btn = e.target.closest("[data-cart-action]");
  if (!btn) return;
  changeQty(btn.dataset.id, btn.dataset.cartAction === "plus" ? 1 : -1);
});

document.getElementById("cart-button").addEventListener("click", () => {
  document.getElementById("cart-overlay").classList.remove("hidden");
  document.getElementById("cart-overlay").setAttribute("aria-hidden", "false");
  renderCart();
});

function closeCart() {
  document.getElementById("cart-overlay").classList.add("hidden");
  document.getElementById("cart-overlay").setAttribute("aria-hidden", "true");
}
document.getElementById("cart-close").addEventListener("click", closeCart);
document.getElementById("cart-overlay").addEventListener("click", e => {
  if (e.target.id === "cart-overlay") closeCart();
});

document.getElementById("clear-cart").addEventListener("click", () => {
  cart = {};
  saveCart();
  render();
});

document.getElementById("checkout-whatsapp").addEventListener("click", () => {
  const entries = Object.values(cart);
  if (!entries.length) return;

  const lines = entries.map((item, i) =>
    `${i + 1}. ${item.name} × ${item.qty} — ₹${(item.price * item.qty).toLocaleString("en-IN")}`
  );
  const message =
    `Hi Neha! I'd like to place an order:\n\n${lines.join("\n")}\n\nTotal: ₹${cartTotal().toLocaleString("en-IN")}\n\nPlease confirm availability and delivery details.`;

  const wa = `https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(wa, "_blank", "noopener");
});

document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  category=btn.dataset.category;
  render();
}));

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
loadProducts();
renderCart();
