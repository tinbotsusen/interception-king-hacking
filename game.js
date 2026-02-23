const $ = id => document.getElementById(id);
const G = { idx:0, en:null, pHp:100, eHp:0, run:false, paused:false, tmrs:[], spwInt:null, atkInt:null, eCr:0, pCr:0, mwCnt:0, mwTimer:null, mwAlertTimer:null, mwTriggered:false, bw:false, st: 0, dmgTaken: false, activeSubSp: null, subIdx: 0 };
// G.O.Dが巡回するモードの順番
// 🌟 'visionHell' を削除し、'danmaku' のみにします
const GOD_ROUTINE = ['danmaku', 'malwareFast', 'chaos',];
// 🌟 カオスギミック用のランダム要素リスト
const CHAOS_EMOJI = ['❓','🌀','💀','💾','🔐','🎲','🎭','🃏','🛸','🧠','💣','💎','💿','🌋','🕸','🧿','🕯','🧪','🧬','🕳'];
const CHAOS_COLOR = ['#ff3c3c','#00ff41','#00ccff','#ffe600','#ff8800','#ff00ff','#ffffff','#00ffff'];

function showScreen(id){ document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id)); }
function updateTitleUI(){
  const cl = SM.clears();
  $('tw').textContent = SM.wins(); 
  $('tsc').textContent = cl.filter(s => s <= 15).length; 
  
  const sl = $('sl'), ebsl = $('eb-sl'), ebFrame = $('eb-frame');
  sl.innerHTML = ''; ebsl.innerHTML = '';
  
ENEMIES.forEach((e, i) => {
    const isCleared = cl.includes(e.s);
    const isLocked = i > 0 && !cl.includes(ENEMIES[i-1].s);
    
    // 🌟 共通：無傷記録があればトロフィーを取得
    const trophy = SM.flawless().includes(e.s) ? '<span style="color:var(--y);margin-left:4px">🏆</span>' : '';
    
    if (e.s <= 15) {
      // 🌟 表面：名前（e.n）の横にトロフィー（trophy）を表示
      const itemHtml = `<span class="si-em">${!isLocked?e.e:'❓'}</span><div class="si-txt">ST ${e.s}: ${!isLocked?e.n:'???'}${trophy}</div><div class="si-icon">${isCleared?'✅':(isLocked?'🔒':'⚔️')}</div>`;
      const div = document.createElement('div');
      div.className = `si ${isCleared?'clr':''} ${isLocked?'lck':''}`;
      if (!isLocked) div.onclick = () => beginCutin(i);
      div.innerHTML = itemHtml;
      sl.appendChild(div);
    } else {
      // 🌟 裏面：名前の横にトロフィーとタイムを表示
      const bt = SM.bests()[e.s];
      const timeDisp = bt ? `<span class="eb-time">${bt.toFixed(2)}s</span>` : '';
      const div = document.createElement('div');
      div.className = `eb-si ${isCleared?'clr':''} ${isLocked?'lck':''}`;
      if (!isLocked) div.onclick = () => beginCutin(i);
      div.innerHTML = `<span class="si-em">${!isLocked?e.e:'❓'}</span><div class="si-txt">ST ${e.s}: ${!isLocked?e.n:''}${trophy} ${timeDisp}</div><div class="si-icon">${isCleared?'✅':(isLocked?'🔒':'⚔️')}</div>`;
      ebsl.appendChild(div);
    }
  });

  ebFrame.classList.toggle('hidden', !cl.includes(15));
}

function startFromTitle(){ let i = ENEMIES.findIndex(e => !SM.clears().includes(e.s)); beginCutin(i === -1 ? 0 : i); }
function beginCutin(i){ 
  G.idx = i; G.en = ENEMIES[i]; 
  $('ci-sg').textContent=`STAGE ${G.en.s}`; 
  $('ci-em').textContent=G.en.e; 
  $('ci-nm').textContent=G.en.n; 
  $('ci-ms').textContent=`"${G.en.msg}"`; 
  showScreen('cs'); 
  
  // 🌟 [クリックで開始] の作成
  let tapHint = $('ci-tap-hint');
  if (!tapHint) {
    tapHint = document.createElement('div');
    tapHint.id = 'ci-tap-hint'; // IDを固定
    $('cs').appendChild(tapHint);
  }
  tapHint.textContent = ">> クリックで開始 <<";

  // 🌟 クリックイベント（ここが止まるとゲームが始まりません）
  const cs = $('cs');
  const startFunc = () => {
    cs.removeEventListener('mousedown', startFunc);
    cs.removeEventListener('touchstart', startFunc);
    startBattle();
  };
  cs.addEventListener('mousedown', startFunc);
  cs.addEventListener('touchstart', startFunc);
}

