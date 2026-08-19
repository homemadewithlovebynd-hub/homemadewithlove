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

async function loadProducts(){
  statusEl.textContent="Loading products…";
  const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){statusEl.textContent="Unable to load products. Check your Supabase setup.";console.error(error);return;}
  products=data||[];
  Object.keys(cart).forEach(id=>{if(!products.some(p=>p.id===id && p.available)) delete cart[id];});
  saveCart(); render(); renderArrivals();
}
function render(){
  const visible=products.filter(p=>category==="All"||(category==="New Arrivals" ? p.new_arrival : p.category===category));
  statusEl.textContent=visible.length?"":"No products available in this category.";
  grid.innerHTML=visible.map(p=>{
    const img=p.image_url||"placeholder.svg", item=cart[p.id], qty=item?item.qty:0;
    const stock=p.available;
    return `<article class="product-card ${stock?"":"sold-out"}">
      <div class="image-wrap"><img class="product-image" src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
      ${p.new_arrival?'<span class="product-badge new">New Arrival</span>':''}
      ${!stock?'<span class="product-badge stock">Out of Stock</span>':''}</div>
      <div class="product-body"><div class="product-meta"><h3 class="product-name">${esc(p.name)}</h3><div class="price">₹${Number(p.price).toLocaleString("en-IN")}</div></div>
      <p class="description">${esc(p.description||"")}</p>
      ${stock ? `<div class="add-row">${qty?`<div class="qty-control"><button class="qty-btn" data-action="minus" data-id="${esc(p.id)}">−</button><strong>${qty}</strong><button class="qty-btn" data-action="plus" data-id="${esc(p.id)}">+</button></div><button class="add-btn added" data-action="add" data-id="${esc(p.id)}">${qty} added</button>`:`<button class="add-btn" data-action="add" data-id="${esc(p.id)}">Add to cart</button>`}</div>`
      : `<button class="out-stock-btn" disabled>Out of Stock</button>`}</div></article>`;
  }).join("");
  updateCartBadge();
}
function addToCart(id){const p=products.find(x=>x.id===id&&x.available);if(!p)return;if(!cart[id])cart[id]={id:p.id,name:p.name,price:Number(p.price),qty:0};cart[id].qty++;saveCart();render();}
function changeQty(id,delta){if(!cart[id])return;cart[id].qty+=delta;if(cart[id].qty<=0)delete cart[id];saveCart();render();}
grid.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;if(b.dataset.action==="add"||b.dataset.action==="plus")addToCart(b.dataset.id);if(b.dataset.action==="minus")changeQty(b.dataset.id,-1);});

