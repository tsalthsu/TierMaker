import React, { useEffect, useMemo, useRef, useState } from "react";
/* @vite-ignore */
// Arknights Tier – Clean (Save 8: i18n + Lang Switcher + Theme btn relocate)
// - Theme toggle bottom-left
// - i18n auto-detect + manual switch (en/ko/ja/zh) for UI & item names
// - Hover-animated language picker next to Name toggle
// - Keeps Save7 features (reset modal, ops6 confirm, row-based DnD, name on/off)

export default function TierListApp() {
  // ---------- Theme ----------
  const [theme, setTheme] = useState(() => localStorage.getItem('clean-tier-theme') || 'light');
  useEffect(() => { localStorage.setItem('clean-tier-theme', theme); }, [theme]);
  const isDark = theme === 'dark';

  // ---------- i18n ----------
  const LANGS = ['en','ko','ja','zh'];
  const FLAGS = { en:'🇺🇸', ko:'🇰🇷', ja:'🇯🇵', zh:'🇨🇳' };
  const NAMES = { en:'English', ko:'한국어', ja:'日本語', zh:'中文' };

  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('clean-tier-lang');
    if (saved && LANGS.includes(saved)) return saved;
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav.startsWith('ko')) return 'ko';
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('zh')) return 'zh';
    return 'en';
  });
  useEffect(()=>{ localStorage.setItem('clean-tier-lang', lang); }, [lang]);

  const MSG = {
    en: {
      title: 'Arknights Tier – Clean',
      addTier: 'Add Tier',
      reset: 'Reset',
      load6: 'Load 6★',
      loading: 'Loading…',
      inputLabel: 'Label (optional)',
      inputImg: 'Image URL (optional)',
      addSingle: 'Add One',
      dragHere: 'Drag items here to place.',
      confirmResetTitle: 'Revert to initial state',
      confirmResetDesc: 'This clears all tiers and returns items to the pool.',
      cancel: 'Cancel',
      resetGo: 'Reset',
      opsAgainTitle: 'Already added',
      opsAgainDesc: 'Add more anyway?',
      opsAdd: 'Add',
      nameShow: 'Show Names',
      nameHide: 'Hide Names',
      langTitle: 'Language',
    },
    ko: {
      title: 'Arknights Tier – Clean',
      addTier: '티어 추가',
      reset: '초기화',
      load6: '6성 불러오기',
      loading: '불러오는 중…',
      inputLabel: '라벨 (선택)',
      inputImg: '이미지 URL (선택)',
      addSingle: '단일 추가',
      dragHere: '여기로 드래그해서 배치하세요.',
      confirmResetTitle: '초기 상태로 되돌립니다',
      confirmResetDesc: '모든 티어 배치를 비우고 풀로 되돌립니다.',
      cancel: '취소',
      resetGo: '초기화',
      opsAgainTitle: '이미 추가되어 있습니다',
      opsAgainDesc: '더 추가하겠습니까?',
      opsAdd: '추가',
      nameShow: '이름 표시',
      nameHide: '이름 숨기기',
      langTitle: '언어',
    },
    ja: {
      title: 'Arknights Tier – Clean',
      addTier: 'ティア追加',
      reset: 'リセット',
      load6: '★6を読み込む',
      loading: '読み込み中…',
      inputLabel: 'ラベル（任意）',
      inputImg: '画像URL（任意）',
      addSingle: '1件追加',
      dragHere: 'ここにドラッグして配置します。',
      confirmResetTitle: '初期状態に戻します',
      confirmResetDesc: '全てのティアをクリアし、プールに戻します。',
      cancel: 'キャンセル',
      resetGo: 'リセット',
      opsAgainTitle: '既に追加されています',
      opsAgainDesc: 'さらに追加しますか？',
      opsAdd: '追加',
      nameShow: '名前表示',
      nameHide: '名前非表示',
      langTitle: '言語',
    },
    zh: {
      title: 'Arknights Tier – Clean',
      addTier: '添加层级',
      reset: '重置',
      load6: '导入6★',
      loading: '加载中…',
      inputLabel: '标签（可选）',
      inputImg: '图片URL（可选）',
      addSingle: '添加一项',
      dragHere: '拖拽到此处进行放置。',
      confirmResetTitle: '恢复到初始状态',
      confirmResetDesc: '清空所有层级并将项目放回池中。',
      cancel: '取消',
      resetGo: '重置',
      opsAgainTitle: '已添加',
      opsAgainDesc: '仍要继续添加吗？',
      opsAdd: '添加',
      nameShow: '显示名称',
      nameHide: '隐藏名称',
      langTitle: '语言',
    }
  };
  const t = (k)=> (MSG[lang] && MSG[lang][k]) || MSG.en[k] || k;

  // ---------- Name ON/OFF ----------
  const [showNames, setShowNames] = useState(true);

  // ---------- Items / Tiers ----------
  const [items, setItems] = useState(() => []);
  const [pool, setPool] = useState(() => []);
  const [tiers, setTiers] = useState(() => [
    { name: 'S', color: '#60a5fa', items: [] },
    { name: 'A', color: '#34d399', items: [] },
    { name: 'B', color: '#fbbf24', items: [] },
    { name: 'C', color: '#f97316', items: [] },
    { name: 'D', color: '#ef4444', items: [] },
  ]);

  // keep refs size in sync with tiers length
  const tierContainerRefs = useRef({});
  useEffect(() => {
    const next = {};
    tiers.forEach((_, i) => { next[i] = tierContainerRefs.current[i] || null; });
    tierContainerRefs.current = next;
  }, [tiers]);

  // DnD state
  const [dragData, setDragData] = useState(null);
  const [justPoppedId, setJustPoppedId] = useState(null);
  const [sparkles, setSparkles] = useState([]);
  useEffect(()=>{ const tmr=setInterval(()=> setSparkles(prev=> prev.filter(s=> Date.now()-s.createdAt<900)),300); return ()=> clearInterval(tmr); },[]);
  const overlayRef = useRef(null);
  const cachedRectsRef = useRef({});
  const rafRef = useRef(null);
  const pendingPosRef = useRef(null);
  const lastPosRef = useRef(null);

  // tier menu/hover
  const [openTierMenu, setOpenTierMenu] = useState(null);
  const [hoverTierIndex, setHoverTierIndex] = useState(null);
  const [hoverInsertIndex, setHoverInsertIndex] = useState(null);

  // reset modal
  const [showResetModal, setShowResetModal] = useState(false);

  // ops6 again modal + loading
  const [ops6Added, setOps6Added] = useState(false);
  const [loadingOps, setLoadingOps] = useState(false);
  const [showOpsAgainModal, setShowOpsAgainModal] = useState(false);

  // language picker hover state
  const [langOpen, setLangOpen] = useState(false);

  // global end
  const endRef = useRef(()=>{});
  useEffect(()=>{ endRef.current = onDragEnd; });
  useEffect(()=>{ const handler=()=> endRef.current();
    window.addEventListener('dragend', handler);
    window.addEventListener('drop', handler);
    window.addEventListener('dragcancel', handler);
    window.addEventListener('pointerup', handler);
    window.addEventListener('blur', handler);
    document.addEventListener('mouseleave', handler);
    return ()=>{ window.removeEventListener('dragend', handler); window.removeEventListener('drop', handler); window.removeEventListener('dragcancel', handler); window.removeEventListener('pointerup', handler); window.removeEventListener('blur', handler); document.removeEventListener('mouseleave', handler); };
  },[]);

  // close menus with doc click & ESC
  useEffect(() => {
    const onDoc = () => { setOpenTierMenu(null); };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenTierMenu(null);
        setShowResetModal(false);
        setShowOpsAgainModal(false);
        setLangOpen(false);
      }
    };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // global dragover -> keep pointer pos
  useEffect(()=>{
    function onGlobalDragOver(e){
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      const m = 14;
      let foundIdx = null;
      for(const [k,el] of Object.entries(tierContainerRefs.current||{})){
        if(!el) continue; const r = el.getBoundingClientRect();
        const inside = e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
        if(inside){ foundIdx = Number(k); break; }
      }
      if(foundIdx==null){ setHoverTierIndex(null); setHoverInsertIndex(null); }
    }
    window.addEventListener('dragover', onGlobalDragOver);
    return ()=> window.removeEventListener('dragover', onGlobalDragOver);
  },[]);

  // paste images
  useEffect(()=>{
    function onPaste(e){ const items=e.clipboardData?.items; if(!items) return; const files=[]; for(const it of items){ if(it.kind==='file'){ const f=it.getAsFile(); if(f && f.type.startsWith('image/')) files.push(f); } } if(files.length){ e.preventDefault(); addFilesAsItems(files);} }
    window.addEventListener('paste',onPaste); return ()=> window.removeEventListener('paste',onPaste);
  },[]);

  const itemById = useMemo(()=> Object.fromEntries(items.map(i=>[i.id,i])), [items]);

  // smoke checks
  useEffect(() => {
    try {
      console.assert(Array.isArray(tiers) && tiers.length >= 1, 'tiers initialized');
      console.assert(clamp(5,0,3)===3 && clamp(-1,0,3)===0, 'clamp bounds');
      const a=[1,3]; const b=insertAt(a,1,2); console.assert(JSON.stringify(b)==='[1,2,3]' && a.length===2, 'insertAt');
      console.assert(typeof uid()==='string' && uid().length>=6, 'uid ok');
      console.assert(computeInsertIndex(null,0,0)===0, 'insertIndex null safe');
    } catch {}
  }, []);

  // ---------- DnD handlers ----------
  function onDragStart(e,payload){
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed='move';
    setDragData(payload);
    cachedRectsRef.current = {};
  }
  function onDragEnd(){
    setDragData(null);
    setHoverTierIndex(null);
    setHoverInsertIndex(null);
    cachedRectsRef.current = {};
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=null; }
    pendingPosRef.current = null;
    lastPosRef.current = null;
  }
  function onDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }

  function moveItem({id,from,to}){
    if(!id) return;
    if(from==='pool'){ setPool(prev=> prev.filter(pid=> pid!==id)); }
    else { setTiers(prev=>{ const copy=prev.map(t=>({...t,items:[...t.items]})); const arr=copy[from.tierIndex].items; copy[from.tierIndex].items=arr.filter((x,i)=> !(x===id && i===from.index)); return copy; }); }
    if(to==='pool'){ setPool(prev=> insertAt(prev.filter(x=>x!==id), prev.length, id)); }
    else { setTiers(prev=>{ const copy=prev.map(t=>({...t,items:[...t.items]})); const arr=copy[to.tierIndex].items.filter(x=>x!==id); const insertIndex=clamp(to.index ?? arr.length,0,arr.length); arr.splice(insertIndex,0,id); copy[to.tierIndex].items=arr; return copy; }); }
  }

  function onDropToTier(e, tierIndex){
    e.preventDefault();
    try {
      const data=JSON.parse(e.dataTransfer.getData('text/plain'));
      const container=tierContainerRefs.current[tierIndex];
      let insertIndex=computeInsertIndex(container,e.clientX,e.clientY,(data.from && data.from.tierIndex===tierIndex)? data.id : null);
      moveItem({ id:data.id, from:data.from, to:{ tierIndex, index:insertIndex } });
      if(tierIndex===0){ setJustPoppedId(data.id); triggerSparkles(e.clientX,e.clientY); setTimeout(()=> setJustPoppedId(null),450);} 
    } catch {}
    onDragEnd();
  }
  function onDropToPool(e){ e.preventDefault(); try{ const data=JSON.parse(e.dataTransfer.getData('text/plain')); moveItem({ id:data.id, from:data.from, to:'pool' }); }catch{} onDragEnd(); }

  function getCardRects(container){
    if(!container) return [];
    const cards=[...container.querySelectorAll('[data-role="card"]')];
    return cards.map(el=>{
      const r=el.getBoundingClientRect();
      const id = el.dataset.id;
      return {
        id,
        cx:r.left+r.width/2, cy:r.top+r.height/2,
        left:r.left, right:r.right, top:r.top, bottom:r.bottom,
        w:r.width, h:r.height
      };
    });
  }

  // ---- Row-based insert index (Save4) ----
  function computeInsertIndex(container, x, y, excludeId){
    if(!container) return 0;
    const tierIndex = Number(container?.dataset?.tierIndex ?? -1);
    let rects = cachedRectsRef.current[tierIndex];
    if(!rects){ rects = getCardRects(container); cachedRectsRef.current[tierIndex]=rects; }
    if(!rects.length) return 0;

    let list = excludeId ? rects.filter(r=> r.id !== excludeId) : rects.slice();
    if(!list.length) return 0;

    list.sort((a,b)=> (a.top===b.top ? a.left-b.left : a.top-b.top));

    const avgH = list.reduce((s, r) => s + (r.h || 0), 0) / list.length || 100;
    const rowThresh = Math.max(avgH * 0.35, 28);

    const rows = [];
    for(const r of list){
      if(!rows.length){
        rows.push({ items:[r], refTop:r.top, top:r.top, bottom:r.bottom });
        continue;
      }
      const cur = rows[rows.length-1];
      const sameRow = Math.abs(r.top - cur.refTop) <= rowThresh;
      if(sameRow){
        cur.items.push(r);
        cur.refTop = (cur.refTop * (cur.items.length-1) + r.top) / cur.items.length;
        cur.top = Math.min(cur.top, r.top);
        cur.bottom = Math.max(cur.bottom, r.bottom);
      }else{
        rows.push({ items:[r], refTop:r.top, top:r.top, bottom:r.bottom });
      }
    }
    rows.forEach(row=> row.items.sort((a,b)=> a.left-b.left));

    let targetRowIndex = 0, best = Infinity;
    for(let i=0;i<rows.length;i++){
      const row = rows[i];
      const cy = (row.top + row.bottom) / 2;
      const d = Math.abs(y - cy);
      if(d < best){ best = d; targetRowIndex = i; }
    }
    const targetRow = rows[targetRowIndex];

    let within = targetRow.items.length;
    for(let i=0;i<targetRow.items.length;i++){
      if(x < targetRow.items[i].cx){ within = i; break; }
    }

    const before = rows.slice(0, targetRowIndex).reduce((s,row)=> s + row.items.length, 0);
    const absIndex = before + within;
    return clamp(absIndex, 0, list.length);
  }

  const isPointInsideTier = (tierIdx, margin=12) => {
    const p = lastPosRef.current; const el = tierContainerRefs.current[tierIdx];
    if(!p || !el) return false; const r = el.getBoundingClientRect();
    return p.x >= r.left - margin && p.x <= r.right + margin && p.y >= r.top - margin && p.y <= r.bottom + margin;
  };

  function triggerSparkles(x,y){ const id=uid(); const N=12; const arr=Array.from({length:N}).map((_,i)=>({ id:`${id}-${i}`, x,y, createdAt:Date.now(), angle:(Math.PI*2*i)/N + (Math.random()*0.4-0.2), dist:40+Math.random()*30 })); setSparkles(prev=>[...prev,...arr]); }

  const [editingTierIndex,setEditingTierIndex]=useState(null);
  const [editingTierValue,setEditingTierValue]=useState('');
  function startEditTier(i){ setEditingTierIndex(i); setEditingTierValue(tiers[i].name); }
  function commitEditTier(){ if(editingTierIndex==null) return; const name=(editingTierValue.trim()||tiers[editingTierIndex].name); setTiers(prev=> prev.map((t,i)=> i===editingTierIndex? {...t,name} : t)); setEditingTierIndex(null); setEditingTierValue(''); }
  function addTier(){ setTiers(prev=> [{name:'NEW', color:randomNiceColor(), items:[]}, ...prev]); }
  function removeTier(idx){ setTiers(prev=>{ const copy=prev.map(t=>({...t,items:[...t.items]})); const back=copy[idx].items; const next=copy.filter((_,i)=> i!==idx); setPool(p=>[...p,...back]); return next; }); }
  function setTierColor(idx,color){ setTiers(prev=> prev.map((t,i)=> i===idx? {...t,color} : t)); }

  const [newLabel,setNewLabel]=useState('');
  const [newImgUrl,setNewImgUrl]=useState('');
  function onSelectFiles(e){ const files=[...(e.target.files||[])]; if(files.length) addFilesAsItems(files); e.target.value=''; }
  function addFilesAsItems(files){ const readers=files.map(file=> new Promise(res=>{ const r=new FileReader(); r.onload=()=> res({name:file.name.replace(/\.[^.]+$/, ''), dataUrl:r.result}); r.readAsDataURL(file); })); Promise.all(readers).then(list=>{ const created=list.map(({name,dataUrl})=> makeItem({ label:name, image:dataUrl })); setItems(prev=>[...prev,...created]); setPool(prev=>[...prev,...created.map(c=>c.id)]); }); }
  function addNewItem(label,image){ const it=makeItem({ label:label||'New Item', image:image||newImgUrl||'' }); setItems(p=>[...p,it]); setPool(p=>[...p,it.id]); setNewLabel(''); setNewImgUrl(''); }

  // build item with nameMap for all langs (fallback to provided label)
  function makeItem({label, image, nameMap}){
    const base = label || '';
    const map = nameMap || { en: base, ko: base, ja: base, zh: base };
    return { id: uid(), label: base, image: image||'', nameMap: map };
  }
  const displayName = (item)=> (item?.nameMap?.[lang] || item?.nameMap?.en || item?.label || '');

  // ---- Load 6★ (/api/ops6) with confirm modal for re-add ----
  async function loadSixFromOps(forceAdd=false) {
    if (loadingOps) return;

    if (!forceAdd && ops6Added) { setShowOpsAgainModal(true); return; }

    setLoadingOps(true);
    try {
      const r = await fetch('/api/ops6', { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('fetch fail');
      const raw = await r.json();

      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.result)
        ? raw.result
        : [];

      if (!arr.length) { alert('No entries from /api/ops6'); return; }

      const norm = arr.map((x)=>{
        if (x == null) return null;
        if (typeof x === 'string') {
          const s = String(x);
          return makeItem({ label:s, image:'' , nameMap:{ en:s, ko:s, ja:s, zh:s }});
        }
        const en = x.en || x.label || x.name || x.appellation || '';
        const ko = x.kr || x.ko || '';
        const ja = x.jp || x.ja || '';
        const zh = x.zh || x.cn || '';
        const any = en || ko || ja || zh || '';
        const img = x.image || x.icon || x.img || x.url || x.src || '';
        const map = {
          en: String(en || any),
          ko: String(ko || any),
          ja: String(ja || any),
          zh: String(zh || any),
        };
        return makeItem({ label: map.en || any, image: img, nameMap: map });
      }).filter(Boolean);

      // de-dup logic
      let createFrom = [];
      if (forceAdd) {
        const seen = new Set();
        for (const it of norm) { const k = (it.nameMap?.en || it.label); if (seen.has(k)) continue; seen.add(k); createFrom.push(it); }
      } else {
        const existing = new Set(items.map((it)=> it.nameMap?.en || it.label));
        const seen = new Set();
        for (const it of norm) {
          const k = (it.nameMap?.en || it.label);
          if (existing.has(k)) continue;
          if (seen.has(k)) continue;
          seen.add(k); createFrom.push(it);
        }
      }

      if (!createFrom.length) { alert('Nothing to add.'); return; }

      setItems((p)=> [...p, ...createFrom]);
      setPool((p)=> [...p, ...createFrom.map(c=>c.id)]);

      setOps6Added(true);
      alert(`6★ ${createFrom.length}`);
    } catch (e) {
      console.error(e);
      alert('Load failed (/api/ops6)');
    } finally {
      setLoadingOps(false);
      setShowOpsAgainModal(false);
    }
  }

  // Reset via modal
  function doReset() {
    setPool(items.map(i=>i.id));
    setTiers(prev=> prev.map(t=>({...t,items:[]})));
    setOps6Added(false);
    setShowResetModal(false);
  }

  return (
    <div className={`${isDark?'text-white':'text-slate-900'} min-h-screen transition-colors duration-300 ${isDark?'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800':'bg-gradient-to-br from-slate-100 via-white to-slate-100'}`}>
      <GooDefs/>
      <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-50">{sparkles.map(s=> <Sparkle key={s.id} x={s.x} y={s.y} angle={s.angle} dist={s.dist}/> )}</div>

      {/* Theme toggle moved to bottom-left */}
      <ThemeToggle isDark={isDark} onToggle={()=> setTheme(isDark?'light':'dark')} position="bl" />

      {/* Reset modal */}
      {showResetModal && (
        <Modal onClose={()=> setShowResetModal(false)} isDark={isDark}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-bold">{t('confirmResetTitle')}</h3>
            <p className="text-sm opacity-80">{t('confirmResetDesc')}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={()=> setShowResetModal(false)}
                className={`px-4 py-2 rounded-xl border ${isDark?'bg-white/10 border-white/10':'bg-white border-slate-200'}`}
              >{t('cancel')}</button>
              <button
                onClick={doReset}
                className="px-4 py-2 rounded-xl text-white shadow-lg"
                style={{background:'linear-gradient(180deg,#fb7185,#ef4444)'}}
              >{t('resetGo')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Ops6 re-add modal */}
      {showOpsAgainModal && (
        <Modal onClose={()=> setShowOpsAgainModal(false)} isDark={isDark}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-bold">{t('opsAgainTitle')}</h3>
            <p className="text-sm opacity-80">{t('opsAgainDesc')}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={()=> setShowOpsAgainModal(false)}
                className={`px-4 py-2 rounded-xl border ${isDark?'bg-white/10 border-white/10':'bg-white border-slate-200'}`}
              >{t('cancel')}</button>
              <button
                onClick={()=> loadSixFromOps(true)}
                className="px-4 py-2 rounded-xl text-white shadow-lg"
                style={{background:'linear-gradient(180deg,#60a5fa,#38bdf8)'}}
              >{t('opsAdd')}</button>
            </div>
          </div>
        </Modal>
      )}

      <header className={`sticky top-0 z-30 backdrop-blur border-b ${isDark?'bg-slate-900/50 border-white/10':'bg-white/70 border-slate-200/70'}`}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl shadow-lg relative overflow-hidden" style={{filter:'url(#goo)', background:isDark?'#3b82f6':'#60a5fa'}}><BubbleDots/></div>
            <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <BlobButton onClick={addTier}>{t('addTier')}</BlobButton>
            <BlobButton onClick={()=> setShowResetModal(true)}>{t('reset')}</BlobButton>
            <BlobButton onClick={()=> loadSixFromOps(false)} disabled={loadingOps} loading={loadingOps}>
              {loadingOps ? t('loading') : t('load6')}
            </BlobButton>

            {/* Name toggle */}
            <button
              type="button"
              onClick={()=> setShowNames(v=>!v)}
              className={`px-3 py-2 rounded-xl border text-sm ${isDark?'bg-white/10 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
              title={t('nameShow')}
            >
              {showNames ? t('nameHide') : t('nameShow')}
            </button>

            {/* Language selector (hover-expand) */}
            <LangPicker
              lang={lang}
              setLang={setLang}
              langs={LANGS}
              flags={FLAGS}
              names={NAMES}
              isDark={isDark}
              open={langOpen}
              setOpen={setLangOpen}
              label={t('langTitle')}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {/* Upload */}
        <section className="mb-6">
          <div
            className={`rounded-2xl p-4 md:p-6 shadow-xl border ${isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'}` }
            onDragOver={e=>{e.preventDefault(); e.dataTransfer.dropEffect='copy';}}
            onDrop={e=>{ e.preventDefault(); const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')); if(files.length) addFilesAsItems(files); }}
          >
            <div className="flex flex-wrap gap-3 items-center">
              <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition ${isDark?'bg-white/10 border-white/10 hover:bg-white/15':'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>파일 선택(복수)
                <input type="file" accept="image/*" multiple className="hidden" onChange={onSelectFiles}/>
              </label>
              <div className="grow"/>
              <input className={`px-3 py-2 rounded-xl border w-44 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder={t('inputLabel')} value={newLabel} onChange={e=> setNewLabel(e.target.value)} />
              <input className={`px-3 py-2 rounded-xl border w-56 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder={t('inputImg')} value={newImgUrl} onChange={e=> setNewImgUrl(e.target.value)} />
              <BlobButton onClick={()=> addNewItem(newLabel, newImgUrl)}>{t('addSingle')}</BlobButton>
            </div>
          </div>
        </section>

        {/* Pool */}
        <section className="mb-6">
          <div onDragOver={onDragOver} onDrop={onDropToPool} className="min-h-[112px] rounded-2xl p-3 flex flex-wrap gap-3 bg-transparent">
            {pool.map((id,index)=> (
              <DraggableItem
                key={id}
                item={itemById[id]}
                onDragStart={(e)=> onDragStart(e,{id, from:'pool'})}
                justPopped={justPoppedId===id}
                index={index}
                isDark={isDark}
                isDragging={dragData?.id===id}
                showNames={showNames}
                name={displayName(itemById[id])}
                onRename={newName=> {
                  // update all langs to same newName when editing
                  setItems(prev=> prev.map(it=> it.id===id? {...it, label:newName, nameMap:{en:newName,ko:newName,ja:newName,zh:newName}}: it))
                }}
                onDelete={()=>{ setItems(prev=> prev.filter(it=> it.id!==id)); setPool(prev=> prev.filter(x=> x!==id)); }}
              />
            ))}
          </div>
        </section>

        {/* Tiers */}
        <section className="space-y-4">
          {tiers.map((tier,idx)=> (
            <div key={idx} className="relative group/tier">
              <div className="flex items-stretch gap-3">
                {/* Left tier label */}
                <div className="w-24 shrink-0 rounded-2xl shadow-lg overflow-visible border" style={{borderColor: isDark? 'rgba(255,255,255,0.1)':'#e5e7eb'}}>
                  <div className="relative h-full min-h-[64px] rounded-2xl overflow-visible grid place-items-center font-extrabold text-base text-slate-900 select-none" style={{ background:`linear-gradient(135deg, ${tier.color}, #ffffff)` }} onContextMenu={e=>{ e.preventDefault(); e.stopPropagation(); setOpenTierMenu(openTierMenu===idx? null: idx); }} onClick={e=> e.stopPropagation()}>
                    {editingTierIndex===idx ? (
                      <input autoFocus value={editingTierValue} onChange={e=> setEditingTierValue(e.target.value)} onBlur={commitEditTier} onKeyDown={e=> e.key==='Enter' && commitEditTier()} className="w-20 mx-1 rounded-lg px-1 py-0.5 bg-white/80 text-slate-900 text-sm focus:outline-none"/>
                    ) : (
                      <button onClick={()=> startEditTier(idx)} title="Edit tier name" className="w-full h-full">{tier.name}</button>
                    )}
                    {openTierMenu===idx && (
                      <div className={`absolute top-16 right-1 z-[70] rounded-xl border p-2 w-48 overflow-hidden ${isDark? 'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-xl`} onClick={e=> e.stopPropagation()}>
                        <label className="flex items-center justify-between text-sm mb-2">Color
                          <input type="color" value={tier.color} onChange={e=> setTierColor(idx, e.target.value)} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                        </label>
                        <button onClick={()=> startEditTier(idx)} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5">Rename</button>
                        <button onClick={()=> { removeTier(idx); setOpenTierMenu(null); }} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5 text-rose-500">Delete tier</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  ref={el=> (tierContainerRefs.current[idx]=el)} data-tier-index={idx}
                  onDragOver={e=>{
                    onDragOver(e);
                    pendingPosRef.current = { idx, x: e.clientX, y: e.clientY };
                    if(!rafRef.current){
                      rafRef.current = requestAnimationFrame(()=>{
                        rafRef.current=null;
                        const p = pendingPosRef.current; if(!p) return;
                        const { idx:xIdx, x, y } = p;
                        setHoverTierIndex(xIdx);
                        const c = tierContainerRefs.current[xIdx];
                        let i = computeInsertIndex(c, x, y, (dragData && dragData.from && dragData.from.tierIndex===xIdx)? dragData.id : null);
                        setHoverInsertIndex(i);
                        lastPosRef.current = {x,y};
                        pendingPosRef.current = null;
                      });
                    }
                  }}
                  onDragLeave={()=> { 
                    const c = tierContainerRefs.current[idx];
                    const r = c?.getBoundingClientRect();
                    const m = 16;
                    const p = lastPosRef.current;
                    const inside = !!(r && p && p.x >= r.left - m && p.x <= r.right + m && p.y >= r.top - m && p.y <= r.bottom + m);
                    if(!inside){
                      if(hoverTierIndex===idx) setHoverTierIndex(null);
                      setHoverInsertIndex(null);
                      cachedRectsRef.current[idx]=null;
                      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=null; }
                      pendingPosRef.current=null;
                      lastPosRef.current=null;
                    }
                  }}
                  onDrop={e=>{ if(hoverTierIndex===idx) setHoverTierIndex(null); setHoverInsertIndex(null); cachedRectsRef.current[idx]=null; if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current=null; } pendingPosRef.current=null; lastPosRef.current=null; onDropToTier(e,idx); }}
                  className="flex-1 min-h-[112px] rounded-2xl p-3 flex flex-wrap gap-3 relative overflow-visible"
                >
                  {dragData && hoverTierIndex===idx && isPointInsideTier(idx) && (<div className={`pointer-events-none absolute inset-0 rounded-2xl ${isDark ? 'tier-inset-dark' : 'tier-inset-light'}`} />)}
                  {tier.items.length===0 && !(dragData && hoverTierIndex===idx && isPointInsideTier(idx)) && (<div className={`rounded-xl px-3 py-6 border-2 border-dashed ${isDark?'border-white/10 text-white/40':'border-slate-200 text-slate-400'} text-sm`}>{t('dragHere')}</div>)}
                  {(() => { 
                    const original = tier.items;
                    const filtered = (dragData && dragData.from && dragData.from.tierIndex===idx && hoverTierIndex===idx)
                      ? original.filter(x=> x!==dragData.id)
                      : original.slice();
                    const ghostAt = (dragData && hoverTierIndex===idx && isPointInsideTier(idx) && hoverInsertIndex!=null) ? Math.min(hoverInsertIndex, filtered.length) : null;
                    const out = [];
                    for(let i=0;i<filtered.length;i++){
                      if(ghostAt===i && dragData && itemById[dragData.id]) out.push(<GhostPreview key="__ghost" item={itemById[dragData.id]} isDark={isDark} showNames={showNames} name={displayName(itemById[dragData.id])} />);
                      const id = filtered[i];
                      out.push(
                        <DraggableItem
                          key={id}
                          item={itemById[id]}
                          index={i}
                          onDragStart={(e)=> onDragStart(e,{id, from:{tierIndex:idx,index:i}})}
                          justPopped={justPoppedId===id}
                          isDark={isDark}
                          isDragging={dragData?.id===id}
                          showNames={showNames}
                          name={displayName(itemById[id])}
                          onRename={newName=> {
                            setItems(prev=> prev.map(it=> it.id===id? {...it, label:newName, nameMap:{en:newName,ko:newName,ja:newName,zh:newName}}: it))
                          }}
                          onDelete={()=>{ setItems(prev=> prev.filter(it=> it.id!==id)); setTiers(prev=> prev.map((t,i2)=> i2===idx? {...t,items:t.items.filter(x=> x!==id)}: t)); }}
                        />
                      );
                    }
                    if(ghostAt===filtered.length && dragData && itemById[dragData.id]) out.push(<GhostPreview key="__ghost" item={itemById[dragData.id]} isDark={isDark} showNames={showNames} name={displayName(itemById[dragData.id])} />);
                    return out;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <style>{`
        .item-card { position: relative; width: var(--w,78px); height: var(--h,115px); border-radius: 12px; display: flex; flex-direction: column; overflow: visible; }
        .item-card.square { --h: var(--w,78px); }
        .item-img { width: 100%; height: 78px; overflow: hidden; border-top-left-radius: 12px; border-top-right-radius: 12px; }
        .item-card.square .item-img { height: 100%; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
        .item-card .img-el { width: 100%; height: 100%; object-fit: cover; }
        .item-name { height: 32px; display: grid; place-items: center; padding: 2px 4px 0px; font-weight: 800; text-align: center; line-height: 1.05; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; backdrop-filter: saturate(120%) blur(2px); overflow: hidden; }
        .item-card:after { content: ""; position: absolute; inset: -1px; border-radius: 18px; pointer-events: none; opacity: 0; transition: opacity .2s ease; background: radial-gradient(120px 80px at var(--mx,50%) var(--my,50%), rgba(255,255,255,.15), transparent 50%); }
        .item-card:hover:after { opacity: 1; }
        .animate-pop { animation: pop .4s cubic-bezier(.2,1,.4,1); }
        @keyframes pop { 0% { transform: scale(.92); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }
        @keyframes sparkle { 0% { transform: translate(0,0) scale(.4); opacity: 1; } 80% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; } }
        .sparkle { position: fixed; width: 10px; height: 10px; background: radial-gradient(circle at 30% 30%, #fff, #a5b4fc 60%, transparent 70%); border-radius: 50%; pointer-events: none; animation: sparkle .9s ease-out forwards; filter: drop-shadow(0 0 6px rgba(99,102,241,.7)); }
        @keyframes bubble { 0% { transform: translateY(0) scale(1); opacity: .8 } 50% { transform: translateY(-6px) scale(1.05); opacity: 1 } 100% { transform: translateY(0) scale(1); opacity: .8 } }
        .tier-inset-light { box-shadow: inset 0 10px 24px rgba(0,0,0,0.08), inset 0 -10px 24px rgba(0,0,0,0.06), inset 0 0 0 2px rgba(0,0,0,0.03); background: radial-gradient(120% 60% at 50% 40%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%); }
        .tier-inset-dark  { 
          box-shadow:
            inset 28px 0 36px rgba(255,255,255,0.08),
            inset -28px 0 36px rgba(255,255,255,0.08),
            inset 0 0 0 1px rgba(255,255,255,0.10);
          background: transparent;
        }
        .ghost-card{opacity:.65; outline-offset:-2px;}

        /* spinner */
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }

        /* modal */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: grid; place-items: center; z-index: 80; }

        /* Lang picker animation */
        .lang-pop { transform-origin: top right; transition: transform .18s ease, opacity .18s ease; }
        .lang-pop.open { transform: scale(1); opacity: 1; }
        .lang-pop.closed { transform: scale(.85); opacity: 0; pointer-events: none; }
      `}</style>
    </div>
  );
}

/* --------- Components --------- */

function DraggableItem({ item, onDragStart, justPopped, index, isDark, onRename, onDelete, isDragging, showNames, name }){
  const ref = useRef(null);
  const [open,setOpen] = useState(false);
  useEffect(()=>{ const onDoc=e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; const onKey=e=>{ if(e.key==='Escape') setOpen(false); }; document.addEventListener('click',onDoc); document.addEventListener('keydown',onKey); return ()=>{ document.removeEventListener('click',onDoc); document.removeEventListener('keydown',onKey); }; },[]);

  const square = !showNames;

  return (
    <div
      ref={ref}
      data-role="card"
      data-id={item.id}
      onContextMenu={e=>{ e.preventDefault(); setOpen(true); }}
      draggable
      onDragStart={e=>{ onDragStart && onDragStart(e); const r=ref.current?.getBoundingClientRect(); if(r){ e.currentTarget.style.setProperty('--mx', `${e.clientX-r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY-r.top}px`);} }}
      className={`item-card ${square?'square':''} group select-none border shadow-lg hover:-translate-y-0.5 transition transform ${justPopped?'animate-pop':''} ${isDark?'bg-slate-800/80 border-white/10':'bg-white/90 border-slate-200'} ${isDragging?'opacity-50':''}`}
    >
      {open && (
        <div className={`absolute top-9 right-1 z-[80] rounded-xl border p-2 w-48 overflow-hidden ${isDark?'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-2xl`} onClick={e=> e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2">
            <input className={`w-32 text-sm px-2 py-1 rounded-lg border ${isDark?'bg-slate-800 border-white/10':'bg-white border-slate-200'}`} defaultValue={name} onKeyDown={e=>{ if(e.key==='Enter'){ const v=e.currentTarget.value.trim()||name; onRename&&onRename(v); setOpen(false);} }} />
            <button onClick={e=>{ const inp=e.currentTarget.parentElement?.querySelector('input'); const v=(inp?.value||'').trim()||name; onRename&&onRename(v); setOpen(false); }} className="text-sm px-2 py-1 rounded-lg bg-emerald-500/90 text-white whitespace-nowrap">OK</button>
          </div>
          <button onClick={()=>{ onDelete&&onDelete(); setOpen(false); }} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5 text-rose-500">Delete</button>
        </div>
      )}

      <div className="item-img">
        {item.image
          ? <img src={item.image} alt={name} className="img-el" draggable={false}/>
          : <div className={`${isDark?'bg-slate-700/70 text-white/70':'bg-slate-100 text-slate-400'} w-full h-full flex items-center justify-center text-xs`}>IMG</div>}
      </div>

      {showNames && (
        <div className={`item-name ${isDark? 'bg-slate-900/35 text-white':'bg-white/85 text-slate-900'}`}>
          <FitText text={name} maxFont={14} minFont={7}  maxLines={1} />
        </div>
      )}
    </div>
  );
}

function GhostPreview({item,isDark,showNames,name}){
  if(!item) return null;
  const square = !showNames;
  return (
    <div className={`item-card ${square?'square':''} ghost-card border-2 ${isDark?'bg-slate-800/50 border-white/20':'bg-white/60 border-slate-300/60'}`} data-role="card-ghost">
      <div className="item-img" style={{opacity:.6}}>
        {item.image ? <img src={item.image} alt="ghost" className="img-el"/> :
          <div className={`${isDark?'bg-slate-700/60 text-white/50':'bg-slate-100 text-slate-400'} w-full h-full flex items-center justify-center text-xs`}>IMG</div>}
      </div>
      {showNames && (
        <div className={`item-name ${isDark? 'bg-slate-900/25 text-white/80':'bg-white/70 text-slate-800'}`} style={{opacity:.9}}>
          <FitText text={name} maxFont={14} minFont={7}  maxLines={1} />
        </div>
      )}
    </div>
  );
}

function FitText({ text, maxFont=20, minFont=10, maxLines=2 }){
  const ref = useRef(null);
  useEffect(()=>{
    const el = ref.current;
    if(!el) return;
    let alive = true;
    let size = maxFont; let iter = 0;
    const apply = () => {
      if(!alive || !el) return;
      try {
        el.style.fontSize = size+'px';
        el.style.display='-webkit-box';
        el.style.webkitBoxOrient='vertical';
        el.style.webkitLineClamp=String(maxLines);
        el.style.wordBreak='break-word';
        el.style.overflowWrap='anywhere';
        el.style.width='100%';
        el.style.height='100%';
      } catch {}
    };
    const fits = () => {
      if(!alive || !el) return true;
      return el.scrollHeight<=el.clientHeight && el.scrollWidth<=el.clientWidth;
    };
    apply();
    const shrink = () => {
      if(!alive || !el) return;
      while(!fits() && size>minFont && iter<30){ size-=1; iter++; apply(); }
    };
    const raf = requestAnimationFrame(shrink);
    return () => { alive = false; cancelAnimationFrame(raf); };
  },[text,maxFont,minFont,maxLines]);
  return <span ref={ref} style={{display:'-webkit-box', WebkitLineClamp:maxLines, WebkitBoxOrient:'vertical', overflow:'hidden', width:'100%', height:'100%'}}>{text}</span>;
}

function Sparkle({x,y,angle,dist}){ const dx=Math.cos(angle)*dist; const dy=Math.sin(angle)*dist; return <div className="sparkle" style={{left:x, top:y, "--dx":`${dx}px`, "--dy":`${dy}px`}}/>; }

/** Button with optional spinner */
function BlobButton({children,onClick,disabled,loading}){
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center px-4 py-2 rounded-2xl font-semibold text-slate-900 shadow-lg active:scale-[0.98] transition select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      style={{background:'linear-gradient(180deg,#93c5fd,#38bdf8)', filter:'url(#goo)'}}
    >
      <span className="relative z-10 flex items-center gap-2">
        {loading && (
          <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
            <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        )}
        {children}
      </span>
      <span className="absolute inset-0 overflow-hidden rounded-2xl">
        <span className="absolute w-8 h-8 bg-white/50 rounded-full left-2 top-2 animate-[bubble_2.4s_ease-in-out_infinite]"/>
        <span className="absolute w-6 h-6 bg-white/40 rounded-full right-3 top-3 animate-[bubble_2s_.2s_ease-in-out_infinite]"/>
        <span className="absolute w-7 h-7 bg-white/40 rounded-full left-3 bottom-3 animate-[bubble_2.2s_.1s_ease-in-out_infinite]"/>
      </span>
    </button>
  );
}

/** Theme toggle (pos: 'br'|'bl') */
function ThemeToggle({isDark,onToggle,position="br"}){
  const posClass = position==="bl" ? "left-3 bottom-3" : "right-3 bottom-3";
  return (
    <button
      onClick={onToggle}
      title={isDark?'Light mode':'Dark mode'}
      className={`fixed ${posClass} z-[60] w-10 h-10 grid place-items-center rounded-2xl border shadow-lg active:scale-95 transition ${isDark?'bg-slate-800/80 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
      style={{filter:'url(#goo)'}}
    >
      {isDark? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      )}
    </button>
  );
}

/** Hover-animated language picker */
function LangPicker({lang,setLang,langs,flags,names,isDark,open,setOpen,label}){
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={()=> setOpen(true)}
      onMouseLeave={()=> setOpen(false)}
    >
      {/* anchor / compact button */}
      <button
        type="button"
        className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 ${isDark?'bg-white/10 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
        title={label}
      >
        <span style={{fontSize:14}}>{flags[lang] || '🌐'}</span>
        <span className="hidden sm:inline">{names[lang] || 'Language'}</span>
      </button>

      {/* pop choices */}
      <div className={`absolute right-0 mt-2 lang-pop ${open?'open':'closed'}`}>
        <div className={`p-2 rounded-2xl shadow-2xl border ${isDark?'bg-slate-900/95 border-white/10':'bg-white/95 border-slate-200'} flex flex-col gap-1`}>
          {langs.map(code=> (
            <button
              key={code}
              type="button"
              onClick={()=> setLang(code)}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 text-sm transition ${code===lang ? (isDark?'bg-white/10':'bg-slate-100') : (isDark?'hover:bg-white/10':'hover:bg-slate-100')}`}
            >
              <span style={{fontSize:14}}>{flags[code] || '🌐'}</span>
              <span>{names[code] || code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Modal({children,onClose,isDark}){
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        onClick={e=> e.stopPropagation()}
        className={`w-full max-w-sm mx-auto rounded-2xl p-5 shadow-2xl ${isDark?'bg-slate-900/95 border border-white/10 text-white':'bg-white/95 border border-slate-200 text-slate-900'}`}
      >
        {children}
      </div>
    </div>
  );
}

function BubbleDots(){ return (<div className="absolute inset-0"><span className="absolute w-3 h-3 rounded-full bg-white/70 left-2 top-2 animate-[bubble_2.2s_ease-in-out_infinite]"/><span className="absolute w-2.5 h-2.5 rounded-full bg-white/60 right-2 top-3 animate-[bubble_2.4s_.1s_ease-in-out_infinite]"/><span className="absolute w-2 h-2 rounded-full bg-white/60 left-3 bottom-2 animate-[bubble_2s_.2s_ease-in-out_infinite]"/></div>); }
function GooDefs(){ return (<svg width="0" height="0" style={{position:'absolute'}}><defs><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo"/><feBlend in="SourceGraphic" in2="goo"/></filter></defs></svg>); }

/* --------- Utils --------- */
function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function insertAt(arr,index,value){ const c=arr.slice(); c.splice(index,0,value); return c; }
function randomNiceColor(){ const palette=["#60a5fa","#38bdf8","#22d3ee","#34d399","#a78bfa","#f472b6","#fbbf24","#f97316","#ef4444"]; return palette[Math.floor(Math.random()*palette.length)]; }
export { TierListApp as App };