// 🌟 消えていた重要な関数：これを追加します
function startBattle(){
  G.run = true; 
  G.st = Date.now(); 
  G.pHp = 100; 
  G.eHp = G.en.hp; 
  G.dmgTaken = false;
  G.eCr = 0; 
  G.pCr = 0;
  
  // 画面のひび割れなどをリセット
  $('ef-wall').classList.remove('damaged');
  $('pf-wall').classList.remove('damaged');
  $('ef-cracks').style.opacity = 0;
  $('pf-cracks').style.opacity = 0;

  showScreen('gs'); 
  updateHpBars(); 
  startGameLoops(); 
}

// game.js の 62行目付近
function startGameLoops(){
  clearInterval(G.spwInt); clearInterval(G.atkInt);
  
  // 🌟 モードローテーションの状態をリセット
  G.activeSubSp = null; 
  G.subIdx = 0;

  const spwRate = G.en.spw || 800;
  G.spwInt = setInterval(() => { 
    if(!G.run || G.paused) return; 
    const tr = G.en.t ? G.en.t.r : 0, br = G.en.blk || 0.4, r = Math.random(); 
    spawnNode(r<tr ? 'trap' : (r<tr+br ? 'block' : 'hack')); 
  }, spwRate);
  
  G.atkInt = setInterval(() => { if(G.run && !G.paused) spawnNode('block'); }, G.en.atk);
  
  // 🌟 特殊攻撃があるならループ開始
  if(G.en.sp) startSpecialLoop();
}

function togglePause(){
  if (!G.run) return;
  G.paused = !G.paused;
  if (G.paused) { clearInterval(G.spwInt); clearInterval(G.atkInt); AU.suspend(); showScreen('ps'); } 
  else { AU.resume(); showScreen('gs'); startGameLoops(); }
}
function quitGame(){ G.paused = false; AU.resume(); showTitle(); }

function updateHpBars(){
  const eR = Math.max(0, G.eHp/G.en.hp), pR = Math.max(0, G.pHp/100);
  $('ef').style.width = `${eR*100}%`; $('pf').style.width = `${pR*100}%`;
  $('fw-eh-txt').textContent = `${Math.ceil(Math.max(0, G.eHp))}/${G.en.hp} HP`; 
  $('fw-ph-txt').textContent = `${Math.ceil(Math.max(0, G.pHp))}/100 HP`;
  
  // 敵の壁演出
  $('ef-cracks').style.opacity = (1 - eR) * 1.2; // ダメージに合わせてひび割れを濃く
  if(eR < 0.5) $('ef-wall').classList.add('damaged');
  if(G.eCr < Math.floor((1-eR)*3)) { AU.crackEn(); G.eCr = Math.floor((1-eR)*3); }

  // プレイヤーの壁演出
  $('pf-cracks').style.opacity = (1 - pR) * 1.2;
  if(pR < 0.5) $('pf-wall').classList.add('damaged');
  if(G.pCr < Math.floor((1-pR)*3)) { AU.crackPl(); G.pCr = Math.floor((1-pR)*3); }
}

