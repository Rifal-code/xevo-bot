'use strict'

/*
  Xevo Bot - Baileys 7 adapted build
  Source basis: LevviCode Xevo.js (credit retained).
  Adapted for the current multi-session/pairing infrastructure.

  Kept: menu, games, pairing/dashboard/cloudflare infrastructure.
  All paired users can use all normal bot features; creator-only server eval/shell remain restricted.
  Removed: AI, sticker dependency, and message-flood/bug functionality.
*/

const fs = require('fs')
const path = require('path')
const os = require('os')
const util = require('util')
const { randomInt } = require('crypto')
const pluginLoader = require('./lib/plugin-loader.js')
const groupDb = require('./lib/group-db.js')
const afk = require('./lib/afk.js')
const gameSession = require('./lib/game-session.js')

const guessGames = new Map()

const QUOTES = [
  'Pelan-pelan tidak masalah, yang penting tetap maju.',
  'Konsisten kecil setiap hari bisa jadi hasil besar.',
  'Jangan takut mencoba sesuatu yang baru.',
  'Gagal sekali bukan berarti harus berhenti.',
  'Fokus pada progres, bukan kesempurnaan.'
]

const FACTS = [
  'Jantung manusia berdetak sekitar 100 ribu kali dalam sehari.',
  'Madu adalah salah satu makanan yang dapat bertahan sangat lama jika disimpan dengan baik.',
  'Cahaya Matahari membutuhkan sekitar 8 menit untuk sampai ke Bumi.',
  'Gurita memiliki tiga jantung.',
  'Pisang secara botani termasuk buah beri.'
]

const configPath = path.join(__dirname, 'config.json')
const config = (() => {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')) }
  catch { return { prefix: '.', mode: 'public' } }
})()

function getNumber(jid = '') {
  return String(jid).split('@')[0].replace(/\D/g, '')
}

function isCreator(m) {
  return getNumber(m?.sender) === String(config.ownerNumber || '').replace(/\D/g, '')
}

function unwrapMessageContent(rawMsg) {
  let msg = rawMsg || {}
  for (let i = 0; i < 5; i++) {
    if (msg.ephemeralMessage?.message) msg = msg.ephemeralMessage.message
    else if (msg.viewOnceMessage?.message) msg = msg.viewOnceMessage.message
    else if (msg.viewOnceMessageV2?.message) msg = msg.viewOnceMessageV2.message
    else if (msg.viewOnceMessageV2Extension?.message) msg = msg.viewOnceMessageV2Extension.message
    else if (msg.documentWithCaptionMessage?.message) msg = msg.documentWithCaptionMessage.message
    else if (msg.editedMessage?.message) msg = msg.editedMessage.message
    else break
  }
  return msg
}

function extractCommandFromMessage(m) {
  let body = ''
  let isButtonResponse = false
  try {
    const message = unwrapMessageContent(m?.message)
    if (message.conversation) body = message.conversation
    else if (message.extendedTextMessage?.text) body = message.extendedTextMessage.text
    else if (message.imageMessage?.caption) body = message.imageMessage.caption
    else if (message.videoMessage?.caption) body = message.videoMessage.caption
    else if (message.documentMessage?.caption) body = message.documentMessage.caption
    else if (message.interactiveResponseMessage?.nativeFlowResponseMessage) {
      const flow = message.interactiveResponseMessage.nativeFlowResponseMessage
      try {
        const params = flow.paramsJson ? JSON.parse(flow.paramsJson) : {}
        body = params.id || params.buttonId || params.rowId || params.index || flow.name || ''
      } catch { body = flow.name || '' }
      isButtonResponse = true
    } else if (message.buttonsResponseMessage) {
      body = message.buttonsResponseMessage.selectedButtonId || ''
      isButtonResponse = true
    } else if (message.templateButtonReplyMessage) {
      body = message.templateButtonReplyMessage.selectedId || ''
      isButtonResponse = true
    } else if (m?.text) {
      body = String(m.text)
    }
  } catch (e) {
    console.error('Error parsing message:', e)
  }
  return { body: String(body || ''), isButtonResponse }
}

