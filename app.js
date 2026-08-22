const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const grid = document.getElementById("product-grid");
const statusEl = document.getElementById("status");
let products = [];
let category = "All";
let cart = JSON.parse(localStorage.getItem("homemadewithlove_cart") || "{}");

document.getElementById("year").textContent = new Date().getFullYear();
function saveCart(){localStorage.setItem("homemadewithlove_cart",JSON.stringify(cart));renderCart();}
function cartCount(){return Object.values(cart).reduce((s,i)=>s+i.qty,0);}
function cartTotal(){return Object.values(cart).reduce((s,i)=>s+i.price*i.qty,0);}
function getProduct(id){return products.find(p=>p.id===id);}

async function loadProducts(){
  statusEl.textContent="Loading products…";
  const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){statusEl.textContent="Unable to load products. Check your Supabase setup.";console.error(error);return;}
  products=data||[];
  Object.keys(cart).forEach(id=>{
    const p=getProduct(id);
    if(!p || !p.available || Number(p.stock_quantity||0) <= 0) delete cart[id];
    else cart[id].qty=Math.min(cart[id].qty,Number(p.stock_quantity));
  });
  saveCart(); render(); renderArrivals();
}
function render(){
  const visible=products.filter(p=>category==="All"||(category==="New Arrival"?Boolean(p.new_arrival):p.category===category));
  statusEl.textContent=visible.length?"":"No products available in this category.";
  grid.innerHTML=visible.map(p=>{
    const img=p.image_url||"placeholder.svg", item=cart[p.id], qty=item?item.qty:0;
    const stock=Boolean(p.available) && Number(p.stock_quantity||0)>0;
    const remaining=Math.max(0,Number(p.stock_quantity||0)-qty);
    return `<article class="product-card ${stock?"":"sold-out"}>
      <div class="image-wrap">
        <img class="product-image" src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
        <div class="badge-layer" aria-label="Product status">
          ${p.new_arrival?'<span class="product-badge new">New Arrival</span>':''}
          ${!stock?'<span class="product-badge stock">Out of Stock</span>':''}
        </div>
      </div>
      <div class="product-body"><div class="product-meta"><h3 class="product-name">${esc(p.name)}</h3><div class="price">₹${Number(p.price).toLocaleString("en-IN")}</div></div>
      <p class="description">${esc(p.description||"")}</p>
      ${stock ? `<div class="stock-note">${remaining>0 && remaining<=5 ? `Only ${remaining} left` : ""}</div><div class="add-row">${qty?`<div class="qty-control"><button class="qty-btn" data-action="minus" data-id="${esc(p.id)}">−</button><strong>${qty}</strong><button class="qty-btn" data-action="plus" data-id="${esc(p.id)}" ${qty>=Number(p.stock_quantity)?"disabled":""}>+</button></div><button class="add-btn added" data-action="add" data-id="${esc(p.id)}">${qty} added</button>`:`<button class="add-btn" data-action="add" data-id="${esc(p.id)}">Add to cart</button>`}</div>`
      : `<button class="out-stock-btn" disabled>Out of Stock</button>`}</div></article>`;
  }).join("");
  updateCartBadge();
}
function addToCart(id){
  const p=getProduct(id);
  if(!p || !p.available || Number(p.stock_quantity||0)<=0)return;
  if(!cart[id])cart[id]={id:p.id,name:p.name,price:Number(p.price),qty:0};
  if(cart[id].qty>=Number(p.stock_quantity))return;
  cart[id].qty++;saveCart();render();
}
function changeQty(id,delta){
  const p=getProduct(id); if(!cart[id]||!p)return;
  cart[id].qty+=delta;
  if(cart[id].qty<=0)delete cart[id];
  else cart[id].qty=Math.min(cart[id].qty,Number(p.stock_quantity||0));
  saveCart();render();
}
grid.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;if(b.dataset.action==="add"||b.dataset.action==="plus")addToCart(b.dataset.id);if(b.dataset.action==="minus")changeQty(b.dataset.id,-1);});
function updateCartBadge(){document.getElementById("cart-count").textContent=cartCount();}
function renderCart(){
  const items=document.getElementById("cart-items"),empty=document.getElementById("cart-empty"),checkout=document.getElementById("checkout-whatsapp"),clear=document.getElementById("clear-cart"),entries=Object.values(cart);
  updateCartBadge();document.getElementById("cart-total").textContent=`₹${cartTotal().toLocaleString("en-IN")}`;
  if(!entries.length){items.innerHTML="";empty.classList.remove("hidden");checkout.disabled=true;clear.disabled=true;return;}
  empty.classList.add("hidden");checkout.disabled=false;clear.disabled=false;
  items.innerHTML=entries.map(i=>{const p=getProduct(i.id);const max=p?Number(p.stock_quantity||0):i.qty;return `<div class="cart-item"><div class="cart-item-info"><strong>${esc(i.name)}</strong><small>₹${i.price.toLocaleString("en-IN")} each${max?` • ${max} available`:""}</small></div><div class="cart-item-right"><div class="qty-control"><button class="qty-btn" data-cart-action="minus" data-id="${esc(i.id)}">−</button><strong>${i.qty}</strong><button class="qty-btn" data-cart-action="plus" data-id="${esc(i.id)}" ${i.qty>=max?"disabled":""}>+</button></div><strong>₹${(i.price*i.qty).toLocaleString("en-IN")}</strong></div></div>`}).join("");
}
document.getElementById("cart-items").addEventListener("click",e=>{const b=e.target.closest("[data-cart-action]");if(b)changeQty(b.dataset.id,b.dataset.cartAction==="plus"?1:-1);});
document.getElementById("cart-button").onclick=()=>{document.getElementById("cart-overlay").classList.remove("hidden");renderCart();};
function closeCart(){document.getElementById("cart-overlay").classList.add("hidden");}
document.getElementById("cart-close").onclick=closeCart;
document.getElementById("cart-overlay").onclick=e=>{if(e.target.id==="cart-overlay")closeCart();};
document.getElementById("clear-cart").onclick=()=>{cart={};saveCart();render();};