function getSafePos(){
  const bz = $('bz'), r = bz.getBoundingClientRect();
  const ns = Array.from(bz.querySelectorAll('.node-btn')).map(n=>({x:parseFloat(n.style.left||0),y:parseFloat(n.style.top||0)}));
  let x=0, y=0, v=false, a=0;
  while(!v && a<50){ x=Math.random()*(r.width-100); y=Math.random()*(r.height-100); v=true; for(let p of ns){ if(Math.hypot(x-p.x,y-p.y)<100){v=false;break;} } a++; }
  return {x,y};
}
function spawnNode(realType){
  if(!G.run || G.paused) return;
  const bz = $('bz'), node = document.createElement('div'), pos = getSafePos();
  node.style.left=`${pos.x}px`; node.style.top=`${pos.y}px`;
  let styleType = realType;
  if(G.bw && (realType==='hack'||realType==='block')) styleType = (realType==='hack'?'block':'hack');
  
  if(styleType==='trap'){
    let s = G.en.t ? G.en.t.s : 'basic';
    
    // 🌟 G.O.D（godMode）の特権：すべてのトラップをランダムで使い分ける！
    if (G.en.sp === 'godMode') {
      // ついでにG.O.Dのトラップにも 'dummy' を混ぜてさらに極悪にしておきました
      const trapTypes = ['basic', 'fakeHack', 'glitch', 'dummy'];
      s = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    }

    // 🌟 APEX専用：'mix' の場合は 'glitch' か 'dummy' に 50% で分岐
    if (s === 'mix') {
      s = Math.random() < 0.5 ? 'glitch' : 'dummy';
    }

    if (s === 'glitch') {
      // パターンA: 見た目がチカチカする（文字は本物と同じ）
      const isFakeHack = Math.random() < 0.5;
      node.className = `node-btn node-${isFakeHack ? 'hack' : 'block'} glitch-anim`;
      node.innerHTML = isFakeHack ? '<span style="font-size:26px">🔥</span>HACK' : '<span style="font-size:26px">🛡️</span>BLOCK';
    }
    else if (s === 'fakeHack') {
      if(Math.random() < 0.5) { node.className='node-btn node-hack'; node.innerHTML='<span style="font-size:26px">🔥</span>HACK?'; } 
      else { node.className='node-btn node-block'; node.innerHTML='<span style="font-size:26px">🛡️</span>BLOCK?'; }
    }
    // 🌟 新規追加：見た目は普通だが文字が「Dummy」
    else if (s === 'dummy') {
      const isFakeHack = Math.random() < 0.5;
      // glitch-anim クラスを付けないのでチカチカしない。色は本物と同じになる
      node.className = `node-btn node-${isFakeHack ? 'hack' : 'block'}`;
      node.innerHTML = isFakeHack ? '<span style="font-size:26px">🔥</span>Dummy' : '<span style="font-size:26px">🛡️</span>Dummy';
    } 
    else { 
      // 序盤の露骨なトラップ
      node.className='node-btn node-trap-basic'; node.innerHTML='<span style="font-size:26px">⚠️</span>DUMMY'; 
    }

  } else if(styleType==='block'){ node.className='node-btn node-block'; node.innerHTML='<span style="font-size:26px">🛡️</span>BLOCK'; } 
  else { node.className='node-btn node-hack'; node.innerHTML='<span style="font-size:26px">🔥</span>HACK'; }

  // 🌟 ワープ混在対応
  const isMoving = G.en.sp === 'fastNode' || (G.en.sp === 'mixedFastNode' && Math.random() < 0.5) || G.en.sp === 'godMode' || G.en.sp === 'malwareFast';  
  if(isMoving){ node.style.transition='left 0.4s ease-out, top 0.4s ease-out'; setTimeout(()=>{ if(node.parentNode){ let np=getSafePos(); node.style.left=`${np.x}px`; node.style.top=`${np.y}px`; }}, 400); }
  
  let tmr = setTimeout(()=>{ if(node.parentNode){ node.remove(); if(realType==='block' && G.run && !G.paused) enemyHit(); } }, (G.en.limit || 3000) + Math.random()*2000);
  G.tmrs.push(tmr);
  
  node.ontouchstart=node.onmousedown=(e)=>{
    e.preventDefault(); e.stopPropagation(); if(!node.parentNode || G.paused) return;
    clearTimeout(tmr); const cx=parseFloat(node.style.left), cy=parseFloat(node.style.top); node.remove();
    const bzRect = bz.getBoundingClientRect(), appRect = $('app').getBoundingClientRect();
    handleTap(realType, bzRect.left-appRect.left+cx+48, bzRect.top-appRect.top+cy+48);
  };
  
  // 🌟 ステージ15：カオスギミック
  if ((G.en.sp === 'chaos' || G.activeSubSp === 'chaos') && Math.random() < (G.en.cR || 1.0)) {
    const rE = CHAOS_EMOJI[Math.floor(Math.random() * CHAOS_EMOJI.length)];
    const rC = CHAOS_COLOR[Math.floor(Math.random() * CHAOS_COLOR.length)];
    const txt = node.innerText.replace(/[^\x00-\x7F]/g, "").trim(); 
    node.innerHTML = `<span style="font-size:26px">${rE}</span>${txt}`;
    node.style.borderColor = rC;
    node.style.boxShadow = `0 0 25px ${rC}`;
    node.style.color = rC;
  }
  bz.appendChild(node);
}

