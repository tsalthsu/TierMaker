import React, { useEffect, useMemo, useRef, useState } from "react";
/* @vite-ignore */
// Arknights Tier – Clean (rev: Stable InsertIndex v3)
// - Row grouping insert index (vertical move works on 2+ lines)
// - Nearest-row pick when y leaves band (prevents snap to end)
// - Keeps hover sticky with leave guards
// - FitText race guarded

export default function TierListApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('clean-tier-theme') || 'light');
  useEffect(() => { localStorage.setItem('clean-tier-theme', theme); }, [theme]);
  const isDark = theme === 'dark';

  const [items, setItems] = useState(() => [
    { id: uid(), label: "SilverAsh", image: "" },
    { id: uid(), label: "Ch'en", image: "" },
    { id: uid(), label: "Surtr", image: "" },
    { id: uid(), label: "Thorns", image: "" },
    { id: uid(), label: "Eyjafjalla", image: "" },
    { id: uid(), label: "Kal'tsit", image: "" },
  ]);
  const [pool, setPool] = useState(() => items.map(i=>i.id));
  const [tiers, setTiers] = useState(() => [
    { name: 'S', color: '#60a5fa', items: [] },
    { name: 'A', color: '#34d399', items: [] },
    { name: 'B', color: '#fbbf24', items: [] },
    { name: 'C', color: '#f97316', items: [] },
    { name: 'D', color: '#ef4444', items: [] },
  ]);

  const [dragData, setDragData] = useState(null);
  const [justPoppedId, setJustPoppedId] = useState(null);
  const [sparkles, setSparkles] = useState([]);
  useEffect(()=>{ const t=setInterval(()=> setSparkles(prev=> prev.filter(s=> Date.now()-s.createdAt<900)),300); return ()=> clearInterval(t); },[]);

  const overlayRef = useRef(null);
  const tierContainerRefs = useRef({});
  const cachedRectsRef = useRef({}); // { [tierIndex]: Rect[] }
  const rafRef = useRef(null);
  const pendingPosRef = useRef(null);
  const lastPosRef = useRef(null);

  const [openTierMenu, setOpenTierMenu] = useState(null);
  const [hoverTierIndex, setHoverTierIndex] = useState(null);
  const [hoverInsertIndex, setHoverInsertIndex] = useState(null);

  // global end handler
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

  // 바깥 클릭/ESC로 tier 메뉴 닫기
  useEffect(() => {
    const onDoc = () => setOpenTierMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') setOpenTierMenu(null); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // global dragover: 포인터 추적 + 어느 티어 안에 있는지
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

  useEffect(()=>{
    function onPaste(e){ const items=e.clipboardData?.items; if(!items) return; const files=[]; for(const it of items){ if(it.kind==='file'){ const f=it.getAsFile(); if(f && f.type.startsWith('image/')) files.push(f); } } if(files.length){ e.preventDefault(); addFilesAsItems(files);} }
    window.addEventListener('paste',onPaste); return ()=> window.removeEventListener('paste',onPaste);
  },[]);

  const itemById = useMemo(()=> Object.fromEntries(items.map(i=>[i.id,i])), [items]);

  // sanity checks
  useEffect(() => {
    try {
      console.assert(Array.isArray(tiers) && tiers.length >= 1, 'tiers initialized');
      console.assert(pool.length === items.length, 'pool equals items length initially');
      console.assert(clamp(5,0,3)===3 && clamp(-1,0,3)===0, 'clamp bounds');
      const a=[1,3]; const b=insertAt(a,1,2); console.assert(JSON.stringify(b)==='[1,2,3]' && a.length===2, 'insertAt');
      console.assert(typeof uid()==='string' && uid().length>=6, 'uid ok');
      console.assert(computeInsertIndex(null,0,0)===0, 'insertIndex safe');
    } catch {}
  }, []);

  function onDragStart(e,payload){
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed='move';
    setDragData(payload);
    cachedRectsRef.current = {}; // invalidate
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

  // ------- rect 수집 (w,h 포함) -------
  function getCardRects(container){
    if(!container) return [];
    const cards=[...container.querySelectorAll('[data-role="card"]')];
    return cards.map(el=>{
      const r=el.getBoundingClientRect();
      const id = el.dataset.id;
      return {id, cx:r.left+r.width/2, cy:r.top+r.height/2, left:r.left, right:r.right, top:r.top, bottom:r.bottom, w:r.width, h:r.height};
    });
  }

  // ------- 핵심: 행(row) 기반 삽입 인덱스 -------
function computeInsertIndex(container, x, y, excludeId){
  if(!container) return 0;
  const tierIndex = Number(container?.dataset?.tierIndex ?? -1);
  let rects = cachedRectsRef.current[tierIndex];
  if(!rects){ rects = getCardRects(container); cachedRectsRef.current[tierIndex]=rects; }
  if(!rects.length) return 0;

  // 같은 티어에서 끄는 카드 제외
  let list = excludeId ? rects.filter(r=> r.id !== excludeId) : rects.slice();
  if(!list.length) return 0;

  // 1) top → left로 정렬
  list.sort((a,b)=> (a.top===b.top ? a.left-b.left : a.top-b.top));

  // 2) "같은 행" 묶기: 기준은 같은 행의 top 평균과의 차이
  //    (이전 버전처럼 last.bottom 기준이 아니라 refTop(평균 top) 기준으로 묶어야 함)
  const avgH = list.reduce((s, r) => s + (r.h || 0), 0) / list.length || 100;
  const rowThresh = Math.max(avgH * 0.35, 28); // 같은 행으로 볼 y 허용 오차

  const rows = [];
  let refTop = null;
  for(const r of list){
    if(rows.length===0){
      rows.push({ items:[r], refTop: r.top, top:r.top, bottom:r.bottom });
      refTop = r.top;
      continue;
    }
    const cur = rows[rows.length-1];
    // 현재 행의 refTop(평균 top)과 비교해서 같은 행인지 판단
    const sameRow = Math.abs(r.top - cur.refTop) <= rowThresh;
    if(sameRow){
      cur.items.push(r);
      // refTop 갱신(부드럽게 평균)
      cur.refTop = (cur.refTop * (cur.items.length-1) + r.top) / cur.items.length;
      cur.top = Math.min(cur.top, r.top);
      cur.bottom = Math.max(cur.bottom, r.bottom);
    }else{
      rows.push({ items:[r], refTop: r.top, top:r.top, bottom:r.bottom });
    }
  }
  // 각 행 내부는 좌→우 정렬 보장
  rows.forEach(row=> row.items.sort((a,b)=> a.left-b.left));

  // 3) 포인터 y에 가장 가까운 행 선택(살짝 벗어나도 가장 가까운 행)
  let targetRowIndex = 0;
  let bestDist = Infinity;
  for(let i=0;i<rows.length;i++){
    const row = rows[i];
    const cy = (row.top + row.bottom) / 2;
    const d = Math.abs(y - cy);
    if(d < bestDist){ bestDist = d; targetRowIndex = i; }
  }
  const targetRow = rows[targetRowIndex];

  // 4) 선택된 행에서 x 기준으로 끼워넣을 위치 계산
  let within = targetRow.items.length;
  for(let i=0;i<targetRow.items.length;i++){
    if(x < targetRow.items[i].cx){ within = i; break; }
  }

  // 5) 앞선 행들의 아이템 수 + within = 절대 인덱스
  const before = rows.slice(0, targetRowIndex).reduce((s,row)=> s + row.items.length, 0);
  const absIndex = before + within;
  return clamp(absIndex, 0, list.length);
}


  // helper: 포인터가 티어 안에 있는지
  const isPointInsideTier = (tierIdx, margin=12) => {
    const p = lastPosRef.current; const el = tierContainerRefs.current[tierIdx];
    if(!p || !el) return false; const r = el.getBoundingClientRect();
    return p.x >= r.left - margin && p.x <= r.right + margin && p.y >= r.top - margin && p.y <= r.bottom + margin;
  }

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
  function addFilesAsItems(files){ const readers=files.map(file=> new Promise(res=>{ const r=new FileReader(); r.onload=()=> res({name:file.name.replace(/\.[^.]+$/, ''), dataUrl:r.result}); r.readAsDataURL(file); })); Promise.all(readers).then(list=>{ const created=list.map(({name,dataUrl})=> ({id:uid(), label:name, image:dataUrl})); setItems(prev=>[...prev,...created]); setPool(prev=>[...prev,...created.map(c=>c.id)]); }); }
  function addNewItem(label,image){ const id=uid(); const item={id, label:label||'새 아이템', image:image||newImgUrl||''}; setItems(p=>[...p,item]); setPool(p=>[...p,id]); setNewLabel(''); setNewImgUrl(''); }

  // ---- 6성 불러오기: /api/ops6 ----
  async function loadSixFromOps() {
    try {
      const r = await fetch('/api/ops6', { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('불러오기 실패');
      const raw = await r.json();

      const arr = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.result)
        ? raw.result
        : [];

      if (!arr.length) {
        alert('가져올 항목이 없습니다. (/api/ops6 응답 확인)');
        return;
      }

      const normalized = arr
        .map((x) => {
          if (x == null) return null;
          if (typeof x === 'string') return { label: x, image: '' };
          const label = x.label || x.name || x.appellation || x.en || x.kr || x.jp || '';
          const image = x.image || x.icon || x.img || x.url || x.src || '';
          if (!label) return null;
          return { label: String(label), image: String(image || '') };
        })
        .filter(Boolean);

      const existing = new Set(items.map((it) => it.label));
      const dedup = [];
      const seen = new Set();
      for (const it of normalized) {
        if (existing.has(it.label)) continue;
        if (seen.has(it.label)) continue;
        seen.add(it.label);
        dedup.push(it);
      }

      if (!dedup.length) {
        alert('새로 추가할 항목이 없습니다.');
        return;
      }

      const created = dedup.map(({ label, image }) => ({
        id: uid(),
        label,
        image,
      }));
      setItems((p) => [...p, ...created]);
      setPool((p) => [...p, ...created.map((c) => c.id)]);

      alert(`6★ ${created.length}개 추가됨`);
    } catch (e) {
      console.error(e);
      alert('불러오기에 실패했습니다. (/api/ops6 확인)');
    }
  }

  return (
    <div className={`${isDark?'text-white':'text-slate-900'} min-h-screen transition-colors duration-300 ${isDark?'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800':'bg-gradient-to-br from-slate-100 via-white to-slate-100'}`}>
      <GooDefs/>
      <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-50">{sparkles.map(s=> <Sparkle key={s.id} x={s.x} y={s.y} angle={s.angle} dist={s.dist}/> )}</div>
      <ThemeToggle isDark={isDark} onToggle={()=> setTheme(isDark?'light':'dark')} />

      <header className={`sticky top-0 z-30 backdrop-blur border-b ${isDark?'bg-slate-900/50 border-white/10':'bg-white/70 border-slate-200/70'}`}>
        <div className="mx-auto max-w-[1400px] px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl shadow-lg relative overflow-hidden" style={{filter:'url(#goo)', background:isDark?'#3b82f6':'#60a5fa'}}><BubbleDots/></div>
            <h1 className="text-xl font-semibold tracking-tight">Arknights Tier – Clean</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <BlobButton onClick={addTier}>티어 추가</BlobButton>
            <BlobButton onClick={()=> { setPool(items.map(i=>i.id)); setTiers(prev=> prev.map(t=>({...t,items:[]}))); }}>초기화</BlobButton>
            <BlobButton onClick={loadSixFromOps}>6성 불러오기</BlobButton>
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
              <input className={`px-3 py-2 rounded-xl border w-44 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder="라벨 (선택)" value={newLabel} onChange={e=> setNewLabel(e.target.value)} />
              <input className={`px-3 py-2 rounded-xl border w-56 focus:outline-none focus:ring-2 ${isDark ? 'bg-white/10 border-white/10 focus:ring-blue-400/70 text-white placeholder-white/70' : 'bg-white border-slate-200 focus:ring-sky-300 text-slate-900 placeholder-slate-400'}`} placeholder="이미지 URL (선택)" value={newImgUrl} onChange={e=> setNewImgUrl(e.target.value)} />
              <BlobButton onClick={()=> addNewItem(newLabel, newImgUrl)}>단일 추가</BlobButton>
            </div>
          </div>
        </section>

        {/* Pool */}
        <section className="mb-6">
          <div onDragOver={onDragOver} onDrop={onDropToPool} className="min-h-[112px] rounded-2xl p-3 flex flex-wrap gap-3 bg-transparent">
            {pool.map((id,index)=> (
              <DraggableItem key={id} item={itemById[id]} onDragStart={e=> onDragStart(e,{id, from:'pool'})} justPopped={justPoppedId===id} index={index} isDark={isDark} isDragging={dragData?.id===id} onRename={newName=> setItems(prev=> prev.map(it=> it.id===id? {...it,label:newName}: it))} onDelete={()=>{ setItems(prev=> prev.filter(it=> it.id!==id)); setPool(prev=> prev.filter(x=> x!==id)); }} />
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
                      <button onClick={()=> startEditTier(idx)} title="티어 이름 수정" className="w-full h-full">{tier.name}</button>
                    )}
                    {openTierMenu===idx && (
                      <div className={`absolute top-16 right-1 z-[70] rounded-xl border p-2 w-48 overflow-hidden ${isDark? 'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-xl`} onClick={e=> e.stopPropagation()}>
                        <label className="flex items-center justify-between text-sm mb-2">색 변경
                          <input type="color" value={tier.color} onChange={e=> setTierColor(idx, e.target.value)} className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer" />
                        </label>
                        <button onClick={()=> startEditTier(idx)} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5">이름 변경</button>
                        <button onClick={()=> { removeTier(idx); setOpenTierMenu(null); }} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5 text-rose-500">티어 삭제</button>
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
                  onDragLeave={()=>{ 
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
                  {tier.items.length===0 && !(dragData && hoverTierIndex===idx && isPointInsideTier(idx)) && (<div className={`rounded-xl px-3 py-6 border-2 border-dashed ${isDark?'border-white/10 text-white/40':'border-slate-200 text-slate-400'} text-sm`}>여기로 드래그해서 배치하세요.</div>)}
                  {(() => { 
                    const original = tier.items;
                    const filtered = (dragData && dragData.from && dragData.from.tierIndex===idx && hoverTierIndex===idx)
                      ? original.filter(x=> x!==dragData.id)
                      : original.slice();
                    const ghostAt = (dragData && hoverTierIndex===idx && isPointInsideTier(idx) && hoverInsertIndex!=null) ? Math.min(hoverInsertIndex, filtered.length) : null;
                    const out = [];
                    for(let i=0;i<filtered.length;i++){
                      if(ghostAt===i && dragData && itemById[dragData.id]) out.push(<GhostPreview key="__ghost" item={itemById[dragData.id]} isDark={isDark} />);
                      const id = filtered[i];
                      out.push(
                        <DraggableItem key={id} item={itemById[id]} index={i} onDragStart={e=> onDragStart(e,{id, from:{tierIndex:idx,index:i}})} justPopped={justPoppedId===id} isDark={isDark} isDragging={dragData?.id===id} onRename={newName=> setItems(prev=> prev.map(it=> it.id===id? {...it,label:newName}: it))} onDelete={()=>{ setItems(prev=> prev.filter(it=> it.id!==id)); setTiers(prev=> prev.map((t,i2)=> i2===idx? {...t,items:t.items.filter(x=> x!==id)}: t)); }} />
                      );
                    }
                    if(ghostAt===filtered.length && dragData && itemById[dragData.id]) out.push(<GhostPreview key="__ghost" item={itemById[dragData.id]} isDark={isDark} />);
                    return out;
                  })()}
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <style>{`
        .item-card { position: relative; width: 78px; height: 115px; border-radius: 12px; display: flex; flex-direction: column; overflow: visible; }
        .item-img { width: 100%; height: 78px; overflow: hidden; border-top-left-radius: 12px; border-top-right-radius: 12px; }
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
      `}</style>
    </div>
  );
}

function DraggableItem({ item, onDragStart, justPopped, index, isDark, onRename, onDelete, isDragging }){
  const ref = useRef(null);
  const [open,setOpen] = useState(false);
  useEffect(()=>{ const onDoc=e=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; const onKey=e=>{ if(e.key==='Escape') setOpen(false); }; document.addEventListener('click',onDoc); document.addEventListener('keydown',onKey); return ()=>{ document.removeEventListener('click',onDoc); document.removeEventListener('keydown',onKey); }; },[]);

  return (
    <div ref={ref} data-role="card" data-id={item.id} onContextMenu={e=>{ e.preventDefault(); setOpen(true); }} draggable onDragStart={e=>{ onDragStart&&onDragStart(e); const r=ref.current?.getBoundingClientRect(); if(r){ e.currentTarget.style.setProperty('--mx', `${e.clientX-r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY-r.top}px`);} }} className={`item-card group select-none border shadow-lg hover:-translate-y-0.5 transition transform ${justPopped?'animate-pop':''} ${isDark?'bg-slate-800/80 border-white/10':'bg-white/90 border-slate-200'} ${isDragging?'opacity-50':''}`}>
      {open && (
        <div className={`absolute top-9 right-1 z-[80] rounded-xl border p-2 w-48 overflow-hidden ${isDark?'bg-slate-900 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'} shadow-2xl`} onClick={e=> e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2">
            <input className={`w-32 text-sm px-2 py-1 rounded-lg border ${isDark?'bg-slate-800 border-white/10':'bg-white border-slate-200'}`} defaultValue={item.label} onKeyDown={e=>{ if(e.key==='Enter'){ const v=e.currentTarget.value.trim()||item.label; onRename&&onRename(v); setOpen(false);} }} />
            <button onClick={e=>{ const inp=e.currentTarget.parentElement?.querySelector('input'); const v=(inp?.value||'').trim()||item.label; onRename&&onRename(v); setOpen(false); }} className="text-sm px-2 py-1 rounded-lg bg-emerald-500/90 text-white whitespace-nowrap">확인</button>
          </div>
          <button onClick={()=>{ onDelete&&onDelete(); setOpen(false); }} className="w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-black/5 text-rose-500">아이템 삭제</button>
        </div>
      )}

      <div className="item-img">
        {item.image
          ? <img src={item.image} alt={item.label} className="img-el" draggable={false}/>
          : <div className={`${isDark?'bg-slate-700/70 text-white/70':'bg-slate-100 text-slate-400'} w-full h-full flex items-center justify-center text-xs`}>IMG</div>}
        </div>
      <div className={`item-name ${isDark? 'bg-slate-900/35 text-white':'bg-white/85 text-slate-900'}`}>
        <FitText text={item.label} maxFont={14} minFont={7} maxLines={1} />
      </div>
    </div>
  );
}

function GhostPreview({item,isDark}){
  if(!item) return null;
  return (
    <div className={`item-card ghost-card border-2 ${isDark?'bg-slate-800/50 border-white/20':'bg-white/60 border-slate-300/60'}`} data-role="card-ghost">
      <div className="item-img" style={{opacity:.6}}>{item.image? <img src={item.image} alt="ghost" className="img-el"/> : <div className={`${isDark?'bg-slate-700/60 text-white/50':'bg-slate-100 text-slate-400'} w-full h-full flex items-center justify-center text-xs`}>IMG</div>}</div>
      <div className={`item-name ${isDark? 'bg-slate-900/25 text-white/80':'bg-white/70 text-slate-800'}`} style={{opacity:.9}}>
        <FitText text={item.label} maxFont={14} minFont={7} maxLines={1} />
      </div>
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
function BlobButton({children,onClick}){ return (<button onClick={onClick} className="relative inline-flex items-center justify-center px-4 py-2 rounded-2xl font-semibold text-slate-900 shadow-lg active:scale-[0.98] transition select-none" style={{background:'linear-gradient(180deg,#93c5fd,#38bdf8)', filter:'url(#goo)'}}><span className="relative z-10">{children}</span><span className="absolute inset-0 overflow-hidden rounded-2xl"><span className="absolute w-8 h-8 bg-white/50 rounded-full left-2 top-2 animate-[bubble_2.4s_ease-in-out_infinite]"/><span className="absolute w-6 h-6 bg-white/40 rounded-full right-3 top-3 animate-[bubble_2s_.2s_ease-in-out_infinite]"/><span className="absolute w-7 h-7 bg-white/40 rounded-full left-3 bottom-3 animate-[bubble_2.2s_.1s_ease-in-out_infinite]"/></span></button>); }
function BubbleDots(){ return (<div className="absolute inset-0"><span className="absolute w-3 h-3 rounded-full bg-white/70 left-2 top-2 animate-[bubble_2.2s_ease-in-out_infinite]"/><span className="absolute w-2.5 h-2.5 rounded-full bg-white/60 right-2 top-3 animate-[bubble_2.4s_.1s_ease-in-out_infinite]"/><span className="absolute w-2 h-2 rounded-full bg-white/60 left-3 bottom-2 animate-[bubble_2s_.2s_ease-in-out_infinite]"/></div>); }
function ThemeToggle({isDark,onToggle}){ return (<button onClick={onToggle} title={isDark?'라이트 모드':'다크 모드'} className={`fixed top-3 right-3 z-[60] w-10 h-10 grid place-items-center rounded-2xl border shadow-lg active:scale-95 transition ${isDark?'bg-slate-800/80 border-white/10 text-white':'bg-white border-slate-200 text-slate-900'}`} style={{filter:'url(#goo)'}}>{isDark? (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>)}</button>); }
function GooDefs(){ return (<svg width="0" height="0" style={{position:'absolute'}}><defs><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="goo"/><feBlend in="SourceGraphic" in2="goo"/></filter></defs></svg>); }

function uid(){ return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function insertAt(arr,index,value){ const c=arr.slice(); c.splice(index,0,value); return c; }
function randomNiceColor(){ const palette=["#60a5fa","#38bdf8","#22d3ee","#34d399","#a78bfa","#f472b6","#fbbf24","#f97316","#ef4444"]; return palette[Math.floor(Math.random()*palette.length)]; }
export { TierListApp as App };
