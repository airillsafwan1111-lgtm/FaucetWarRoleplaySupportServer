// cloud.js — shared cloud + util
const FB_URL = 'https://syspanel-8a5fa-default-rtdb.asia-southeast1.firebasedatabase.app';
const USE_CLOUD = true;
const DB = 'SYS_PANEL_DATABASE_V6';
const OWNER = { username:'mialyshyi', password:'airilsafwansamp1', role:'owner', active:true };
let CACHE=null, syncTimer=null, ROLE='';
function setRole(r){ ROLE=r; }
function fresh(){ return { users:[{...OWNER}], bugReports:[], playerReports:[], bans:[], history:[], notifications:[], leaveRequests:[] }; }
function get(){ if(!CACHE){ try{ CACHE=JSON.parse(localStorage.getItem(DB))||fresh(); }catch(e){ CACHE=fresh(); } } return CACHE; }
async function cloudPull(){
  if(!USE_CLOUD) return get();
  try{
    const r = await fetch(FB_URL+'/syspanel.json?t='+Date.now());
    let d = await r.json();
    if(!d||typeof d!=='object'){ d=fresh(); await cloudPush(d); return d; }
    for(const k of ['users','bugReports','playerReports','bans','history','notifications','leaveRequests']) d[k]??=[];
    if(!d.users.some(x=>x.username===OWNER.username&&x.role==='owner')) d.users.unshift({...OWNER});
    CACHE=d; try{ localStorage.setItem(DB,JSON.stringify(d)); }catch(e){}
    return d;
  }catch(e){ console.warn('cloud pull failed',e); return get(); }
}
async function cloudPush(d){
  CACHE=d; try{ localStorage.setItem(DB,JSON.stringify(d)); }catch(e){}
  if(!USE_CLOUD) return;
  try{ await fetch(FB_URL+'/syspanel.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); }
  catch(e){ console.warn('cloud push failed',e); }
}
function startSync(cb){ if(!USE_CLOUD||syncTimer) return; syncTimer=setInterval(async()=>{ const b=JSON.stringify(CACHE); await cloudPull(); if(JSON.stringify(CACHE)!==b&&cb) cb(); },5000); }
function esc(x){ return String(x??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function time(){ return new Date().toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'medium'}); }
function toast(m){ const t=document.getElementById('toast'); if(!t) return; t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }
function me(){ const u=sessionStorage.getItem('SYS_'+ROLE); if(!u) return null; return get().users.find(x=>x.username===u&&x.role===ROLE&&x.active); }
async function doLogin(){
  await cloudPull();
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  const x=get().users.find(a=>a.username===u&&a.password===p&&a.role===ROLE);
  if(!x){ document.getElementById('err').textContent='Invalid username, password, or role.'; return; }
  if(!x.active){ document.getElementById('err').textContent='This account has been fired.'; return; }
  sessionStorage.setItem('SYS_'+ROLE,u); openApp();
}
async function openApp(){
  await cloudPull();
  const x=me(); if(!x) return;
  document.getElementById('loginbox').style.display='none';
  document.getElementById('app').style.display='block';
  document.getElementById('who').innerHTML=esc(x.username)+' <span class="pill">'+esc(x.role)+'</span>';
  if(typeof rerender==='function') rerender();
  startSync(typeof rerender==='function'?rerender:null);
}
function logout(){ sessionStorage.removeItem('SYS_'+ROLE); location.reload(); }
function nav(id,b){ document.querySelectorAll('.page').forEach(x=>x.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active')); if(b) b.classList.add('active'); }
async function checkFired(){ const x=me(); if(!x){ sessionStorage.removeItem('SYS_'+ROLE); return; } if(!x.active){ sessionStorage.removeItem('SYS_'+ROLE); toast('Your account has been fired.'); setTimeout(()=>location.reload(),1400); } }
setInterval(checkFired,3000);
window.addEventListener('load', async ()=>{ await cloudPull(); if(me()) openApp(); });
function fileToBase64(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); }); }
function canAcceptLeave(lv){
  const x=me(); if(!x) return false;
  if(x.role==='owner') return true;
  if(x.role==='developer') return lv.author!==x.username;
  return false;
                          }