const sendMiniApp = async (conn, m, type) => {
  const { randomUUID } = require('crypto')
  const responseId = randomUUID()
  const titleMap = { dadu:'🎲 DADU HD', koin:'🪙 KOIN HD', ball8:'🎱 8 BALL HD', suit:'✊ SUIT HD', tebak:'🎯 TEBAK ANGKA HD', quote:'💬 QUOTE HD', fakta:'🧠 FAKTA HD' }
  const title = titleMap[type] || 'XEVO MINI APP'
  const data = JSON.stringify({ quotes: QUOTES, facts: FACTS }).replace(/</g,'\\u003c')
  const html = `
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
html,body{margin:0;padding:0;width:100%;background:transparent;font-family:Arial,sans-serif}
#app{max-width:430px;margin:auto;padding:14px;border-radius:18px;background:linear-gradient(145deg,#101522,#090c13);color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.logo{width:42px;height:42px;border-radius:12px;background:#181e2c;display:grid;place-items:center;font-size:23px;border:1px solid rgba(255,255,255,.1)}.head b{font-size:16px}.head small{display:block;color:#8f9aaa;margin-top:3px}
.card{padding:15px;border-radius:14px;background:#151b28;border:1px solid rgba(255,255,255,.08);text-align:center;min-height:90px;display:flex;flex-direction:column;justify-content:center}.result{font-size:29px;font-weight:900;letter-spacing:.3px}.sub{color:#aeb7c6;font-size:12px;margin-top:6px;line-height:1.5}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.btn{flex:1;min-width:90px;padding:11px 10px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:#20283a;color:#fff;font-weight:800;font-size:12px}.btn:active{transform:scale(.97)}input{width:100%;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:#0d121c;color:#fff;outline:none;margin-top:10px} .foot{margin-top:10px;text-align:center;color:#687486;font:10px monospace}
</style>
<div id="app"><div class="head"><div class="logo">✨</div><div><b>${title}</b><small>XEVO BOT • Interactive Mini App</small></div></div><div id="card" class="card"><div class="result">Memuat...</div></div><div id="controls"></div><div class="foot">Tap tombol untuk bermain • Xevo Bot</div></div>
<script>(function(){
const type=${JSON.stringify(type)}, data=${data}; const card=document.getElementById('card'), controls=document.getElementById('controls');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(a,b=''){card.innerHTML='<div class="result">'+a+'</div><div class="sub">'+b+'</div>'}
function btn(text,fn){const b=document.createElement('button');b.className='btn';b.textContent=text;b.onclick=fn;return b}
function row(){const r=document.createElement('div');r.className='row';controls.appendChild(r);return r}
if(type==='dadu'){function roll(){const n=Math.floor(Math.random()*6)+1;show(['⚀','⚁','⚂','⚃','⚄','⚅'][n-1],'Hasil lemparan: '+n);controls.innerHTML='';const r=row();r.appendChild(btn('🎲 LEMPAR LAGI',roll))}roll()}
else if(type==='koin'){function flip(){const h=Math.random()<.5;show(h?'🪙 HEADS':'🪙 TAILS',h?'Sisi kepala':'Sisi ekor');controls.innerHTML='';const r=row();r.appendChild(btn('🪙 LEMPAR LAGI',flip))}flip()}
else if(type==='ball8'){show('🎱 8 BALL','Tulis pertanyaanmu lalu tekan TANYA');const inp=document.createElement('input');inp.placeholder='Contoh: Apakah saya beruntung hari ini?';controls.appendChild(inp);const r=row();r.appendChild(btn('🎱 TANYA',()=>{if(!inp.value.trim()){show('⚠️ TULIS PERTANYAAN','Isi pertanyaan terlebih dahulu.');return}const a=['Kemungkinan besar iya.','Sepertinya iya.','Coba lagi nanti.','Belum tentu.','Kemungkinan kecil.','Tidak untuk saat ini.'];show('🎱 '+a[Math.floor(Math.random()*a.length)],'Pertanyaan: '+esc(inp.value));}))}
else if(type==='suit'){show('✊ SUIT','Pilih tanganmu');const r=row();[['✊','batu'],['✋','kertas'],['✌️','gunting']].forEach(([i,v])=>r.appendChild(btn(i+' '+v,()=>{const c=['batu','kertas','gunting'],bot=c[Math.floor(Math.random()*3)],win=(v==='batu'&&bot==='gunting')||(v==='gunting'&&bot==='kertas')||(v==='kertas'&&bot==='batu');show(win?'🏆 KAMU MENANG':v===bot?'🤝 SERI':'🤖 BOT MENANG','Kamu: '+v+' • Bot: '+bot);const rr=row();rr.appendChild(btn('🔄 MAIN LAGI',()=>location.reload()))})))}
else if(type==='tebak'){let secret=Math.floor(Math.random()*100)+1,tries=0;show('🎯 1–100','Saya sudah memilih angka. Tebak!');const inp=document.createElement('input');inp.type='number';inp.min=1;inp.max=100;inp.placeholder='Masukkan angka 1–100';controls.appendChild(inp);const r=row();r.appendChild(btn('🎯 TEBAK',()=>{const g=Number(inp.value);if(!Number.isInteger(g)||g<1||g>100){show('⚠️ ANGKA TIDAK VALID','Gunakan angka 1–100.');return}tries++;if(g===secret){show('🎉 BENAR!', 'Angka '+g+' • '+tries+' percobaan');r.innerHTML='';const rr=row();rr.appendChild(btn('🔄 MAIN LAGI',()=>location.reload()))}else show(g<secret?'⬆️ TERLALU KECIL':'⬇️ TERLALU BESAR',tries+' percobaan • Coba lagi');inp.value=''}))}
else if(type==='quote'){function q(){const v=data.quotes[Math.floor(Math.random()*data.quotes.length)];show('“'+esc(v)+'”','Quote random Xevo');controls.innerHTML='';const r=row();r.appendChild(btn('💬 QUOTE LAIN',q))}q()}
else if(type==='fakta'){function f(){const v=data.facts[Math.floor(Math.random()*data.facts.length)];show('🧠',esc(v));controls.innerHTML='';const r=row();r.appendChild(btn('🧠 FAKTA LAIN',f))}f()}
})();</script>`
  await conn.relayMessage(m.chat,{messageContextInfo:{deviceListMetadata:{},deviceListMetadataVersion:2,botMetadata:{botResponseId:responseId}},botForwardedMessage:{message:{richResponseMessage:{messageType:1,submessages:[{messageType:2,messageText:title}],unifiedResponse:{data:Buffer.from(JSON.stringify({response_id:responseId,sections:[{view_model:{primitive:{__typename:'GenAIaeacdsnwHtmlPrimitive',payload:html,trusted_sources:[]},__typename:'GenAISingleLayoutViewModel'}}]})).toString('base64')},contextInfo:{forwardingScore:1,isForwarded:true,forwardedAiBotMessageInfo:{botJid:'867051314767696@bot'},forwardOrigin:4}}}}},{messageId:responseId})
}

