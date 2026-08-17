const { createClient } = supabase;
const cfg = window.SHOP_CONFIG || {};
const db = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const loginCard = document.getElementById("login-card");
const dashboard = document.getElementById("dashboard");
let editingId = null;

async function boot(){
  const { data:{session} } = await db.auth.getSession();
  if(session) showDashboard();
}
function showDashboard(){loginCard.classList.add("hidden");dashboard.classList.remove("hidden");loadAdminProducts();}
function showLogin(){dashboard.classList.add("hidden");loginCard.classList.remove("hidden");}
document.getElementById("login-form").addEventListener("submit", async e=>{
  e.preventDefault();
  const {error}=await db.auth.signInWithPassword({email:email.value,password:password.value});
  loginError.textContent=error?error.message:"";
  if(!error) showDashboard();
});
document.getElementById("logout").onclick=async()=>{await db.auth.signOut();showLogin();};
const loginError=document.getElementById("login-error");
const form=document.getElementById("product-form");
const formMessage=document.getElementById("form-message");

form.addEventListener("submit", async e=>{
  e.preventDefault(); formMessage.textContent="Saving…";
  let imageUrl=null;
  const file=document.getElementById("image").files[0];
  if(file){
    if(file.size>5*1024*1024){formMessage.textContent="Image must be under 5 MB.";return;}
    const ext=file.name.split(".").pop().toLowerCase();
    const path=`${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
    if(up.error){formMessage.textContent=up.error.message;return;}
    imageUrl=db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  const payload={name:document.getElementById("name").value.trim(),category:document.getElementById("category").value,price:Number(document.getElementById("price").value),description:document.getElementById("description").value.trim(),available:document.getElementById("available").checked};
  if(imageUrl) payload.image_url=imageUrl;
  let result;
  if(editingId) result=await db.from("products").update(payload).eq("id",editingId);
  else result=await db.from("products").insert(payload);
  if(result.error){formMessage.textContent=result.error.message;return;}
  formMessage.textContent="Saved.";
  resetForm(); loadAdminProducts();
});
document.getElementById("cancel-edit").onclick=resetForm;

async function loadAdminProducts(){
  const {data,error}=await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){document.getElementById("admin-products").textContent=error.message;return;}
  document.getElementById("count").textContent=(data||[]).length;
  document.getElementById("admin-products").innerHTML=(data||[]).map(p=>`
    <div class="admin-product">
      <img class="admin-thumb" src="${esc(p.image_url||"placeholder.svg")}" alt="">
      <div class="admin-info"><strong>${esc(p.name)}</strong><small>₹${Number(p.price).toLocaleString("en-IN")} • ${esc(p.category)} • ${p.available?"Available":"Hidden"}</small></div>
      <div class="admin-actions"><button class="small-btn" onclick="editProduct('${p.id}')">Edit</button><button class="small-btn danger" onclick="deleteProduct('${p.id}')">Delete</button></div>
    </div>`).join("") || "<p class='muted'>No products yet.</p>";
}
window.editProduct=async id=>{
  const {data,error}=await db.from("products").select("*").eq("id",id).single(); if(error)return alert(error.message);
  editingId=id; document.getElementById("form-title").textContent="Edit product";
  name.value=data.name; category.value=data.category; price.value=data.price; description.value=data.description||""; available.checked=data.available;
  document.getElementById("cancel-edit").classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"});
};
window.deleteProduct=async id=>{
  if(!confirm("Delete this product?"))return;
  const {error}=await db.from("products").delete().eq("id",id); if(error)alert(error.message); else loadAdminProducts();
};
function resetForm(){editingId=null;form.reset();available.checked=true;document.getElementById("form-title").textContent="Add product";document.getElementById("cancel-edit").classList.add("hidden");}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
boot();