function updateCartBadge(){document.getElementById("cart-count").textContent=cartCount();}
function renderCart(){
  const items=document.getElementById("cart-items"),empty=document.getElementById("cart-empty"),checkout=document.getElementById("checkout-whatsapp"),clear=document.getElementById("clear-cart"),entries=Object.values(cart);
  updateCartBadge();document.getElementById("cart-total").textContent=`₹${cartTotal().toLocaleString("en-IN")}`;
  if(!entries.length){items.innerHTML="";empty.classList.remove("hidden");checkout.disabled=true;clear.disabled=true;return;}
  empty.classList.add("hidden");checkout.disabled=false;clear.disabled=false;
  items.innerHTML=entries.map(i=>`<div class="cart-item"><div class="cart-item-info"><strong>${esc(i.name)}</strong><small>₹${i.price.toLocaleString("en-IN")} each</small></div><div class="cart-item-right"><div class="qty-control"><button class="qty-btn" data-cart-action="minus" data-id="${esc(i.id)}">−</button><strong>${i.qty}</strong><button class="qty-btn" data-cart-action="plus" data-id="${esc(i.id)}">+</button></div><strong>₹${(i.price*i.qty).toLocaleString("en-IN")}</strong></div></div>`).join("");
}
document.getElementById("cart-items").addEventListener("click",e=>{const b=e.target.closest("[data-cart-action]");if(b)changeQty(b.dataset.id,b.dataset.cartAction==="plus"?1:-1);});
document.getElementById("cart-button").onclick=()=>{document.getElementById("cart-overlay").classList.remove("hidden");renderCart();};
function closeCart(){document.getElementById("cart-overlay").classList.add("hidden");}
document.getElementById("cart-close").onclick=closeCart;
document.getElementById("cart-overlay").onclick=e=>{if(e.target.id==="cart-overlay")closeCart();};
document.getElementById("clear-cart").onclick=()=>{cart={};saveCart();render();};
document.getElementById("checkout-whatsapp").onclick=()=>{
  const entries=Object.values(cart);if(!entries.length)return;
  const lines=entries.map((i,n)=>`${n+1}. ${i.name} × ${i.qty} — ₹${(i.price*i.qty).toLocaleString("en-IN")}`);
  const msg=`Hi Neha! I'd like to place an order:\n\n${lines.join("\n")}\n\nTotal: ₹${cartTotal().toLocaleString("en-IN")}\n\nPlease confirm availability and delivery details.`;
  window.open(`https://wa.me/${cfg.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,"_blank","noopener");
};

document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");category=b.dataset.category;render();});

function renderArrivals(){
  const arrivals=products.filter(p=>p.new_arrival&&p.available);
  const runner=document.getElementById("arrival-runner"),track=document.getElementById("arrival-track");
  if(!arrivals.length){runner.classList.add("hidden");return;}
  const text=arrivals.map(p=>`♡ NEW ARRIVAL: ${esc(p.name)}`).join("   •   ");
  track.innerHTML=`<span>${text}</span><span>${text}</span>`;
  runner.classList.remove("hidden");
}

/* Customer authentication */
const authOverlay=document.getElementById("auth-overlay");
const loginPanel=document.getElementById("auth-login"),signupPanel=document.getElementById("auth-signup"),accountPanel=document.getElementById("auth-account");
function openAuth(){authOverlay.classList.remove("hidden");}
function closeAuth(){authOverlay.classList.add("hidden");}
function setAuthPanel(p){loginPanel.classList.toggle("hidden",p!=="login");signupPanel.classList.toggle("hidden",p!=="signup");accountPanel.classList.toggle("hidden",p!=="account");}
document.getElementById("auth-button").onclick=async()=>{const {data:{session}}=await db.auth.getSession();if(session){document.getElementById("account-name").textContent=`Hello, ${session.user.user_metadata?.full_name||"there"}!`;document.getElementById("account-email").textContent=session.user.email||"";setAuthPanel("account");}else setAuthPanel("login");openAuth();};
document.getElementById("auth-close").onclick=closeAuth;
authOverlay.onclick=e=>{if(e.target===authOverlay)closeAuth();};
document.getElementById("show-signup").onclick=()=>{document.getElementById("customer-login-message").textContent="";setAuthPanel("signup");};
document.getElementById("show-login").onclick=()=>{document.getElementById("customer-signup-message").textContent="";setAuthPanel("login");};
document.getElementById("login-form").onsubmit=async e=>{
  e.preventDefault();const m=document.getElementById("customer-login-message");m.textContent="Signing in…";
  const {error}=await db.auth.signInWithPassword({email:document.getElementById("customer-email").value.trim(),password:document.getElementById("customer-password").value});
  if(error)m.textContent=error.message;else{m.textContent="";closeAuth();updateAuthButton();}
};
document.getElementById("signup-form").onsubmit=async e=>{
  e.preventDefault();const m=document.getElementById("customer-signup-message");m.textContent="Creating account…";
  const {data,error}=await db.auth.signUp({email:document.getElementById("signup-email").value.trim(),password:document.getElementById("signup-password").value,data:{full_name:document.getElementById("signup-name").value.trim()},options:{emailRedirectTo:window.location.origin+"/"}});
  if(error){m.textContent=error.message;return;}
  if(data.session){m.textContent="Account created!";setTimeout(()=>{closeAuth();updateAuthButton();},500);}
  else m.textContent="Account created. Please check your email to confirm your account.";
};
document.getElementById("logout-customer").onclick=async()=>{await db.auth.signOut();closeAuth();updateAuthButton();};
async function updateAuthButton(){const {data:{session}}=await db.auth.getSession();document.getElementById("auth-button").textContent=session?"♙ My Account":"♙ Login / Sign up";}
db.auth.onAuthStateChange(()=>updateAuthButton());

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
loadProducts();renderCart();updateAuthButton();
