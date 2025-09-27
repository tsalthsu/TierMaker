import React, { useEffect, useMemo, useRef, useState } from "react"; 
import ExportPNG from "./components/ExportPNG";
/* @vite-ignore */
// Arknights Tier – Clean (Save 10: Multi-load 4/5/6/All + confirm modals)
// - Header: 4★/5★/6★/All buttons (in that order)
// - Each shows a confirm modal before loading
// - Fetch tries /api/ops?star=X then falls back to /api/opsX
// - i18n, theme bottom-left, name on/off, toast, row-based DnD maintained

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
      load4: 'Load 4★',
      load5: 'Load 5★',
      load6: 'Load 6★',
      loadAll: 'Load All',
      loading: 'Loading…',
      inputLabel: 'Label (optional)',
      inputImg: 'Image URL (optional)',
      addSingle: 'Add One',
      dragHere: 'Drag items here to place.',
      confirmResetTitle: 'Revert to initial state',
      confirmResetDesc: 'This clears all tiers and returns items to the pool.',
      cancel: 'Cancel',
      resetGo: 'Reset',
      // generic confirm
      confirmLoadTitle: 'Load {star}',
      confirmLoadDesc: 'Do you want to import {star} operators?',
      confirmYes: 'Load',
      // toasts
      toastOpsSuccess: 'Loaded {n} {star}.',
      toastOpsNoEntries: 'No entries from the API.',
      toastOpsNoneToAdd: 'Nothing to add.',
      toastOpsFail: 'Load failed.',
      nameShow: 'Show Names',
      nameHide: 'Hide Names',
      langTitle: 'Language',
      star4: '4★',
      star5: '5★',
      star6: '6★',
      starAll: 'All',
    },
    ko: {
      title: 'Arknights Tier – Clean',
      addTier: '티어 추가',
      reset: '초기화',
      load4: '4성 불러오기',
      load5: '5성 불러오기',
      load6: '6성 불러오기',
      loadAll: '전체 불러오기',
      loading: '불러오는 중…',
      inputLabel: '라벨 (선택)',
      inputImg: '이미지 URL (선택)',
      addSingle: '단일 추가',
      dragHere: '여기로 드래그해서 배치하세요.',
      confirmResetTitle: '초기 상태로 되돌립니다',
      confirmResetDesc: '모든 티어 배치를 비우고 풀로 되돌립니다.',
      cancel: '취소',
      resetGo: '초기화',
      // generic confirm
      confirmLoadTitle: '{star} 불러오기',
      confirmLoadDesc: '{star} 오퍼레이터를 불러오겠습니까?',
      confirmYes: '불러오기',
      // toasts
      toastOpsSuccess: '{star} {n}개 불러왔습니다.',
      toastOpsNoEntries: 'API에서 불러올 항목이 없습니다.',
      toastOpsNoneToAdd: '추가할 항목이 없습니다.',
      toastOpsFail: '불러오기에 실패했습니다.',
      nameShow: '이름 표시',
      nameHide: '이름 숨기기',
      langTitle: '언어',
      star4: '4성',
      star5: '5성',
      star6: '6성',
      starAll: '전체',
    },
    ja: {
      title: 'Arknights Tier – Clean',
      addTier: 'ティア追加',
      reset: 'リセット',
      load4: '★4を読み込む',
      load5: '★5を読み込む',
      load6: '★6を読み込む',
      loadAll: '全て読み込む',
      loading: '読み込み中…',
      inputLabel: 'ラベル（任意）',
      inputImg: '画像URL（任意）',
      addSingle: '1件追加',
      dragHere: 'ここにドラッグして配置します。',
      confirmResetTitle: '初期状態に戻します',
      confirmResetDesc: '全てのティアをクリアし、プールに戻します。',
      cancel: 'キャンセル',
      resetGo: 'リセット',
      confirmLoadTitle: '{star}の読み込み',
      confirmLoadDesc: '{star}オペレーターを読み込みますか？',
      confirmYes: '読み込む',
      toastOpsSuccess: '{star}を{n}件読み込みました。',
      toastOpsNoEntries: 'APIから読み込む項目がありません。',
      toastOpsNoneToAdd: '追加する項目はありません。',
      toastOpsFail: '読み込みに失敗しました。',
      nameShow: '名前表示',
      nameHide: '名前非表示',
      langTitle: '言語',
      star4: '★4',
      star5: '★5',
      star6: '★6',
      starAll: '全て',
    },
    zh: {
      title: 'Arknights Tier – Clean',
      addTier: '添加层级',
      reset: '重置',
      load4: '导入4★',
      load5: '导入5★',
      load6: '导入6★',
      loadAll: '全部导入',
      loading: '加载中…',
      inputLabel: '标签（可选）',
      inputImg: '图片URL（可选）',
      addSingle: '添加一项',
      dragHere: '拖拽到此处进行放置。',
      confirmResetTitle: '恢复到初始状态',
      confirmResetDesc: '清空所有层级并将项目放回池中。',
      cancel: '取消',
      resetGo: '重置',
      confirmLoadTitle: '导入{star}',
      confirmLoadDesc: '要导入{star}干员吗？',
      confirmYes: '导入',
      toastOpsSuccess: '已导入 {n} 个{star}。',
      toastOpsNoEntries: 'API 未返回可导入的项目。',
      toastOpsNoneToAdd: '没有可添加的项目。',
      toastOpsFail: '导入失败。',
      nameShow: '显示名称',
      nameHide: '隐藏名称',
      langTitle: '语言',
      star4: '4★',
      star5: '5★',
      star6: '6★',
      starAll: '全部',
    }
  };
  const t = (k)=> (MSG[lang] && MSG[lang][k]) || MSG.en[k] || k;
  const tfmt = (k, vars={}) => (t(k) || '').replace(/\{(\w+)\}/g, (_,m)=> String(vars[m] ?? ''));

  // ---------- Toasts ----------
  const [toasts, setToasts] = useState([]); // {id, msg, type}
  function pushToast(msg, type='info', duration=2500){
    const id = uid();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(()=> setToasts(prev => prev.filter(t=> t.id!==id)), duration);
  }

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
  const [sweeps, setSweeps] = useState([]);
  const addSweep = React.useCallback((left, top, w, h, radius = 12) => {
    setSweeps(prev => [...prev, { id: uid(), x: left, y: top, w, h, r: radius, createdAt: Date.now() }]);
  }, []);
  useEffect(() => {
  const t = setInterval(() => {
    setSparkles(prev => prev.filter(s => Date.now() - s.createdAt < (s.life || 1100)));
    setSweeps(prev => prev.filter(sw => Date.now() - sw.createdAt < 900));
  }, 200);
  return () => clearInterval(t);
}, []);
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

  // load confirm modal
  const [confirmTarget, setConfirmTarget] = useState(null); // '4'|'5'|'6'|'all'|null
  const [loadingOps, setLoadingOps] = useState(false);

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
        setConfirmTarget(null);
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
      if (tierIndex === 0) {
  setJustPoppedId(data.id);
  // 상태 반영 후 DOM에 카드가 렌더링된 다음 위치 계산
  requestAnimationFrame(() => {
    const card = tierContainerRefs.current[tierIndex]?.querySelector(
      `[data-role="card"][data-id="${data.id}"]`
    );
    if (card) {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      addSweep(r.left, r.top, r.width, r.height, 12);
      triggerSparkles(cx, cy);
    } else {
      // 혹시 못 찾았을 때는 임시로 마우스 좌표
      triggerSparkles(e.clientX, e.clientY);
    }
  });
  setTimeout(() => setJustPoppedId(null), 450);
}
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

