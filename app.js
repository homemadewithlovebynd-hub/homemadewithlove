const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const grid = document.getElementById("product-grid");
const statusEl = document.getElementById("status");
let products = [];
let category = "All";

document.getElementById("year").textContent = new Date().getFullYear();

async function loadProducts(){
  statusEl.textContent = "Loading products…";
  const { data, error } = await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){ statusEl.textContent = "Unable to load products. Check the setup in config.js."; console.error(error); return; }
  products = data || [];
  render();
}
function render(){
  const visible = products.filter(p => p.available && (category==="All" || p.category===category));
  statusEl.textContent = visible.length ? "" : "No products available in this category.";
  grid.innerHTML = visible.map(p => {
    const img = p.image_url || "placeholder.svg";
    const text = encodeURIComponent(`Hi, I'd like to order ${p.name} (₹${Number(p.price).toLocaleString("en-IN")}).`);
    const wa = `https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${text}`;
    return `<article class="product-card">
      <img class="product-image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="product-body">
        <div class="product-meta"><h3 class="product-name">${escapeHtml(p.name)}</h3><div class="price">₹${Number(p.price).toLocaleString("en-IN")}</div></div>
        <p class="description">${escapeHtml(p.description || "")}</p>
        <a class="order-btn" href="${wa}" target="_blank" rel="noopener">Order on WhatsApp</a>
      </div>
    </article>`;
  }).join("");
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));btn.classList.add("active");category=btn.dataset.category;render();}));
loadProducts();