function handleTap(t, x, y){
  if(!G.run || G.paused) return;
  if(t==='hack'){ 
    AU.hack(); fireFlame(x,y); 
    G.eHp -= (G.en.sp && G.en.sp.startsWith('malware') ? 5 : 10); 
    updateHpBars(); if(G.eHp<=0) handleWin(); 
  }
  else if(t==='block'){ 
    AU.block(); 
    const r=document.createElement('div'); 
    r.className='ripple-effect'; r.style.left=`${x-48}px`; r.style.top=`${y-48}px`; 
    $('app').appendChild(r); setTimeout(()=>r.remove(), 400); 
  }
  else if(t==='trap'){ 
    AU.trap(); 
    G.dmgTaken = true; // 🌟 トラップを踏んだ際も被弾判定
    G.pHp-=15; 
    $('gl-wrap').classList.add('shake'); 
    setTimeout(()=> $('gl-wrap').classList.remove('shake'), 250); 
    updateHpBars(); if(G.pHp<=0) handleLose(); 
  }
}
function enemyHit(){ 
  if(!G.run || G.paused) return; 
  G.dmgTaken = true; // 🌟 ダメージを受けたフラグを立てる
  AU.enAtk(); G.pHp-=G.en.dmg; 
  $('gl-wrap').classList.add('shake'); 
  setTimeout(()=> $('gl-wrap').classList.remove('shake'), 250); 
  updateHpBars(); if(G.pHp<=0) handleLose(); 
}

function fireFlame(sx, sy){
  const ty = $('efz').getBoundingClientRect().bottom - $('app').getBoundingClientRect().top;
  for(let i=0; i<12; i++){ setTimeout(() => { if(!G.run || G.paused) return; const f = document.createElement('div'); f.className = 'flame-particle'; f.style.left = `${sx+(Math.random()-0.5)*30-14}px`; f.style.top = `${sy-14}px`; f.style.setProperty('--dx', `${(Math.random()-0.5)*120}px`); f.style.setProperty('--dy', `${ty-sy}px`); f.style.setProperty('--dur', `${0.25+Math.random()*0.15}s`); $('app').appendChild(f); setTimeout(()=> f.remove(), 500); }, i*20); }
}