const sendFlappyBird = async (conn, m) => {
    const { randomUUID } = require('crypto');
    const responseId = randomUUID();
    const html = `
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
html,body{margin:0;padding:0;width:100%;overflow:hidden;background:transparent;font-family:Arial,sans-serif;touch-action:none}
#fw{overflow:hidden;border-radius:14px;background:#8fd8ff;border:1px solid rgba(255,255,255,.3)}
#fg{position:relative;width:100%;height:210px;overflow:hidden}
#fc{display:block;width:100%;height:100%}
#score,#best{position:absolute;left:0;right:0;text-align:center;color:#fff;pointer-events:none;text-shadow:0 2px 3px rgba(0,0,0,.35)}
#score{top:8px;font:bold 26px Arial}#best{top:40px;font:10px monospace}
#start,#over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,.4)}
#start{background:rgba(72,177,224,.18)}#over{display:none;background:rgba(24,74,100,.45)}
#start b{font-size:25px}#start span{font:bold 11px monospace;margin-top:7px}#over b{font-size:22px}#over span{font:bold 12px monospace;margin-top:5px}
#again{margin-top:10px;padding:7px 17px;border:0;border-radius:7px;background:#fff;color:#4b9ac4;font:bold 11px Arial}
#hint{position:absolute;bottom:6px;left:0;right:0;text-align:center;color:rgba(255,255,255,.8);font:9px monospace;pointer-events:none}
</style>
<div id="fw"><div id="fg"><canvas id="fc"></canvas><div id="score">0</div><div id="best">BEST <span id="bv">0</span></div><div id="hint">TAP / SPACE TO FLY</div><div id="start"><b>FLAPPY BIRD</b><span>TAP TO START</span></div><div id="over"><b>GAME OVER</b><span>SCORE <i id="final">0</i></span><button id="again">PLAY AGAIN</button></div></div></div>
<script>(function(){
const c=document.getElementById('fc'),x=c.getContext('2d'),g=document.getElementById('fg'),sc=document.getElementById('score'),bv=document.getElementById('bv'),st=document.getElementById('start'),ov=document.getElementById('over'),fi=document.getElementById('final'),ag=document.getElementById('again');let W=0,H=0,run=false,dead=false,last=0,score=0,best=0,pipes=[],spawn=0,frame=0;const bird={x:0,y:0,w:30,h:24,vy:0,rot:0};
try{best=parseInt(localStorage.getItem('flappy_bird_best')||'0')||0}catch(e){}bv.textContent=best;
function resize(){const r=g.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;c.style.width=W+'px';c.style.height=H+'px';x.setTransform(d,0,0,d,0,0);bird.x=W*.22;if(!run)bird.y=H*.45;draw()}
function reset(){score=0;pipes=[];spawn=65;frame=0;bird.y=H*.45;bird.vy=0;bird.rot=0;dead=false;run=true;st.style.display='none';ov.style.display='none';last=performance.now();requestAnimationFrame(loop)}
function flap(){if(!run||dead){reset();return}bird.vy=-7.4}
function pipe(){const ground=22,gap=Math.max(72,88-score*.12),top=53+Math.random()*Math.max(10,H-ground-gap-90);pipes.push({x:W+18,w:34,top,gap,passed:false})}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function finish(){if(dead)return;dead=true;run=false;if(score>best){best=score;try{localStorage.setItem('flappy_bird_best',best)}catch(e){}}bv.textContent=best;fi.textContent=score;ov.style.display='flex'}
function update(dt){const ground=22;frame++;bird.vy+=.42*dt;bird.y+=bird.vy*dt;bird.rot=Math.max(-.45,Math.min(1.15,bird.vy*.055));if(bird.y<0){bird.y=0;bird.vy=0}if(bird.y+bird.h>=H-ground){bird.y=H-ground-bird.h;finish();return}spawn-=dt;if(spawn<=0){pipe();spawn=72+Math.random()*22}for(const p of pipes){p.x-=2.7*dt;if(!p.passed&&p.x+p.w<bird.x){p.passed=true;score++;sc.textContent=score}const bb={x:bird.x+5,y:bird.y+4,w:bird.w-9,h:bird.h-7};if(hit(bb,{x:p.x,y:0,w:p.w,h:p.top})||hit(bb,{x:p.x,y:p.top+p.gap,w:p.w,h:H-ground-(p.top+p.gap)})){finish();return}}pipes=pipes.filter(p=>p.x>-55)}
function draw(){if(!W||!H)return;const gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#79cdf4');gr.addColorStop(1,'#c9f0ff');x.fillStyle=gr;x.fillRect(0,0,W,H);x.fillStyle='rgba(255,255,255,.75)';for(let i=0;i<3;i++){const cx=((frame*.25+i*W/3)%(W+100))-50,cy=35+(i%2)*30;x.beginPath();x.arc(cx,cy,16,0,7);x.arc(cx+20,cy-8,20,0,7);x.arc(cx+42,cy,15,0,7);x.fill()}for(const p of pipes){const by=p.top+p.gap,pg=x.createLinearGradient(p.x,0,p.x+p.w,0);pg.addColorStop(0,'#2f9e55');pg.addColorStop(.5,'#64c96d');pg.addColorStop(1,'#247b46');x.fillStyle=pg;x.fillRect(p.x,0,p.w,p.top);x.fillRect(p.x,by,p.w,H-22-by);x.fillStyle='#3da95a';x.fillRect(p.x-4,p.top-10,p.w+8,10);x.fillRect(p.x-4,by,p.w+8,10)}const gy=H-22;x.fillStyle='#7fcf57';x.fillRect(0,gy,W,5);x.fillStyle='#d6b45c';x.fillRect(0,gy+5,W,17);x.save();x.translate(bird.x+bird.w/2,bird.y+bird.h/2);x.rotate(bird.rot);x.fillStyle='#e7a72f';x.fillRect(-23,-5,9,10);x.fillStyle='#ffd447';x.beginPath();x.ellipse(0,1,15,11,0,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(12,-7,4,0,7);x.fill();x.fillStyle='#252525';x.beginPath();x.arc(13,-7,2,0,7);x.fill();x.fillStyle='#f08a24';x.beginPath();x.moveTo(16,-3);x.lineTo(28,1);x.lineTo(16,5);x.fill();x.restore()}
function loop(t){if(!run)return;const dt=Math.min((t-last)/16.67,2);last=t;update(dt);draw();if(run)requestAnimationFrame(loop)}
c.addEventListener('pointerdown',e=>{e.preventDefault();flap()});st.addEventListener('pointerdown',e=>{e.preventDefault();reset()});ag.addEventListener('pointerdown',e=>{e.preventDefault();reset()});document.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();flap()}});addEventListener('resize',resize);resize();
})()</script>`;

    await conn.relayMessage(m.chat, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: { messageDisclaimerText: '', botResponseId: responseId }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: 'Flappy Bird' }],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [{
                                view_model: {
                                    primitive: {
                                        __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                        payload: html,
                                        trusted_sources: []
                                    },
                                    __typename: 'GenAISingleLayoutViewModel'
                                }
                            }]
                        })).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, { messageId: responseId });
};

