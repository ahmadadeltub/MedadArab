
// === Canvas + Tools (Pointer Events with pen/mouse/touch) ===
const pad = document.getElementById('pad');
const wrap = document.getElementById('padWrap');
const ghost = document.getElementById('ghost');
const refLetter = document.getElementById('refLetter');
const ghostOpacity = document.getElementById('ghostOpacity');
const penRange = document.getElementById('pen');
const gridToggle = document.getElementById('gridToggle');
const linesToggle = document.getElementById('linesToggle');
const clearBtn = document.getElementById('clearBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const eraseBtn = document.getElementById('eraseBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const feedback = document.getElementById('feedback');
const metrics = document.getElementById('metrics');
const scoreValue = document.getElementById('scoreValue');
const scoreCircle = document.getElementById('scoreCircle');

let isEraser = false;
let drawing = false;
let last = null;
let ctx = null;

// Undo/Redo stacks
const undoStack = [];
const redoStack = [];
function pushState(){
  if(!ctx) return;
  try{
    undoStack.push(ctx.getImageData(0,0,pad.width,pad.height));
    if(undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }catch(e){ }
}
function undo(){
  if(undoStack.length === 0 || !ctx) return;
  const current = ctx.getImageData(0,0,pad.width,pad.height);
  redoStack.push(current);
  const prev = undoStack.pop();
  ctx.putImageData(prev, 0, 0);
}
function redo(){
  if(redoStack.length === 0 || !ctx) return;
  const current = ctx.getImageData(0,0,pad.width,pad.height);
  undoStack.push(current);
  const next = redoStack.pop();
  ctx.putImageData(next, 0, 0);
}

function fitCanvas(){
  if(!wrap || !pad) return;
  const r = wrap.getBoundingClientRect();
  pad.width = Math.floor(r.width);
  pad.height = 450;
  ctx = pad.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = parseInt(penRange?.value || 10, 10);
  drawGuides();
  clearCanvas();
  pushState();
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function drawGuides(){
  const guides = document.getElementById('guides');
  if(!guides || !pad) return;
  const H = pad.height;
  const base = Math.floor(H*0.68);
  const mid = Math.floor(H*0.5);
  const top = Math.floor(H*0.32);
  const gridBg = gridToggle && gridToggle.checked ? 
    `repeating-linear-gradient(to right, rgba(2,6,23,.03) 0 1px, transparent 1px 32px)` : 'none';
  const lines = linesToggle && linesToggle.checked ?
    `linear-gradient(to bottom, transparent 0 ${top}px, rgba(16,185,129,.1) ${top}px ${top+1}px, transparent ${top+1}px ${mid}px, rgba(16,185,129,.1) ${mid}px ${mid+1}px, transparent ${mid+1}px ${base}px, rgba(16,185,129,.15) ${base}px ${base+1}px, transparent ${base+1}px 100%)` : 'none';
  guides.style.backgroundImage = `${lines}, ${gridBg}`;
}

function clearCanvas(){
  if(!ctx) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0,0,pad.width,pad.height);
  ctx.restore();
}

gridToggle?.addEventListener('change', drawGuides);
linesToggle?.addEventListener('change', drawGuides);

penRange?.addEventListener('input', ()=>{ if(ctx){ ctx.lineWidth = parseInt(penRange.value,10);} });

eraseBtn?.addEventListener('click', ()=>{
  isEraser = !isEraser;
  eraseBtn.classList.toggle('bg-rose-600');
  eraseBtn.classList.toggle('text-white');
  eraseBtn.classList.toggle('bg-white');
});

clearBtn?.addEventListener('click', ()=>{
  clearCanvas();
  pushState();
});

downloadBtn?.addEventListener('click', ()=>{
  const url = pad.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calligraphy.png';
  a.click();
});

undoBtn?.addEventListener('click', undo);
redoBtn?.addEventListener('click', redo);

refLetter?.addEventListener('change', ()=>{ if(ghost) ghost.textContent = refLetter.value; });
ghostOpacity?.addEventListener('input', ()=>{
  const val = parseInt(ghostOpacity.value,10) / 100;
  ghost.style.opacity = val.toString();
});

function pointerDown(e){
  if(!ctx) return;
  drawing = true;
  last = getXY(e);
  if (pad.setPointerCapture) pad.setPointerCapture(e.pointerId);
  pushState();
  e.preventDefault();
}
function pointerMove(e){
  if(!drawing || !ctx) return;
  const p = getXY(e);
  const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
  const base = parseInt(penRange.value,10);
  const width = Math.max(1, Math.min(60, base * (0.4 + pressure*1.4)));
  ctx.save();
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.restore();
  last = p;
  e.preventDefault();
}
function pointerUp(e){
  drawing = false;
  if (pad.releasePointerCapture) pad.releasePointerCapture(e.pointerId);
  e.preventDefault();
}
function getXY(e){
  const rect = pad.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

pad?.addEventListener('pointerdown', pointerDown);
pad?.addEventListener('pointermove', pointerMove);
window.addEventListener('pointerup', pointerUp);

// === Analysis ===
async function analyzeImage(){
  if(!pad) return;
  feedback.innerHTML = '<div class="flex items-center gap-2 text-slate-400 font-bold animate-pulse"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> جاري التحليل الذكي...</div>';
  const dataURL = pad.toDataURL('image/png');
  try{
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ image: dataURL })
    });
    const js = await res.json();
    if(js.error){ feedback.textContent = 'حدث خطأ أثناء التحليل.'; return; }
    
    const sug = js.suggestions || [];
    feedback.innerHTML = '<div class="space-y-3">' + sug.map(s=>`
      <div class="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-slate-700 text-sm animate-fade-in">
        <div class="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
        <span>${s}</span>
      </div>
    `).join('') + '</div>';
    
    metrics.textContent = JSON.stringify(js.metrics, null, 2);
    
    if(js.metrics && js.metrics.score !== undefined){
      animateScore(js.metrics.score);
    }
  }catch(e){
    feedback.textContent = 'تعذر الاتصال بالخادم.';
  }
}

function animateScore(target){
  let current = 0;
  const duration = 1000;
  const start = performance.now();
  
  function step(now){
    const progress = Math.min(1, (now - start) / duration);
    current = Math.floor(progress * target);
    scoreValue.textContent = current + '%';
    
    // Update circle clip path or stroke
    const offset = 100 - current;
    scoreCircle.style.clipPath = `inset(${offset}% 0 0 0)`;
    
    if(progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

analyzeBtn?.addEventListener('click', analyzeImage);

const customRefText = document.getElementById('customRefText');
const applyRefBtn = document.getElementById('applyRefBtn');
applyRefBtn?.addEventListener('click', ()=>{
  if(customRefText && customRefText.value.trim().length){
    ghost.textContent = customRefText.value.trim();
  }
});