function startSpecialLoop(){
  if(!G.run || !G.en.sp || G.paused) return;

  // 🌟 G.O.D専用：モードローテーション
  if (G.en.sp === 'godMode') {
    const nextMode = () => {
      if (!G.run || G.paused) return;
      
      clearTimeout(G.spLoopTmr);
      
      // 前の技の後始末
      document.querySelectorAll('.mw-box').forEach(e => e.remove());
      G.mwCnt = 0; 
      clearTimeout(G.mwTimer);
      clearTimeout(G.mwAlertTimer);
      
      // 次のモードへ
      G.activeSubSp = GOD_ROUTINE[G.subIdx];
      G.subIdx = (G.subIdx + 1) % GOD_ROUTINE.length;
      
      $('bz').style.boxShadow = 'inset 0 0 50px rgba(255,255,255,0.2)';
      setTimeout(() => $('bz').style.boxShadow = 'none', 500);

      // 13秒後に次の技へ
      G.tmrs.push(setTimeout(nextMode, 13000));
      
      startSpecialLoop(); 
    };
    
    if (!G.activeSubSp) nextMode();
  }

  // 🌟 各ギミックの実行判定
  let delay = 2500 + Math.random()*2000;
  const currentSp = G.activeSubSp || G.en.sp; 

  clearTimeout(G.spLoopTmr);
  G.spLoopTmr = setTimeout(() => {
    if(!G.run || G.paused) return;
    const bz = $('bz');

    if(currentSp.startsWith('malware')){
      if(G.mwCnt<=0){
        G.mwTriggered = true; AU.alert();
        
        const mwData = G.en.mw || { bg: '#000080', hd: 'System Alert', bd: 'VIRUS DETECTED' };

        for(let i=0;i<5;i++){ 
          G.mwCnt++; 
          const p = document.createElement('div'); 
          p.className = 'mw-box'; 
          p.style.left = `${Math.random()*(bz.clientWidth-220)}px`; 
          p.style.top = `${Math.random()*(bz.clientHeight-100)}px`; 
          
          p.innerHTML = `<div style="background:${mwData.bg};color:#fff;padding:4px 8px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:bold;"><span>${mwData.hd}</span><button class="mw-x" onclick="killMw(this)">×</button></div><div style="padding:20px;font-size:14px;color:#000;font-weight:bold;text-align:center;line-height:1.4;">${mwData.bd}</div>`; 
          
          bz.appendChild(p); 
        }
        
        clearTimeout(G.mwTimer); 
        clearTimeout(G.mwAlertTimer); 
        const mwDuration = currentSp === 'malwareFast' ? 7900 : 10000;
        
        G.mwAlertTimer = setTimeout(() => {
          if (G.mwCnt > 0 && G.run && !G.paused) {
            document.querySelectorAll('.mw-box').forEach(e => e.classList.add('alerting'));
            AU.alert(); 
          }
        }, mwDuration - 2000);

        G.mwTimer = setTimeout(()=>{ 
          if(G.mwCnt>0 && G.run && !G.paused){ 
            G.dmgTaken = true; 
            AU.enAtk(); AU.noise(0.4, 600, 1.0); 
            G.pHp-=30; $('gl-wrap').classList.add('shake'); setTimeout(()=> $('gl-wrap').classList.remove('shake'), 250);
            updateHpBars(); if(G.pHp<=0) handleLose(); 
            document.querySelectorAll('.mw-box').forEach(e=>e.remove()); 
            G.mwCnt=0; 
            
            // 🌟 修正：G.O.D戦では、爆発しても「おかわり」を呼ばず、13秒のモード移行を待つ！
            if (G.en.sp !== 'godMode') startSpecialLoop(); 
          } 
        }, mwDuration);
      }
    } 
    else if(currentSp==='visionHell' || currentSp==='danmaku'){
      const list = G.en.isAI ? WRD_AI : WRD;
      for(let i=0;i<20;i++){ 
        setTimeout(()=>{ 
          if(!G.run || G.paused) return; 
          const w = document.createElement('div'); 
          w.className = 'danmaku-comment'; 
          w.textContent = list[Math.floor(Math.random()*list.length)]; 
          
          if(G.en.isAI) {
            w.style.color = 'var(--g)'; 
            w.style.textShadow = '0 0 8px var(--g)'; 
            w.style.fontFamily = "'Orbitron', monospace";
            w.style.fontWeight = '700';
            w.style.fontSize = w.textContent.length > 20 ? '14px' : '20px';
          }

          w.style.top = `${Math.random()*85}%`; 
          w.style.setProperty('--spd',`${3.0+Math.random()*3.0}s`); 
          bz.appendChild(w); 
          setTimeout(()=>w.remove(), 4000); 
        }, Math.random()*3000); 
      }

      if(currentSp==='visionHell') {
        for(let i=0;i<2;i++){
          setTimeout(()=>{
            if(!G.run || G.paused) return; 
            const s = SUPAS[Math.floor(Math.random()*SUPAS.length)];
            const d = document.createElement('div');
            d.className = 'supa-banner';
            d.style.background = s.bg; d.style.color = s.c; 
            d.style.borderTop = `5px solid ${s.bd}`; d.style.borderBottom = `5px solid ${s.bd}`;
            d.style.top = `${20 + Math.random()*50}%`;
            d.textContent = s.t;
            bz.appendChild(d);
            setTimeout(()=>d.remove(), 3500);
          }, Math.random()*2000);
        }
        for(let i=0;i<4;i++){
          setTimeout(()=>{
            if(!G.run || G.paused) return; 
            const d = document.createElement('div');
            d.className = 'kuso-rep';
            d.textContent = REPS[Math.floor(Math.random()*REPS.length)];
            d.style.left = `${5 + Math.random()*40}%`;
            d.style.top = `${10 + Math.random()*70}%`;
            bz.appendChild(d);
            setTimeout(()=>d.remove(), 3000);
          }, Math.random()*2500);
        }
      }
    }
    else if(currentSp==='brainwash'){ G.bw = !G.bw; AU.noise(0.1, 800, 1.0); }

    if (G.mwCnt <= 0) startSpecialLoop();
  }, delay);
  
  G.tmrs.push(G.spLoopTmr);
}