const sendChess = async (conn, m) => {
    const { randomUUID } = require('crypto');
    const responseId = randomUUID();
    const html = `
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}
html,body{margin:0;padding:0;width:100%;font-family:Arial,sans-serif;background:transparent}
#app{max-width:430px;margin:auto;padding:10px;border-radius:14px;background:#141821;color:#fff}
#top{display:flex;justify-content:space-between;align-items:center;margin:0 0 9px;font-size:13px}
#status{font-weight:bold;color:#f5d78e}#reset{border:0;border-radius:7px;padding:6px 10px;font-weight:bold}
#board{width:100%;aspect-ratio:1;display:grid;grid-template-columns:repeat(8,1fr);border-radius:10px;overflow:hidden;border:3px solid #4b3525}
.sq{position:relative;display:flex;align-items:center;justify-content:center;font-size:clamp(23px,9vw,43px);cursor:pointer;line-height:1}
.light{background:#f0d9b5}.dark{background:#b58863}.sel{box-shadow:inset 0 0 0 4px #ffde59}.move:after{content:'';position:absolute;width:24%;aspect-ratio:1;border-radius:50%;background:rgba(40,120,55,.65)}.cap:after{content:'';position:absolute;inset:5%;border:4px solid rgba(170,35,35,.75);border-radius:50%}
.white{color:#fff;text-shadow:0 1px 2px #000,0 0 2px #000}.black{color:#151515;text-shadow:0 1px 1px #fff}
#bottom{margin-top:9px;font-size:11px;color:#aeb7c5;text-align:center}
</style>
<div id="app">
 <div id="top"><span id="status">Giliran: PUTIH</span><button id="reset">Reset</button></div>
 <div id="board"></div>
 <div id="bottom">Klik bidak lalu pilih kotak tujuan • Mode 2 pemain</div>
</div>
<script>(function(){
const B=document.getElementById('board'),S=document.getElementById('status'),R=document.getElementById('reset');
const icon={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
let turn='w',sel=null,board=[];
function fresh(){board=Array.from({length:8},()=>Array(8).fill(null));const back=['r','n','b','q','k','b','n','r'];for(let c=0;c<8;c++){board[0][c]={c:'b',t:back[c]};board[1][c]={c:'b',t:'p'};board[6][c]={c:'w',t:'p'};board[7][c]={c:'w',t:back[c]}}turn='w';sel=null;render()}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function clear(r1,c1,r2,c2){let dr=Math.sign(r2-r1),dc=Math.sign(c2-c1);r1+=dr;c1+=dc;while(r1!==r2||c1!==c2){if(board[r1][c1])return false;r1+=dr;c1+=dc}return true}
function legal(r,c,tr,tc){const P=board[r][c];if(!P||!inside(tr,tc))return false;const D=board[tr][tc];if(D&&D.c===P.c)return false;const dr=tr-r,dc=tc-c,ar=Math.abs(dr),ac=Math.abs(dc);if(P.t==='p'){const dir=P.c==='w'?-1:1,start=P.c==='w'?6:1;if(dc===0&&!D&&dr===dir)return true;if(dc===0&&!D&&r===start&&dr===2*dir&&!board[r+dir][c])return true;if(ac===1&&dr===dir&&D&&D.c!==P.c)return true;return false}if(P.t==='n')return (ar===2&&ac===1)||(ar===1&&ac===2);if(P.t==='k')return ar<=1&&ac<=1;if(P.t==='b')return ar===ac&&clear(r,c,tr,tc);if(P.t==='r')return (dr===0||dc===0)&&clear(r,c,tr,tc);if(P.t==='q')return ((ar===ac)||(dr===0||dc===0))&&clear(r,c,tr,tc);return false}
function moves(r,c){let a=[];for(let tr=0;tr<8;tr++)for(let tc=0;tc<8;tc++)if(legal(r,c,tr,tc))a.push([tr,tc]);return a}
function render(){B.innerHTML='';const ms=sel?moves(sel[0],sel[1]):[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const d=document.createElement('div'),P=board[r][c],isSel=sel&&sel[0]===r&&sel[1]===c,m=ms.find(x=>x[0]===r&&x[1]===c);d.className='sq '+((r+c)%2?'dark':'light')+(isSel?' sel':'')+(m?(P?' cap':' move'):'');if(P){d.textContent=icon[P.c][P.t];d.classList.add(P.c==='w'?'white':'black')}d.onclick=()=>click(r,c);B.appendChild(d)}S.textContent='Giliran: '+(turn==='w'?'PUTIH':'HITAM')}
function click(r,c){const P=board[r][c];if(sel){if(legal(sel[0],sel[1],r,c)){let piece=board[sel[0]][sel[1]];board[r][c]=piece;board[sel[0]][sel[1]]=null;if(piece.t==='p'&&(r===0||r===7))piece.t='q';turn=turn==='w'?'b':'w';sel=null;render();return}sel=null}if(P&&P.c===turn)sel=[r,c];render()}
R.onclick=fresh;fresh();
})()</script>`;

    await conn.relayMessage(m.chat, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: { messageDisclaimerText: '', botResponseId: responseId }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: 'Game Catur' }],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify({
                            response_id: responseId,
                            sections: [{ view_model: { primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html, trusted_sources: [] }, __typename: 'GenAISingleLayoutViewModel' } }]
                        })).toString('base64')
                    },
                    contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
                }
            }
        }
    }, { messageId: responseId });
};