function triggerSparkles(x, y) {
  const id = uid();

  // --- BACK layer (behind cards): dense ring + dust + big flare ---
  const ringN = 36;
  const dustN = 60;

  const backRing = Array.from({ length: ringN }).map((_, i) => {
    const a = (Math.PI * 2 * i) / ringN + (Math.random() * 0.3 - 0.15);
    const dist = 70 + Math.random() * 30; // larger radius
    return { id: `${id}-br-${i}`, layer: 'back', type: 'dust', x, y, angle: a, dist,
      size: 2 + Math.random()*2, life: 1000 + Math.random()*250, createdAt: Date.now(), delay: Math.floor(Math.random()*120) };
  });

  const backDust = Array.from({ length: dustN }).map((_, i) => {
    const a = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    return { id: `${id}-bd-${i}`, layer: 'back', type: 'dust', x, y, angle: a, dist,
      size: 1.6 + Math.random()*2.4, life: 900 + Math.random()*280, createdAt: Date.now(), delay: Math.floor(Math.random()*160) };
  });

  const backFlare = {
    id: `${id}-bf-0`, layer: 'back', type: 'flare', x, y,
    angle: Math.random()*Math.PI*2, dist: 60 + Math.random()*20,
    size: 18 + Math.random()*6, rotate: (Math.random()*20-10), power: 1,
    life: 1400 + Math.random()*260, createdAt: Date.now(), delay: 30 + Math.floor(Math.random()*90)
  };

  // --- FRONT layer (accent): optional small flare ---
  const frontFlare = Math.random()<0.6 ? [{
    id: `${id}-ff-0`, layer: 'front', type: 'flare', x, y,
    angle: Math.random()*Math.PI*2, dist: 45 + Math.random()*14,
    size: 10 + Math.random()*4, rotate: (Math.random()*16-8),
    life: 1100 + Math.random()*220, createdAt: Date.now(), delay: 80 + Math.floor(Math.random()*120)
  }] : [];

  setSparkles(prev => [...prev, ...backRing, ...backDust, backFlare, ...frontFlare]);
}



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

  // ---- Unified Loader (4/5/6/All) ----
  async function loadFromOps(star) {
    if (loadingOps) return;
    setLoadingOps(true);
    const starLabel = star==='all' ? t('starAll') : (star==='4'?t('star4'):star==='5'?t('star5'):t('star6'));

    try {
      // try query endpoint first, then fallback to /api/opsX
      const tryEndpoints = [];
      if (star === 'all') {
        tryEndpoints.push('/api/ops?star=all', '/api/opsAll');
      } else {
        tryEndpoints.push(`/api/ops?star=${star}`, `/api/ops${star}`);
      }

      let raw = null, ok = false;
      for (const url of tryEndpoints) {
        try {
          const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (!r.ok) continue;
          raw = await r.json();
          ok = true;
          break;
        } catch {}
      }
      if (!ok) throw new Error('fetch fail');

      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.result)
        ? raw.result
        : [];

      if (!arr.length) { pushToast(t('toastOpsNoEntries'), 'warn'); return; }

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

      // de-dup against existing
      const existing = new Set(items.map((it)=> it.nameMap?.en || it.label));
      const seen = new Set();
      const createFrom = [];
      for (const it of norm) {
        const k = (it.nameMap?.en || it.label);
        if (existing.has(k)) continue;
        if (seen.has(k)) continue;
        seen.add(k); createFrom.push(it);
      }

      if (!createFrom.length) { pushToast(t('toastOpsNoneToAdd'), 'warn'); return; }

      setItems((p)=> [...p, ...createFrom]);
      setPool((p)=> [...p, ...createFrom.map(c=>c.id)]);

      pushToast(tfmt('toastOpsSuccess', { n: createFrom.length, star: starLabel }), 'success');
    } catch (e) {
      console.error(e);
      pushToast(t('toastOpsFail'), 'error');
    } finally {
      setLoadingOps(false);
      setConfirmTarget(null);
    }
  }

  // Reset via modal
  function doReset() {
    setPool(items.map(i=>i.id));
    setTiers(prev=> prev.map(t=>({...t,items:[]})));
    setConfirmTarget(null);
    setShowResetModal(false);
  }

  return (
    <div className={`${isDark?'text-white':'text-slate-900'} min-h-screen transition-colors duration-300 ${isDark?'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800':'bg-gradient-to-br from-slate-100 via-white to-slate-100'}`}>
      <GooDefs/>
{/* Back layer (behind cards) */}
<div className="pointer-events-none fixed inset-0 z-0">
  {sparkles.filter(s => s.layer === 'back').map(s => (
    <Sparkle key={s.id} {...s} />
  ))}
</div>

{/* Front layer (sweep/flare accent) */}
<div className="pointer-events-none fixed inset-0 z-40">
  {sweeps.map(sw => <SweepGlow key={sw.id} {...sw} />)}
  {sparkles.filter(s => s.layer === 'front').map(s => (
    <Sparkle key={s.id} {...s} />
  ))}
</div>

      {/* Theme toggle moved to bottom-left */}
      <ThemeToggle isDark={isDark} onToggle={()=> setTheme(isDark?'light':'dark')} position="bl" />

      {/* Toast container (top-right) */}
      <div className="fixed top-4 right-4 z-[70] space-y-2">
        {toasts.map(ti => (
          <Toast key={ti.id} msg={ti.msg} type={ti.type} isDark={isDark} />
        ))}
      </div>

      {/* Reset modal */}
      {showResetModal && (
        <Modal onClose={()=> setShowResetModal(false)} isDark={isDark}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-bold">{t('confirmResetTitle')}</h3>
            <p className="text-sm opacity-80">{t('confirmResetDesc')}</p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={()=> setShowResetModal(false)}
                className={`px-4 py-2 rounded border ${isDark?'bg-white/10 border-white/10':'bg-white border-slate-200'}`}
              >{t('cancel')}</button>
              <button
                onClick={doReset}
                className="px-4 py-2 rounded text-white shadow-lg"
                style={{background:'linear-gradient(180deg,#fb7185,#ef4444)'}}
              >{t('resetGo')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Generic load confirm modal */}
      {confirmTarget && (
        <Modal onClose={()=> setConfirmTarget(null)} isDark={isDark}>
          <div className="text-center space-y-4">
            <h3 className="text-lg font-bold">
              {tfmt('confirmLoadTitle', { star: confirmTarget==='all' ? t('starAll') : confirmTarget==='4'?t('star4'):confirmTarget==='5'?t('star5'):t('star6') })}
            </h3>
            <p className="text-sm opacity-80">
              {tfmt('confirmLoadDesc', { star: confirmTarget==='all' ? t('starAll') : confirmTarget==='4'?t('star4'):confirmTarget==='5'?t('star5'):t('star6') })}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={()=> setConfirmTarget(null)}
                className={`px-4 py-2 rounded border ${isDark?'bg-white/10 border-white/10':'bg-white border-slate-200'}`}
              >{t('cancel')}</button>
              <button
                onClick={()=> loadFromOps(confirmTarget)}
                className="px-4 py-2 rounded text-white shadow-lg disabled:opacity-60"
                disabled={loadingOps}
                style={{background:'linear-gradient(180deg,#e5e7eb,#cbd5e1)'}}
              >
                {loadingOps ? t('loading') : t('confirmYes')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <header className={`sticky top-0 z-30 backdrop-blur border-b ${isDark?'bg-slate-900/50 border-white/10':'bg-white/70 border-slate-200/70'}`} data-export-hide="true">
        <div className="mx-auto max-w-[1400px] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl shadow-lg relative overflow-hidden" style={{filter:'url(#goo)', background:isDark?'#3b82f6':'#60a5fa'}}><BubbleDots/></div>
            <h1 className="text-xl font-semibold tracking-tight">{t('title')}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <BlobButton onClick={addTier}>{t('addTier')}</BlobButton>
            <BlobButton onClick={()=> setShowResetModal(true)}>{t('reset')}</BlobButton>

            {/* Load buttons: 4,5,6,All */}
            <BlobButton onClick={()=> setConfirmTarget('4')} disabled={loadingOps}>
              {t('load4')}
            </BlobButton>
            <BlobButton onClick={()=> setConfirmTarget('5')} disabled={loadingOps}>
              {t('load5')}
            </BlobButton>
            <BlobButton onClick={()=> setConfirmTarget('6')} disabled={loadingOps}>
              {t('load6')}
            </BlobButton>
            <BlobButton onClick={()=> setConfirmTarget('all')} disabled={loadingOps}>
              {t('loadAll')}
            </BlobButton>
            {/* PNG Export */}
            <ExportPNG targetId="tierlist-capture" fileName="tierlist" scale={3} />


            {/* Name toggle */}
            <button
              type="button"
              onClick={()=> setShowNames(v=>!v)}
              className={`px-3 py-2 rounded border text-sm ${isDark?'bg-white/10 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
              title={t('nameShow')}
            >
              {showNames ? t('nameHide') : t('nameShow')}
            </button>

            {/* Language selector (hover-expand, close delay 0.1s) */}
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
              closeDelayMs={100}
            />
          </div>
        </div>
      </header>

      <main id="tierboard" className="relative z-10 mx-auto max-w-[1400px] px-4 py-6">
        {/* Upload */}
        <section className="mb-6">
          <div
            className={`rounded-2xl p-4 md:p-6 shadow-xl border ${isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'}` }
            onDragOver={e=>{e.preventDefault(); e.dataTransfer.dropEffect='copy';}}
            onDrop={e=>{ e.preventDefault(); const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')); if(files.length) addFilesAsItems(files); }}
          >
            <div className="flex flex-wrap gap-3 items-center">
              <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded border transition ${isDark?'bg-white/10 border-white/10 hover:bg-white/15':'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>파일 선택(복수)
                <input type="file" accept="image/*" multiple className="hidden" onChange={onSelectFiles}/>
              </label>
              <div className="grow"/>
              <input className={`px-3 py-2 rounded border w-44 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder={t('inputLabel')} value={newLabel} onChange={e=> setNewLabel(e.target.value)} />
              <input className={`px-3 py-2 rounded border w-56 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder={t('inputImg')} value={newImgUrl} onChange={e=> setNewImgUrl(e.target.value)} />
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
                  setItems(prev=> prev.map(it=> it.id===id? {...it, label:newName, nameMap:{en:newName,ko:newName,ja:newName,zh:newName}}: it))
                }}
                onDelete={()=>{ setItems(prev=> prev.filter(it=> it.id!==id)); setPool(prev=> prev.filter(x=> x!==id)); }}
              />
            ))}
          </div>
        </section>

        {/* Tiers */}
        <div id="tierlist-capture">
<section className="space-y-4">
          {tiers.map((tier,idx)=> (
            <div key={idx} className="relative group/tier">
              <div className="flex items-stretch gap-3">
                {/* Left tier label */}
                <div className="w-24 shrink-0 rounded-2xl shadow-lg overflow-visible border" style={{borderColor: isDark? 'rgba(255,255,255,0.1)':'#e5e7eb'}}>
                  <div className="relative h-full min-h-[64px] rounded-2xl overflow-visible grid place-items-center font-extrabold text-base text-slate-900 select-none" style={{ background:`linear-gradient(135deg, ${tier.color}, #ffffff)` }} onContextMenu={e=>{ e.preventDefault(); e.stopPropagation(); setOpenTierMenu(openTierMenu===idx? null: idx); }} onClick={e=> e.stopPropagation()}>
                    {editingTierIndex===idx ? (
                      <input autoFocus value={editingTierValue} onChange={e=> setEditingTierValue(e.target.value)} onBlur={commitEditTier} onKeyDown={e=> e.key==='Enter' && commitEditTier()} className="w-20 mx-1 rounded px-1 py-0.5 bg-white/80 text-slate-900 text-sm focus:outline-none"/>
                    ) : (
                      <button onClick={()=> startEditTier(idx)} title="Edit tier name" className="w-full h-full">{tier.name}</button>
                    )}
                    {openTierMenu===idx && (
                      <div className={`absolute top-16 right-1 z-[70] rounded border p-2 w-48 overflow-hidden ${isDark? 'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-xl`} onClick={e=> e.stopPropagation()}>
                        <label className="flex items-center justify-between text-sm mb-2">Color
                          <input type="color" value={tier.color} onChange={e=> setTierColor(idx, e.target.value)} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                        </label>
                        <button onClick={()=> startEditTier(idx)} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-black/5">Rename</button>
                        <button onClick={()=> { removeTier(idx); setOpenTierMenu(null); }} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-black/5 text-rose-500">Delete tier</button>
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
                  {tier.items.length===0 && !(dragData && hoverTierIndex===idx && isPointInsideTier(idx)) && (<div className={`rounded px-3 py-6 border-2 border-dashed ${isDark?'border-white/10 text-white/40':'border-slate-200 text-slate-400'} text-sm`}>{t('dragHere')}</div>)}
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
</div>
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
        @keyframes sparkle {
  0%   { transform: translate(0,0) scale(.6);  opacity: 1; }
  50%  { transform: translate(var(--dx), var(--dy)) scale(1.0); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1.15); opacity: 0; }
}
        @keyframes sparkle-move {
  0%   { transform: translate(0,0) scale(.70); opacity: 0.0; }
  10%  { opacity: 1; }
  60%  { transform: translate(var(--dx), var(--dy)) scale(1.02); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(1.12); opacity: 0; }
}

        @keyframes twinkle {
  0%,100% { opacity: .85; }
  50%     { opacity: 1;   }
}
.sparkle { position: fixed; width: 28px; height: 28px; pointer-events:none; background:transparent!important; animation:sparkle-move 1000ms ease-out forwards; }
.sparkle::before,.sparkle::after { content:none!important; } /* 네모/태양 제거 */
.sparkle-dust  { animation-duration: 900ms; }
.sparkle-flare { animation-duration: 1200ms; }  /* 플레어는 더 길게 */


/* SVG 내부의 원형먼지는 미세하게 반짝임(개별 delay는 inline) */
.sparkle-dust circle { animation: twinkle 480ms ease-in-out infinite; }

        @keyframes bubble { }
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

        /* Toasts */
        .toast { animation: toastIn .18s ease-out, toastOut .22s ease-in forwards; }
        .toast[data-life="short"] { animation-delay: 0s, 2.3s; }
        @keyframes toastIn { from { transform: translateY(-6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes toastOut { to { transform: translateY(-6px); opacity: 0 } }

        /* Sweep stroke animation */
        @keyframes sweep {
          from { stroke-dashoffset: 0; opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          to   { stroke-dashoffset: -100%; opacity: 0; }
        }
        .sweep-stroke { animation: sweep 700ms ease-out forwards; }

`}
</style>
    </div>
  );
}

/* --------- Components --------- */

function SweepGlow({ x, y, w, h, r }) {
  const id = React.useMemo(() => uid(), []);
  const len = (w + h) * 2;
  return (
    <svg className="fixed pointer-events-none" style={{ left: x, top: y, width: w, height: h }} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff8e1" stopOpacity="0"/>
          <stop offset="20%" stopColor="#fde047" stopOpacity="1"/>
          <stop offset="60%" stopColor="#f59e0b" stopOpacity=".8"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
        </linearGradient>
        <filter id={`fg-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width={w} height={h} rx={r} ry={r} fill="none" stroke={`url(#lg-${id})`} strokeWidth="3" pathLength={len} strokeDasharray={`${len/6} ${len}`} className="sweep-stroke" filter={`url(#fg-${id})`} style={{ mixBlendMode: "screen" }} />
    </svg>
  );
}

function addSweep(left, top, w, h, radius=12){
  setSweeps(prev => [...prev, { id: uid(), x:left, y:top, w, h, r: radius, createdAt: Date.now() }]);
}


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
        <div className={`absolute top-9 right-1 z-[80] rounded border p-2 w-48 overflow-hidden ${isDark?'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-2xl`} onClick={e=> e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2">
            <input className={`w-32 text-sm px-2 py-1 rounded border ${isDark?'bg-slate-800 border-white/10':'bg-white border-slate-200'}`} defaultValue={name} onKeyDown={e=>{ if(e.key==='Enter'){ const v=e.currentTarget.value.trim()||name; onRename&&onRename(v); setOpen(false);} }} />
            <button onClick={e=>{ const inp=e.currentTarget.parentElement?.querySelector('input'); const v=(inp?.value||'').trim()||name; onRename&&onRename(v); setOpen(false); }} className="text-sm px-2 py-1 rounded bg-emerald-500/90 text-white whitespace-nowrap">OK</button>
          </div>
          <button onClick={()=>{ onDelete&&onDelete(); setOpen(false); }} className="w-full text-left text-sm px-2 py-1 rounded hover:bg-black/5 text-rose-500">Delete</button>
        </div>
      )}

      <div className="item-img">
        {item.image
          ? <img src={item.image} alt={name} className="img-el" draggable={false} crossOrigin="anonymous" />
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
        {item.image ? <img src={item.image} alt="ghost" className="img-el" crossOrigin="anonymous" /> :
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

function Sparkle({ x, y, angle, dist, type='dust', size=2, delay=0, rotate=0, power=0 }) {
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist;

  const gid = React.useMemo(() => 'g_' + uid(), []);
  const fid = React.useMemo(() => 'f_' + uid(), []);

  return (
    <svg
      className={`sparkle ${type==='flare' ? 'sparkle-flare' : 'sparkle-dust'}`}
      style={{ left: x, top: y, "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${delay}ms` }}
      width="28" height="28" viewBox="0 0 28 28" aria-hidden
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="60%">
          <stop offset="0%"  stopColor="#fff8e1" stopOpacity="1"/>
          <stop offset="45%" stopColor="#fde047" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
        </radialGradient>
        <filter id={fid} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation={type==='flare' ? 1.6 : 1.2} result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {type === 'dust' ? (
        <g style={{ mixBlendMode: 'screen' }} filter={`url(#${fid})`}>
          <circle cx="14" cy="14" r={size} fill={`url(#${gid})`} opacity="0.92" />
        </g>
      ) : (
        <g style={{ mixBlendMode: 'screen' }} filter={`url(#${fid})`} transform={`rotate(${rotate} 14 14)`}>
          {/* 코어 */}
          <circle cx="14" cy="14" r={Math.max(2.2, size*0.35)} fill={`url(#${gid})`} opacity="0.95"/>
          {/* 별 본체 */}
          <polygon
            points={starPoints(14, 14, 5, size, size * 0.45)}
            fill={`url(#${gid})`}
            stroke="#fbbf24"
            strokeWidth="0.7"
            opacity="0.98"
          />
          {/* 렌즈 플레어 스틱들 (큰 플레어일수록 길이 증가) */}
          {(() => {
            const len = (power ? 11 : 7) + size * 0.5;
            const thin = power ? 1.6 : 1.2;
            return (
              <>
                <rect x={14-len/2} y={14-thin/2} width={len} height={thin} fill="#fde047" opacity="0.85" rx={thin/2}/>
                <rect x={14-thin/2} y={14-len/2} width={thin} height={len} fill="#fde047" opacity="0.85" rx={thin/2}/>
                <rect x={14-len/2} y={14-thin/2} width={len} height={thin} fill="#fde047" opacity="0.7" rx={thin/2}
                      transform="rotate(45 14 14)"/>
                <rect x={14-len/2} y={14-thin/2} width={len} height={thin} fill="#fde047" opacity="0.7" rx={thin/2}
                      transform="rotate(-45 14 14)"/>
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
}



/** Toast bubble */
function Toast({msg, type='info', isDark}){
  const tone = type==='success' ? (isDark?'bg-emerald-500/15 text-emerald-200 border-emerald-400/30':'bg-emerald-50 text-emerald-800 border-emerald-300')
             : type==='warn'    ? (isDark?'bg-amber-500/15 text-amber-200 border-amber-400/30':'bg-amber-50 text-amber-900 border-amber-300')
             : type==='error'   ? (isDark?'bg-rose-500/15 text-rose-200 border-rose-400/30':'bg-rose-50 text-rose-900 border-rose-300')
             :                    (isDark?'bg-white/10 text-white border-white/15':'bg-white text-slate-900 border-slate-200');
  return (
    <div className={`toast [animation-fill-mode:forwards]`} data-life="short">
      <div className={`min-w-[220px] max-w-[60vw] px-3 py-2 rounded border shadow-lg ${tone}`}>
        <div className="text-sm">{msg}</div>
      </div>
    </div>
  );
}

/** Button with optional spinner */
function BlobButton({children,onClick,disabled,loading}){
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center px-4 py-2 rounded font-semibold text-slate-900 shadow-lg active:scale-[0.98] transition select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      style={{ background:'linear-gradient(180deg,#e5e7eb,#cbd5e1)' }}
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
      className={`fixed ${posClass} z-[60] w-10 h-10 grid place-items-center rounded border shadow-lg active:scale-95 transition ${isDark?'bg-slate-800/80 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
// style 라인 제거(필요 시)

    >
      {isDark? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      )}
    </button>
  );
}

/** Hover-animated language picker (closeDelay adjustable) */
function LangPicker({lang,setLang,langs,flags,names,isDark,open,setOpen,label,closeDelayMs=100}){
  const ref = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
      timeoutRef.current = null;
    }, closeDelayMs);
  };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* anchor / compact button */}
      <button
        type="button"
        className={`px-3 py-2 rounded border text-sm flex items-center gap-2 ${isDark?'bg-white/10 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`}
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
              className={`px-3 py-2 rounded flex items-center gap-2 text-sm transition ${code===lang ? (isDark?'bg-white/10':'bg-slate-100') : (isDark?'hover:bg-white/10':'hover:bg-slate-100')}`}
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

function BubbleDots(){ return (<div className="absolute inset-0"></div>); }
function GooDefs(){ return (<svg width="0" height="0" style={{position:'absolute'}}><defs><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo"/><feBlend in="SourceGraphic" in2="goo"/></filter></defs></svg>); }

/* --------- Utils --------- */
function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function insertAt(arr,index,value){ const c=arr.slice(); c.splice(index,0,value); return c; }
function randomNiceColor(){ const palette=["#60a5fa","#38bdf8","#22d3ee","#34d399","#a78bfa","#f472b6","#fbbf24","#f97316","#ef4444"]; return palette[Math.floor(Math.random()*palette.length)]; }
// 5각 별 좌표 생성 (24x24 기준)
function starPoints(cx, cy, spikes = 5, outer = 9, inner = 4) {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  const pts = [];
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outer;
    let y = cy + Math.sin(rot) * outer;
    pts.push(`${x},${y}`);
    rot += step;
    x = cx + Math.cos(rot) * inner;
    y = cy + Math.sin(rot) * inner;
    pts.push(`${x},${y}`);
    rot += step;
  }
  return pts.join(' ');
}

export { TierListApp as App };
 