// 🌟 ウィンドウを消す処理にも同じく「おかわり禁止」を追加
window.killMw = (btn) => {
  if(!G.run || G.paused) return; btn.parentElement.parentElement.remove(); AU.pop(); G.mwCnt--;
  if(G.mwCnt<=0){ 
    clearTimeout(G.mwTimer); 
    clearTimeout(G.mwAlertTimer); 
    AU.weakPoint(); G.eHp-=80; updateHpBars(); 
    if(G.eHp<=0) handleWin(); 
    else if (G.run && !G.paused) {
      // 🌟 修正：G.O.D戦では全消し後、モード切り替えまで待機させる！
      if (G.en.sp !== 'godMode') startSpecialLoop(); 
    }
  }
};

function handleWin(){
  const dur = (Date.now() - G.st) / 1000; 
  G.run = false; clearAllTimers();
  SM.addWin(); SM.addClear(G.en.s);
  
  $('vs-time').textContent = `TIME: ${dur.toFixed(2)}s ${!G.dmgTaken ? '🏆' : ''}`;
  if (!G.dmgTaken) { SM.saveFlawless(G.en.s); }
  if (G.en.s >= 16) { SM.saveTime(G.en.s, dur); }

  const btn = $('vs-next-btn');
  if (G.en.s === 15) {
    btn.textContent = "新たな敵が君を待っている……";
    btn.onclick = () => showTitle();
  } else {
    btn.textContent = "次のターゲットへ"; 
    btn.onclick = () => nextStage();
  }

  if (G.idx >= ENEMIES.length - 1) { 
    showScreen('rs'); 
    AU.victory(); 
  } else {
    $('vs-em').textContent = G.en.e;
    $('vs-nm').textContent = G.en.n;
    showScreen('vs');

    // 🌟 巨大広告枠 (300x250) だけを一番下に追加
    const adSpaceId = 'vs-ad-large-bottom';
    let ad = $(adSpaceId);
    if (!ad) {
      ad = document.createElement('div');
      ad.id = adSpaceId;
      ad.className = 'ad-large'; // style.cssで定義した300x250の枠
      ad.innerHTML = "スポンサー広告 (300x250)";
      $('vs').appendChild(ad); // 末尾（一番下）に追加
    }

    setTimeout(() => { AU.victory(); $('vs-em-wrap').classList.add('destroyed'); }, 100);
  }
}

function handleLose(){ G.run = false; clearAllTimers(); showScreen('ls'); }
function clearAllTimers(){ clearInterval(G.spwInt); clearInterval(G.atkInt); clearTimeout(G.mwTimer); clearTimeout(G.mwAlertTimer); G.tmrs.forEach(t=>clearTimeout(t)); G.tmrs=[]; }
function showTitle(){ G.run=false; G.paused=false; AU.resume(); clearAllTimers(); updateTitleUI(); showScreen('ts'); }
function retryStage(){ beginCutin(G.idx); }
// 🌟 自作の共有メニューを開閉する処理
function openShareMenu() { $('share-modal').classList.remove('hidden'); }
function closeShareMenu() { $('share-modal').classList.add('hidden'); }

// 🌟 選択したSNSごとの共有処理
function shareTo(platform) {
  const gameUrl = window.location.href; 
  const shareText = "【傍受王者ハッキング】全20ステージ完全制覇！最高位防衛AI「G.O.D」を破壊し、真の傍受王者となった！";
  
  if (platform === 'x') {
    // X (Twitter) 用のシェアURLを開く
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(gameUrl)}&hashtags=傍受王者ハッキング`;
    window.open(xUrl, '_blank');
  } 
  else if (platform === 'line') {
    // LINE用のシェアURLを開く
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText + "\n" + gameUrl)}`;
    window.open(lineUrl, '_blank');
  } 
  else if (platform === 'copy') {
    // クリップボードに直接テキストとURLをコピーする
    navigator.clipboard.writeText(`${shareText}\n${gameUrl}`).then(() => {
      alert("クリップボードに記録をコピーしました！\n好きな場所に貼り付けてください。");
      closeShareMenu();
    }).catch(err => {
      alert("コピーに失敗しました...");
    });
  }
}

