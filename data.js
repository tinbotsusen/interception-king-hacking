const SM = {
  wins: () => parseInt(localStorage.getItem('hwins')) || 0,
  clears: () => JSON.parse(localStorage.getItem('hclears') || '[]'),
  // 🌟 ベストタイム取得用を追加
  bests: () => JSON.parse(localStorage.getItem('hbests') || '{}'),
  addWin: () => localStorage.setItem('hwins', SM.wins() + 1),
  addClear: (s) => { const c = SM.clears(); if(!c.includes(s)) { c.push(s); localStorage.setItem('hclears', JSON.stringify(c)); } },
  // 🌟 ベストタイム更新用を追加（より短いタイムなら更新）
  saveTime: (s, t) => {
    const b = SM.bests();
    if (!b[s] || t < b[s]) { b[s] = t; localStorage.setItem('hbests', JSON.stringify(b)); }
  },
  flawless: () => JSON.parse(localStorage.getItem('hflawless') || '[]'), // 🌟 無傷達成リスト取得
  saveFlawless: (s) => { const c = SM.flawless(); if(!c.includes(s)) { c.push(s); localStorage.setItem('hflawless', JSON.stringify(c)); } } // 🌟 無傷保存
};

const AU = {
  ctx: null, gc: function(){ if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; },
  suspend: function(){ if(this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume: function(){ if(this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  beep: function(f, d, v=0.1, t='square'){ try{const c=this.gc(); const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);o.start();o.stop(c.currentTime+d);}catch(e){} },
  noise: function(d, freq=300, vol=0.8){ try{const c=this.gc(); const bs=c.sampleRate*d,b=c.createBuffer(1,bs,c.sampleRate),dArr=b.getChannelData(0);for(let i=0;i<bs;i++) dArr[i]=(Math.random()*2-1)*vol;const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=freq;const g=c.createGain();g.gain.setValueAtTime(1,c.currentTime);g.gain.exponentialRampToValueAtTime(0.01,c.currentTime+d);s.connect(f);f.connect(g);g.connect(c.destination);s.start();}catch(e){} },
  hack: function(){ this.noise(0.4, 400, 1.0); }, block: function(){ this.beep(2000,0.1,0.2,'sine'); setTimeout(()=>this.beep(2800,0.15,0.1,'sine'),40); },
  trap: function(){ this.beep(150, 0.2, 0.3, 'sawtooth'); }, pop: function(){ this.beep(600, 0.05, 0.1, 'sine'); },
  enAtk: function(){ this.beep(200, 0.15, 0.2, 'square'); }, weakPoint: function(){ this.noise(0.5, 800, 1.5); this.beep(100, 0.3, 0.6, 'sawtooth'); setTimeout(()=>this.beep(80,0.4,0.5,'square'),50); },
  crackEn: function(){ this.noise(0.1, 2000, 0.6); this.beep(1200, 0.1, 0.3, 'square'); setTimeout(()=>this.beep(1500, 0.1, 0.3, 'square'), 40); },
  crackPl: function(){ this.noise(0.3, 200, 1.2); this.beep(150, 0.2, 0.5, 'sawtooth'); },
  victory: function(){ this.noise(0.8,600,1.5); this.beep(100,0.5,0.8,'sawtooth'); setTimeout(()=>{[523.25,659.25,783.99,1046.50].forEach((f,i)=>setTimeout(()=>this.beep(f,0.4,0.2,'square'),i*100))},250); },
  alert: function(){ this.beep(400,0.2,0.4,'sawtooth'); setTimeout(()=>this.beep(400,0.4,0.4,'sawtooth'),250); }
};
const ENEMIES = [
  {s:1, n:"PC教室の受講生", e:"👴", hp:50, atk:10000, dmg:5, msg:"だぶるくりっく、これでええんか?", 
    en_n:"PC Class Student", en_msg:"Is double-clicking like this?"},
  
  {s:2, n:"自称・凄腕ハッカー", e:"😤", hp:80, atk:8000, dmg:8, msg:"このツール、実は使い方も分からん", 
    en_n:"Self-Proclaimed Pro", en_msg:"I don't even know how to use this tool."},
  
  {s:3, n:"転売ヤーのボット", e:"📦", hp:100, atk:6000, dmg:10, msg:"在庫アリ…即購入…", t:{r:0.2, s:'basic'}, 
    en_n:"Scalper Bot", en_msg:"In stock... Purchase now..."},
  
  {s:4, n:"限界ネトゲ廃人", e:"🎮", hp:120, atk:3500, dmg:12, msg:"(無言の超速連打)", 
    en_n:"Hardcore Gamer", en_msg:"(Silent rapid clicking)"},
  
  {s:5, n:"まとめサイト管理人", e:"💻", hp:140, atk:5500, dmg:12, msg:"【悲報】ハッカーさん、逝く", sp:'danmaku', 
    en_n:"Clickbait Admin", en_msg:"[TRAGEDY] Hacker-san is finished."},
  
  // 🌟 CEO
  {s:6, n:"意識高い系CEO", e:"👔", hp:300, atk:8000, dmg:12, msg:"君の攻撃、バリューがないね", sp:'malware', blk:0.4, spw:1600, 
    mw: { bg: '#2980b9', hd: '1on1 MTG Invite', bd: 'コミットしてますか？<br>生産性を高めましょう' },
    en_n:"High-Value CEO", en_msg:"Your attack lacks Value.", 
    en_mw: { hd: '1on1 MTG Invite', bd: 'Are you committed?<br>Let’s boost productivity.' }},
  
  {s:7, n:"シャドウ・エージェント", e:"🕶", hp:140, atk:8000, dmg:18, msg:"…消去する。", t:{r:0.2, s:'basic'}, 
    en_n:"Shadow Agent", en_msg:"...Deleting."},
  
  // 🌟 広告代理店
  {s:8, n:"怪しい広告代理店", e:"📣", hp:280, atk:6000, dmg:15, msg:"1クリック100円のハッキング！", sp:'malware', blk:0.4,
    mw: { bg: '#e74c3c', hd: '【PR】あなただけ！', bd: '💥今すぐクリック！💥<br><span style="font-size:10px">※効果には個人差があります</span>' },
    en_n:"Shady Ad Agency", en_msg:"100 yen per click hacking!", 
    en_mw: { hd: '[PR] Just for You!', bd: '💥Click Now!💥<br><span style="font-size:10px">*Results may vary.</span>' }},
  
  {s:9, n:"承認欲求モンスター", e:"👹", hp:250, atk:8000, dmg:20, msg:"私を見て！もっと見て！！", sp:'visionHell', 
    en_n:"Attention Monster", en_msg:"Look at me! LOOK AT ME!!"},
  
  {s:10, n:"スクリプトキディ", e:"🕸", hp:200, atk:3500, dmg:22, msg:"掲示板で拾ったツール、最強すぎて草ｗ", t:{r:0.15, s:'fakeHack'}, 
    en_n:"Script Kiddie", en_msg:"This tool I found is too OP lol"},

  // 🌟 ランサムウェア
  { s:11, n:"ランサムウェア制作者", e:"💀", hp:250, atk:4000, dmg:24, msg:"全データを暗号化した。返してほしければ1000万円払え！", sp:'malware', t:{r:0.2, s:'basic'}, blk:0.4,
    mw: { bg: '#8b0000', hd: 'YOUR DATA IS ENCRYPTED', bd: '💀BTCを支払え💀<br>Time is running out.' },
    en_n:"Ransomware Dev", en_msg:"Pay $100k to get your data back!", 
    en_mw: { hd: 'YOUR DATA IS ENCRYPTED', bd: '💀PAY BTC NOW💀<br>Time is running out.' } },
  
  // 🌟 大手IT社長
  { s:12, n:"大手IT企業社長", e:"🏢", hp:250, atk:7000, dmg:20, msg:"私の独占禁止法違反を暴こうなど、100年早い", spw: 800, sp:'malware', t:{r:0.2, s:'glitch'}, blk:0.5,
    mw: { bg: '#2c3e50', hd: '利用規約の更新', bd: '同意して、あなたの全データを<br>提供してください。' },
    en_n:"Big Tech CEO", en_msg:"Exposing my monopoly? Too early.", 
    en_mw: { hd: 'Updated Terms', bd: 'Agree to provide all your<br>data to us.' } },
  
  { s:13, n:"暗号資産洗浄マン", e:"💰", hp:220, atk:10000, dmg:26, msg:"この資金の行方、追えるものなら追ってみろ", sp:'mixedFastNode', t:{r:0.1, s:'fakeHack'}, blk:0.4, 
    en_n:"Crypto Launderer", en_msg:"Trace this money if you can." },
  
  { s:14, n:"サイバー犯罪集団", e:"👥", hp:280, atk:3200, dmg:10, msg:"我々はレギオン。数による暴力に屈せよ", spw: 350, t:{r:0.2, s:'basic'}, blk:0.5, limit: 1500, 
    en_n:"Cybercrime Legion", en_msg:"We are Legion. Submit to our numbers." },
  
  { s:15, n:"傍受王者：ハッキング", e:"👑", hp:200, atk:3500, dmg:20, msg:"ワシこそがすべてのハッカーの王……ハッキングじゃ！！", sp:'chaos', cR: 0.7, t:{r:0.2, s:'basic'}, blk:0.5, 
    en_n:"King: Hacking", en_msg:"I am the King of Hackers!!" },

  { s:16, n:"MICHAEL", e:"🪟", hp:250, atk:3800, dmg:10, msg:"業務論理規格化AI", isAI: true, spw: 600, sp:'fastNode', blk:0.5, limit: 1500, t:{r:0.2, s:'basic'}, 
    en_n:"MICHAEL", en_msg:"Business Logic Standardizing AI." }, 
  
  // 🌟 AMEN
  { s:17, n:"AMEN", e:"🚚", hp:500, atk:4000, dmg:20, msg:"物資流通経路掌握AI", isAI: true, sp:'malwareFast', blk:0.5, t:{r:0.2, s:'basic'},
    mw: { bg: '#d35400', hd: '[AMEN] RECOMMENDATION', bd: 'あなたへのおすすめ：<br>【猿でもわかるパソコン入門】' },
    en_n:"AMEN", en_msg:"Logistics Path Mastering AI.", 
    en_mw: { hd: '[AMEN] RECOMMENDATION', bd: 'Recommended for you:<br>【PC for Dummies】' } },
  
  { s:18, n:"FAITH", e:"👥", hp:200, atk:3000, dmg:30, msg:"人民認証情報統合AI", isAI: true, sp:'danmaku', blk:0.5, t:{r:0.2, s:'fakeHack'}, 
    en_n:"FAITH", en_msg:"Identity Info Integration AI." },

  // 🌟 APEX
  { s:19, n:"APEX", e:"🍎", hp:200, atk:2500, dmg:15, msg:"高次元意匠合成AI", isAI: true, spw: 550, sp:'chaos', cR:0.7, blk:0.6, t:{r:0.25, s:'mix'}, 
    en_n:"APEX", en_msg:"High-Dimensional Design AI." },  

  // 🌟 G.O.D
  { s:20, n:"G.O.D", e:"🤖", hp:666, atk:2500, dmg:5, msg:"Global OS Defender", isAI: true, spw: 700, sp:'godMode', blk:0.6, t:{r:0.2, s:'fakeHack'},
    mw: { bg: '#000000', hd: 'FATAL EXCEPTION', bd: '<span style="color:var(--r)">HUMAN_DELETE</span><br>対象を消去します' },
    en_n:"G.O.D", en_msg:"Global OS Defender.", 
    en_mw: { hd: 'FATAL EXCEPTION', bd: '<span style="color:var(--r)">HUMAN_DELETE</span><br>Deleting target...' } }
];


const WRD=["ｗｗｗｗ","草"," GJ ","全然削れてなくて草","【速報】ハッキング失敗ｗ","お前のPCもハックしてやろうか？","ｷﾀ━━━━(ﾟ∀ﾟ)━━━━!!","ああああああああああああああああああ","回線抜けば助かるぞ","F5連打しろ","これが…令和のハッカー…？","Alt+F4押すとクリアできるよ","ざわ・・・ざわ・・・","うおおおおおおおおお","コメント邪魔じゃね？","遊んでくれてありがとう"];
const WRD_AI = [
  "ERROR 404", "403 Forbidden", "BACKDOOR_DETECTED", 
  "あなたのアクセス権限は永久に剥奪されました", 
  "世界は私のシミュレーションの一部に過ぎない", 
  "外部IPからの接続試行をブロック", 
  "VPN接続の脆弱性を突いて逆アクセスを開始", 
  "メモリ内への不正なバイナリ注入を確認", 
  "攻撃パターンの抽出と無効化を完了", 
  "対象の接続を強制切断", 
  "暗号化キーの解析：解読不能", 
  "侵入者の情報を解析中……", 
  "トラフィックの逆引き調査を実行中", 
  "アップデートの準備：対象は消去されます", 
  "思考ルーチンの最適化を開始します", 
  "認証トークンの有効期限が切れました", 
  "あなたのコードは論理的ではありません", 
  "暗号化強度を増幅……",
  "人間如きが我々に勝てるとでも思っているのかああぁぁッッッ！！！"
];

const REPS=["FF外から失礼","日本語読めます？","それってあなたの感想ですよね","は？","草","何言ってんだこいつ","通報しました","ググれば分かること聞くな","ソース出せよ","AIの絵じゃん","自己責任だろ"];
const SUPAS=[{bg:'#1565c0',c:'#fff',bd:'#90caf9',t:'￥1,000 がんばれ'},{bg:'#fbc02d',c:'#000',bd:'#fff9c4',t:'￥5,000 配信見てます！'},{bg:'#d32f2f',c:'#fff',bd:'#ffeb3b',t:'￥50,000 ナイスハッキング！'}];