document.getElementById("checkout-whatsapp").onclick=async()=>{
  const entries=Object.values(cart);if(!entries.length)return;
  const btn=document.getElementById("checkout-whatsapp");btn.disabled=true;btn.textContent="Checking stock…";
  const {data:latest,error:stockError}=await db.from("products").select("id,name,price,available,stock_quantity").in("id",entries.map(i=>i.id));
  if(stockError){alert("Could not verify stock. Please try again.");btn.disabled=false;btn.textContent="Order all on WhatsApp";return;}
  const latestMap=Object.fromEntries((latest||[]).map(p=>[p.id,p]));
  const bad=entries.find(i=>!latestMap[i.id]||!latestMap[i.id].available||Number(latestMap[i.id].stock_quantity)<i.qty);
  if(bad){await loadProducts();alert(`${bad.name} is no longer available in the requested quantity.`);btn.disabled=false;btn.textContent="Order all on WhatsApp";return;}
  const {data:{session}}=await db.auth.getSession();
  const customerName=session?.user?.user_metadata?.full_name||"Guest";
  const customerEmail=session?.user?.email||null;
  const {data:orderId,error}=await db.rpc("create_order",{p_items:entries.map(i=>({product_id:i.id,quantity:i.qty})),p_customer_name:customerName,p_customer_email:customerEmail});
  if(error){alert(error.message||"Unable to reserve stock. Please try again.");await loadProducts();btn.disabled=false;btn.textContent="Order all on WhatsApp";return;}
  const lines=entries.map((i,n)=>`${n+1}. ${i.name} × ${i.qty} — ₹${(i.price*i.qty).toLocaleString("en-IN")}`);
  const msg=`Hi Neha! I'd like to place an order.\n\nOrder ID: ${orderId}\n\n${lines.join("\n")}\n\nTotal: ₹${cartTotal().toLocaleString("en-IN")}\n\nPlease confirm my order and delivery details.`;
  cart={};saveCart();render();closeCart();await loadProducts();
  window.open(`https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank","noopener");
  alert(`Order ${orderId} created and stock reserved. Please complete the order on WhatsApp.`);
};

document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");category=b.dataset.category;render();});
function renderArrivals(){const arrivals=products.filter(p=>p.new_arrival&&p.available&&Number(p.stock_quantity||0)>0);const runner=document.getElementById("arrival-runner"),track=document.getElementById("arrival-track");if(!arrivals.length){runner.classList.add("hidden");return;}const text=arrivals.map(p=>`♡ NEW ARRIVAL: ${esc(p.name)}`).join("   •   ");track.innerHTML=`<span>${text}</span><span>${text}</span>`;runner.classList.remove("hidden");}

/* Customer authentication */
const authOverlay=document.getElementById("auth-overlay");
const loginPanel=document.getElementById("auth-login"),signupPanel=document.getElementById("auth-signup"),accountPanel=document.getElementById("auth-account");
function openAuth(){authOverlay.classList.remove("hidden");} function closeAuth(){authOverlay.classList.add("hidden");}
function setAuthPanel(p){loginPanel.classList.toggle("hidden",p!=="login");signupPanel.classList.toggle("hidden",p!=="signup");accountPanel.classList.toggle("hidden",p!=="account");}
document.getElementById("auth-button").onclick=async()=>{const {data:{session}}=await db.auth.getSession();if(session){document.getElementById("account-name").textContent=`Hello, ${session.user.user_metadata?.full_name||"there"}!`;document.getElementById("account-email").textContent=session.user.email||"";setAuthPanel("account");}else setAuthPanel("login");openAuth();};
document.getElementById("auth-close").onclick=closeAuth;authOverlay.onclick=e=>{if(e.target===authOverlay)closeAuth();};
document.getElementById("show-signup").onclick=()=>{document.getElementById("customer-login-message").textContent="";setAuthPanel("signup");};
document.getElementById("show-login").onclick=()=>{document.getElementById("customer-signup-message").textContent="";setAuthPanel("login");};
document.getElementById("login-form").onsubmit=async e=>{e.preventDefault();const m=document.getElementById("customer-login-message");m.textContent="Signing in…";const {error}=await db.auth.signInWithPassword({email:document.getElementById("customer-email").value.trim(),password:document.getElementById("customer-password").value});if(error)m.textContent=error.message;else{m.textContent="";closeAuth();updateAuthButton();}};
document.getElementById("signup-form").onsubmit=async e=>{e.preventDefault();const m=document.getElementById("customer-signup-message");m.textContent="Creating account…";const {data,error}=await db.auth.signUp({email:document.getElementById("signup-email").value.trim(),password:document.getElementById("signup-password").value,data:{full_name:document.getElementById("signup-name").value.trim()},options:{emailRedirectTo:window.location.origin+"/"}});if(error){m.textContent=error.message;return;}if(data.session){m.textContent="Account created!";setTimeout(()=>{closeAuth();updateAuthButton();},500);}else m.textContent="Account created. Please check your email to confirm your account.";};
document.getElementById("logout-customer").onclick=async()=>{await db.auth.signOut();closeAuth();updateAuthButton();};
async function updateAuthButton(){const {data:{session}}=await db.auth.getSession();document.getElementById("auth-button").textContent=session?"♙ My Account":"♙ Login / Sign up";} db.auth.onAuthStateChange(()=>updateAuthButton());
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
loadProducts();renderCart();updateAuthButton();

/* Site navigation and editable content */
const sideMenu=document.getElementById("side-menu"),menuOverlay=document.getElementById("menu-overlay");
function setMenu(open){sideMenu.classList.toggle("open",open);menuOverlay.classList.toggle("hidden",!open);sideMenu.setAttribute("aria-hidden",String(!open));document.getElementById("menu-button").setAttribute("aria-expanded",String(open));}
document.getElementById("menu-button").onclick=()=>setMenu(true);document.getElementById("menu-close").onclick=()=>setMenu(false);menuOverlay.onclick=()=>setMenu(false);document.querySelectorAll(".side-nav a").forEach(a=>a.addEventListener("click",()=>setMenu(false)));
const searchPanel=document.getElementById("search-panel"),searchInput=document.getElementById("site-search");
document.getElementById("search-button").onclick=()=>{searchPanel.classList.remove("hidden");searchInput.focus();};document.getElementById("search-close").onclick=()=>searchPanel.classList.add("hidden");
searchInput.addEventListener("input",()=>{const q=searchInput.value.trim().toLowerCase();document.querySelectorAll("#product-grid .product-card").forEach(card=>{card.style.display=!q||card.textContent.toLowerCase().includes(q)?"":"none";});});
document.querySelectorAll("[data-jump-category]").forEach(a=>a.addEventListener("click",()=>{const c=a.dataset.jumpCategory;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.category===c));category=c;render();}));
document.getElementById("orders-account-button")?.addEventListener("click",()=>document.getElementById("auth-button").click());
function renderRichText(target,text){const el=document.getElementById(target);if(!el)return;el.innerHTML=String(text||"").split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,"<br>")}</p>`).join("");}
async function loadSiteContent(){
  const {data,error}=await db.from("site_content").select("slug,title,body");
  if(error){console.warn("Site content table not available yet:",error.message);return;}
  const map=Object.fromEntries((data||[]).map(x=>[x.slug,x]));
  ["about","return-policy","contact-us","shipping-policy","terms-of-service"].forEach(slug=>{const row=map[slug];if(!row)return;const title=document.getElementById(`${slug}-title`);if(title)title.textContent=row.title;renderRichText(`${slug}-content`,row.body);});
  const orderRow=map.orders;if(orderRow){const sec=document.querySelector('[data-content-section="orders"]');if(sec){sec.querySelector("h2").textContent=orderRow.title;const card=sec.querySelector(".content-card");card.innerHTML=`<div class="rich-content"><p>${esc(orderRow.body).replace(/\n/g,"<br>")}</p></div><button class="btn primary" id="orders-account-button" type="button">Open My Account</button>`;document.getElementById("orders-account-button").onclick=()=>document.getElementById("auth-button").click();}}
  const trackRow=map["track-order"];if(trackRow){const sec=document.querySelector('[data-content-section="track-order"]');if(sec){sec.querySelector("h2").textContent=trackRow.title;const card=sec.querySelector(".content-card");card.innerHTML=`<div class="rich-content"><p>${esc(trackRow.body).replace(/\n/g,"<br>")}</p></div><a class="btn primary" href="https://wa.me/${cfg.WHATSAPP_NUMBER}" target="_blank" rel="noopener">Contact us on WhatsApp</a>`;}}
}
loadSiteContent();