(function(){ 
  const cv=$('mx'), cx=cv.getContext('2d'), app=$('app'); let W,H,c,d; 
  const rz = () => { W=cv.width=app.clientWidth; H=cv.height=app.clientHeight; c=Math.floor(W/16); d=Array(c).fill(0); }; 
  rz(); window.addEventListener('resize', rz); 
  setInterval(()=>{ cx.fillStyle='rgba(0,3,0,0.05)'; cx.fillRect(0,0,W,H); cx.fillStyle='#00ff41'; cx.font='15px monospace'; for(let i=0;i<c;i++){ cx.fillText(String.fromCharCode(Math.random()*128), i*16, d[i]*16); if(d[i]*16>H && Math.random()>0.97) d[i]=0; d[i]++; } }, 50); 
})();
document.addEventListener('DOMContentLoaded', updateTitleUI);

// ==========================================
// 🌟 スマホのお節介機能（ダブルタップズーム）を強制無効化
// ==========================================
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = (new Date()).getTime();
  // 前回のタップから300ミリ秒以内（連打）なら、ブラウザの標準アクションをキャンセル
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// ==========================================
// 🛠️ デバッグ用ツール（リリース時は ENABLE_DEBUG を false にするだけ！）
// ==========================================
const ENABLE_DEBUG = false; 

if (ENABLE_DEBUG) {
  // ボタンを縦に並べるためのコンテナ
  const dbgPanel = document.createElement('div');
  dbgPanel.style.cssText = "position:fixed; top:10px; right:10px; z-index:99999; display:flex; flex-direction:column; gap:8px;";

  // ① 無敵ボタン
  const godBtn = document.createElement('button');
  godBtn.innerHTML = "無敵: OFF";
  godBtn.style.cssText = "padding:8px 16px; font-family:'Orbitron', monospace; font-weight:900; background:#ff3c3c; color:#fff; border:2px solid #fff; border-radius:8px; cursor:pointer; box-shadow:0 0 10px rgba(0,0,0,0.8); transition:0.2s;";
  
  let isGodMode = false;
  godBtn.onclick = () => {
    isGodMode = !isGodMode;
    godBtn.innerHTML = `無敵: ${isGodMode ? 'ON (不死身)' : 'OFF'}`;
    godBtn.style.background = isGodMode ? '#00ccff' : '#ff3c3c';
    godBtn.style.color = isGodMode ? '#000' : '#fff';
    if(isGodMode && G.run) { G.pHp = 100; G.dmgTaken = false; updateHpBars(); }
  };

  // ② 一撃撃破ボタン
  const killBtn = document.createElement('button');
  killBtn.innerHTML = "☠️ 敵を一撃撃破";
  killBtn.style.cssText = "padding:8px 16px; font-family:'Orbitron', monospace; font-weight:900; background:#ffe600; color:#000; border:2px solid #fff; border-radius:8px; cursor:pointer; box-shadow:0 0 10px rgba(0,0,0,0.8); transition:0.2s;";
  
  killBtn.onclick = () => {
    if (G.run && !G.paused) {
      G.eHp = 0; 
      updateHpBars(); 
      
      // 🌟 敵を倒した瞬間に、裏で動いているウィンドウや攻撃ループを強制停止！
      clearAllTimers(); 
      document.querySelectorAll('.mw-box').forEach(e => e.remove());
      
      handleWin(); // 勝利処理を強制呼び出し
    } else {
      console.log("戦闘中のみ使用可能です！");
    }
  };

  // パネルにボタンを追加して画面に表示
  dbgPanel.appendChild(godBtn);
  dbgPanel.appendChild(killBtn);
  document.body.appendChild(dbgPanel);

  // 🌟 ゲームのシステムをハッキング（HP更新処理に割り込む）
  const originalUpdateHp = updateHpBars;
  updateHpBars = function() {
    if (isGodMode && G.run) {
      G.pHp = 100;         
      G.dmgTaken = false;  
    }
    originalUpdateHp();    
  };
}
// ==========================================

// game.js の一番最後に追加
function nextStage() {
  // 現在の敵のインデックスを1つ進めて、カットインを開始する
  beginCutin(G.idx + 1);
}