module.exports = async (conn, m) => {
  try {
    const { body, isButtonResponse } = extractCommandFromMessage(m)
    if (!body) return
    m.text = body

    // Cek proteksi Anti-Link di grup
    if (m.isGroup && groupDb.isAntilinkEnabled(m.chat)) {
      const isGroupLink = /(https?:\/\/)?chat\.whatsapp\.com\/[a-zA-Z0-9]{20,26}/i.test(body)
      if (isGroupLink) {
        try {
          const groupMetadata = await conn.groupMetadata(m.chat)
          const participants = groupMetadata?.participants || []
          const senderNum = (m.sender || '').split('@')[0]
          const isSenderAdmin = participants.some(p => p.id.split('@')[0] === senderNum && p.admin)

          // Admin grup bebas kirim link
          if (!isSenderAdmin) {
            const botNum = (conn.user?.id || '').replace(/:\d+@/, '@').split('@')[0]
            const isBotAdmin = participants.some(p => p.id.split('@')[0] === botNum && p.admin)

            if (isBotAdmin) {
              await conn.sendMessage(m.chat, { delete: m.key })
              await conn.sendMessage(m.chat, {
                text: `⚠️ *ANTI-LINK DETECTED*\nMaaf @${senderNum}, link grup WhatsApp dilarang di sini! Pesan Anda telah dihapus.`,
                mentions: [m.sender]
              })
            } else {
              await conn.sendMessage(m.chat, {
                text: `⚠️ *ANTI-LINK DETECTED*\n@${senderNum} mengirim link grup WhatsApp! Jadikan bot sebagai admin agar pesan dapat dihapus secara otomatis.`,
                mentions: [m.sender]
              })
            }
            return
          }
        } catch (e) {
          console.error('❌ Gagal memeriksa anti-link:', e?.message || e)
        }
      }
    }

    const prefix = String(config.prefix || '.')
    const trimmedBody = body.trim()

    // 1. Cek status AFK (auto-clear saat user AFK kirim pesan, auto-reply saat user AFK di-tag/reply)
    if (!m.isBaileys && afk.hasAnyAfk()) {
      const isAfkCmd = trimmedBody.toLowerCase().startsWith(`${prefix}afk`)
      const targets = new Set()
      const mentioned = m.mentionedJid || m.msg?.contextInfo?.mentionedJid || []
      for (const jid of mentioned) targets.add(jid)
      if (m.quoted?.sender) targets.add(m.quoted.sender)

      // Helper untuk resolve @lid -> nomor telepon asli agar mention di grup tetap terdeteksi
      let groupParticipants = null
      const resolveJidCandidates = async (jid) => {
        const candidates = [jid]
        if (!jid) return candidates
        const cleanId = String(jid).replace(/:\d+@/, '@').split('@')[0]
        const botLid = conn.user?.lid ? String(conn.user.lid).replace(/:\d+@/, '@').split('@')[0] : ''
        const botId = conn.user?.id ? String(conn.user.id).replace(/:\d+@/, '@').split('@')[0] : ''
        if (botLid && cleanId === botLid && botId) {
          candidates.push(`${botId}@s.whatsapp.net`)
        }
        if (String(jid).endsWith('@lid') && m.isGroup) {
          try {
            if (!groupParticipants) {
              const gm = await conn.groupMetadata(m.chat)
              groupParticipants = gm?.participants || []
            }
            const p = groupParticipants.find(x => x.id === jid || x.lid === jid)
            if (p?.phoneNumber) candidates.push(p.phoneNumber)
            if (p?.jid) candidates.push(p.jid)
          } catch { }
        }
        return candidates
      }

      for (const tJid of targets) {
        if (!tJid || tJid === m.sender) continue
        const candidates = await resolveJidCandidates(tJid)
        let targetAfk = null
        for (const c of candidates) {
          targetAfk = afk.getAfk(c)
          if (targetAfk) break
        }
        if (targetAfk) {
          const dur = afk.formatAfkDuration(targetAfk.since)
          const tNum = String(targetAfk.jid || tJid).split('@')[0]
          await m.reply(`💤 *@${tNum}* sedang *AFK*\n📝 Alasan: _${targetAfk.reason}_\n⏱️ Sejak: ${dur} yang lalu`, null, {
            mentions: [tJid]
          })
          break
        }
      }

      if (!isAfkCmd) {
        const senderCandidates = await resolveJidCandidates(m.sender)
        for (const c of senderCandidates) {
          const senderAfk = afk.getAfk(c)
          if (senderAfk) {
            afk.clearAfk(c)
            const dur = afk.formatAfkDuration(senderAfk.since)
            const sNum = String(senderAfk.jid || m.sender).split('@')[0]
            await m.reply(`👋 Selamat datang kembali *@${sNum}*!\nStatus AFK dicabut setelah *${dur}*.`, null, {
              mentions: [m.sender]
            })
            break
          }
        }
      }
    }

    // 2. Cek jawaban game teks interaktif (tanpa prefix)
    if (!isButtonResponse && !trimmedBody.startsWith(prefix)) {
      const answered = await gameSession.handleGameMessage(m, m.reply.bind(m))
      if (answered) return
    }

    let command = ''
    let args = []
    if (isButtonResponse) {
      const parts = body.trim().split(/\s+/)
      command = (parts.shift() || '').toLowerCase()
      args = parts
    } else {
      const trimmed = body.trim()
      if (!trimmed.startsWith(prefix)) return
      const clean = trimmed.slice(prefix.length).trim()
      if (!clean) return
      const parts = clean.split(/\s+/)
      command = parts.shift().toLowerCase()
      args = parts
    }

    const reply = m.reply.bind(m)

    // Cek apakah perintah cocok dengan plugin modular (Downloader, Tools, dll)
    const pluginHandled = await pluginLoader.handlePluginCommand({
      conn,
      m,
      command,
      args,
      text: args.join(' '),
      reply
    })

    if (pluginHandled) return

    switch (command) {
      case 'menu': {
        const runtime = process.uptime()
        const days = Math.floor(runtime / 86400)
        const hours = Math.floor((runtime % 86400) / 3600)
        const minutes = Math.floor((runtime % 3600) / 60)
        const seconds = Math.floor(runtime % 60)
        const timestamp = Number(m.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
        const ping = Math.max(0, Date.now() - timestamp)
        const mode = config.mode === 'self' ? 'SELF' : 'PUBLIC'

        const senderNum = String(m.sender || '').replace(/@.+/g, '')
        const menuText = [
          '⚡ *PECADO BOT — MULTI-SESSION*',
          '━━━━━━━━━━━━━━━━━━━━',
          `👤 *User:* +${senderNum}`,
          `🟢 *Status:* Connected (${mode})`,
          `📶 *Speed:* ${Math.floor(ping)} ms`,
          `⏱️ *Uptime:* ${days}d ${hours}h ${minutes}m ${seconds}s`,
          '━━━━━━━━━━━━━━━━━━━━',
          '',
          '📌 Ketik *.allmenu* untuk melihat seluruh daftar perintah bot.'
        ].join('\n')

        const menuImage = path.join(__dirname, 'src', 'img', 'menu.jpeg')
        try {
          if (fs.existsSync(menuImage)) {
            await conn.sendMessage(m.chat, {
              image: fs.readFileSync(menuImage),
              caption: menuText
            }, { quoted: m })
          } else {
            await reply(menuText)
          }
        } catch (e) {
          console.error('❌ .menu gagal kirim gambar:', e?.stack || e)
          await reply(menuText)
        }
        return
      }

      case 'allmenu': {
        const senderNum = String(m.sender || '').replace(/@.+/g, '');
        const menuSections = [
          '╭───「 *PECADO BOT MENU* 」',
          '│',
          `│ 👤 *User:* +${senderNum}`,
          `│ 🟢 *Engine:* Online (${config.mode === 'self' ? 'Self' : 'Public'})`,
          '│',
          '├─「 *DOWNLOADER* 」',
          '│ ⭔ *.tiktok* <url>',
          '│    _Video tanpa WM / audio_',
          '│ ⭔ *.ig* <url>',
          '│    _Video Reels & Post IG_',
          '│ ⭔ *.ytmp3* <url>',
          '│    _Audio MP3 dari YouTube_',
          '│ ⭔ *.ytmp4* <url>',
          '│    _Video MP4 dari YouTube_',
          '│ ⭔ *.play* <judul>',
          '│    _Cari & unduh lagu otomatis_',
          '│ ⭔ *.spotify* <url>',
          '│    _Unduh lagu dari Spotify_',
          '│',
          '├─「 *MEDIA & TOOLS* 」',
          '│ ⭔ *.s* [reply/kirim foto]',
          '│    _Ubah gambar/video jadi stiker_',
          '│ ⭔ *.ssound* [kirim/reply video bersuara]',
          '│    _Stiker bersuara ≤10 dtk (atau reply VN/audio + kirim foto/video bisu)_',
          '│ ⭔ *.brat* <teks>',
          '│    _Stiker teks gaya Brat viral_',
          '│ ⭔ *.qc* <teks>',
          '│    _Stiker bubble Quote Chat WA_',
          '│ ⭔ *.toimg* [reply stiker]',
          '│    _Ubah stiker balik jadi foto_',
          '│ ⭔ *.tts* <teks>',
          '│    _Ubah teks jadi VN suara Google_',
          '│ ⭔ *.qr* <teks/link>',
          '│    _Generate gambar QR code_',
          '│ ⭔ *.ocr* [reply foto]',
          '│    _Baca teks dari gambar_',
          '│ ⭔ *.removebg* [reply foto]',
          '│    _Hapus background foto_',
          '│ ⭔ *.afk* [alasan]',
          '│    _Tandai status sedang AFK_',
          '│ ⭔ *.short* <url>',
          '│    _Perpendek link panjang_',
          '│',
          '├─「 *AI & INFO INDONESIA* 」',
          '│ ⭔ *.ai* <pertanyaan>',
          '│    _Tanya jawab dengan AI pintar_',
          '│ ⭔ *.aiimg* <prompt>',
          '│    _Buat gambar AI dari teks_',
          '│ ⭔ *.jadwalsholat* <kota>',
          '│    _Cek jadwal sholat akurat_',
          '│ ⭔ *.gempa*',
          '│    _Info gempa terkini BMKG_',
          '│',
          '├─「 *GROUP ADMIN* 」',
          '│ ⭔ *.hidetag* <pesan>',
          '│    _Tag semua member tersembunyi_',
          '│ ⭔ *.tagall* [pesan]',
          '│    _Mention seluruh anggota grup_',
          '│ ⭔ *.antilink* on/off',
          '│    _Auto hapus link grup_',
          '│ ⭔ *.kick* @tag   *.add* 628xxx',
          '│ ⭔ *.promote* @tag *.demote* @tag',
          '│ ⭔ *.open*        *.close*',
          '│ ⭔ *.del* [reply pesan]',
          '│',
          '├─「 *INTERACTIVE GAMES* 」',
          '│ ⭔ *.caklontong*  *.family100*',
          '│ ⭔ *.susunkata*   *.siapakahaku*',
          '│ ⭔ *.cekkhodam*   *.truth* / *.dare*',
          '│ ⭔ *.hint*        *.nyerah*',
          '│ ⭔ *.flappy*      *.catur*',
          '│ ⭔ *.dadu*  *.koin*  *.suit*  *.tebak*',
          '│ ⭔ *.8ball* *.quote* *.fakta*',
          '│',
          '├─「 *SYSTEM & INFO* 」',
          '│ ⭔ *.menu*    *.ping*    *.owner*',
          '│',
          '╰────────────────────',
          '',
          '💡 *Tips:*',
          '• `<...>` = wajib diisi',
          '• `[...]` = reply media / opsional',
          '',
          '_Pecado WhatsApp Engine • Multi-Session_'
        ];

        return reply(menuSections.join('\n'));
      }

      case 'dadu':
      case 'dice':
        return sendMiniApp(conn, m, 'dadu')

      case 'koin':
      case 'coin':
        return sendMiniApp(conn, m, 'koin')

      case '8ball':
      case 'bola8':
        return sendMiniApp(conn, m, 'ball8')

      case 'suit':
        return sendMiniApp(conn, m, 'suit')

      case 'quote':
      case 'quotes':
        return sendMiniApp(conn, m, 'quote')

      case 'fakta':
      case 'fact':
        return sendMiniApp(conn, m, 'fakta')

      case 'tebakangka':
      case 'tebak':
        return sendMiniApp(conn, m, 'tebak')

      case 'catur':
      case 'chess':
        return sendChess(conn, m)

      case 'flappy':
      case 'flappybird':
        return sendFlappyBird(conn, m)

      case 'owner':
      case 'cekowner':
        return reply(`👑 CREATOR BOT\n\nJID kamu: ${m.sender}\nCreator: ${config.ownerNumber}@s.whatsapp.net\n\nSemua nomor yang sudah pairing dapat menggunakan seluruh fitur user.`)

      case 'myjid':
        return reply(`JID kamu: ${m.sender}`)

      case 'ping': {
        const start = Date.now()
        const latency = Date.now() - start
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
        const uptimeHours = (os.uptime() / 3600).toFixed(2)
        const cpuModel = os.cpus()[0]?.model || 'Unknown'
        const cpuCores = os.cpus().length
        return reply(`Pong! ${latency} ms\n\nDATA VPS\n- Hostname: ${os.hostname()}\n- Platform: ${os.platform()} ${os.arch()}\n- Uptime: ${uptimeHours} jam\n- RAM: ${freeMem} GB / ${totalMem} GB (Free/Total)\n- CPU: ${cpuCores} Core, ${cpuModel.substring(0, 60)}`)
      }

      case 'info':
        return reply(`INFO PESAN\n\nJID Pengirim: ${m.sender}\nJID Chat: ${m.chat}\nGrup: ${m.isGroup ? 'Ya' : 'Tidak'}\nDari Bot: ${m.fromMe ? 'Ya' : 'Tidak'}\nID Pesan: ${m.id || '-'}\nTeks: ${m.text || '-'}`)





      case 'public':
        if (!isCreator(m)) return reply('❌ Khusus creator bot.')
        config.mode = 'public'
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        return reply('Berhasil ganti mode ke public')

      case 'self':
        if (!isCreator(m)) return reply('❌ Khusus creator bot.')
        config.mode = 'self'
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        return reply('Berhasil ganti mode ke self')

      default:
        return
    }
  } catch (err) {
    console.error('Error in command handler:', err)
    try { await m.reply('❌ Terjadi error saat menjalankan perintah.') } catch {}
  }
}
