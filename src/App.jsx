import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// ==============================
// 1. 유틸리티 & 상수
// ==============================
const LANGS = { en: 'English', ko: '한국어', ja: '日本語', zh: '中文' };
const TRANSLATIONS = {
  ko: {
    title: "티어표 메이커",
    load: "{n}성 불러오기",
    reset: "초기화",
    addTier: "티어 추가",
    pool: "대기 목록",
    search: "이름 검색...",
    download: "이미지 저장",
    loading: "로딩 중...",
    confirmReset: "정말 초기화 하시겠습니까?",
  },
  en: {
    title: "Tier Maker",
    load: "Load {n}★",
    reset: "Reset",
    addTier: "Add Tier",
    pool: "Character Pool",
    search: "Search...",
    download: "Save Image",
    loading: "Loading...",
    confirmReset: "Are you sure you want to reset?",
  }
  // 필요 시 ja, zh 추가
};

const uid = () => Math.random().toString(36).substr(2, 9);
const t = (lang, key, vars = {}) => {
  let text = (TRANSLATIONS[lang] || TRANSLATIONS.en)[key] || key;
  Object.keys(vars).forEach(k => { text = text.replace(`{${k}}`, vars[k]); });
  return text;
};

// ==============================
// 2. 하위 컴포넌트
// ==============================

// 개별 캐릭터 카드
const ItemCard = React.memo(({ item, lang, onDragStart, className = "" }) => {
  const name = item.names[lang] || item.names.en;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      className={`relative group w-20 h-28 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 shadow-md bg-gray-800 cursor-grab active:cursor-grabbing transition-transform hover:scale-105 ${className}`}
      title={name}
    >
      <img 
        src={item.image} 
        alt={name} 
        className="w-full h-full object-cover" 
        loading="lazy"
        draggable={false}
      />
      <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-1 truncate px-1">
        {name}
      </div>
    </div>
  );
});

// 티어 행 (Row)
const TierRow = ({ tier, index, items, itemMap, lang, onDrop, onDragOver, onUpdateTier, onDeleteTier, moveTier }) => {
  const handleNameChange = (e) => onUpdateTier(index, { name: e.target.value });
  const handleColorChange = (e) => onUpdateTier(index, { color: e.target.value });

  return (
    <div className="flex mb-2 select-none group">
      {/* 티어 라벨 (색상 및 이름 변경) */}
      <div 
        className="w-24 flex flex-col items-center justify-center p-2 rounded-l-lg border-r border-black/10 relative"
        style={{ backgroundColor: tier.color }}
      >
        <input 
          value={tier.name} 
          onChange={handleNameChange}
          className="w-full bg-transparent text-center font-bold text-lg text-black/80 placeholder-black/50 outline-none" 
        />
        
        {/* 설정 컨트롤 (호버 시 표시) */}
        <div className="absolute left-0 -top-8 hidden group-hover:flex gap-1 bg-white p-1 rounded shadow-lg z-10">
           <input type="color" value={tier.color} onChange={handleColorChange} className="w-6 h-6 cursor-pointer" />
           <button onClick={() => onDeleteTier(index)} className="text-red-500 font-bold px-2">×</button>
           <div className="flex flex-col text-xs">
             <button onClick={() => moveTier(index, -1)}>▲</button>
             <button onClick={() => moveTier(index, 1)}>▼</button>
           </div>
        </div>
      </div>

      {/* 캐릭터 드롭 영역 */}
      <div 
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
        className={`flex-1 min-h-[120px] bg-black/20 p-2 flex flex-wrap gap-2 content-start rounded-r-lg border-2 border-dashed border-gray-600/30 transition-colors ${tier.isHovered ? 'bg-blue-500/10 border-blue-400' : ''}`}
      >
        {items.map(itemId => {
          const item = itemMap[itemId];
          if (!item) return null;
          return (
            <ItemCard 
              key={itemId} 
              item={item} 
              lang={lang} 
              onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id: itemId, fromTier: index }))} 
            />
          );
        })}
      </div>
    </div>
  );
};

// ==============================
// 3. 메인 앱 컴포넌트
// ==============================
export default function App() {
  // --- 상태 관리 ---
  const [lang, setLang] = useState('ko');
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // 데이터 상태
  const [itemMap, setItemMap] = useState({}); // ID -> Item Data
  const [pool, setPool] = useState([]); // 대기열 ID 목록
  const [tiers, setTiers] = useState([
    { name: 'S', color: '#ff7f7f', items: [] },
    { name: 'A', color: '#ffbf7f', items: [] },
    { name: 'B', color: '#ffdf7f', items: [] },
    { name: 'C', color: '#ffff7f', items: [] },
  ]);

  // 검색어 상태
  const [search, setSearch] = useState('');

  // --- API 호출 ---
  const fetchOperators = async (rarity) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ops?rarity=${rarity}`);
      const data = await res.json();
      
      const newItems = {};
      const newIds = [];
      
      data.forEach(op => {
        // 이미 존재하는 아이템은 건너뛰거나 업데이트
        if (!itemMap[op.id]) {
            newItems[op.id] = op;
            newIds.push(op.id);
        }
      });

      setItemMap(prev => ({ ...prev, ...newItems }));
      setPool(prev => [...prev, ...newIds]);
    } catch (err) {
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // --- 드래그 앤 드롭 핸들러 ---
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetTierIndex) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    
    const { id, fromTier } = JSON.parse(data);
    
    // 같은 위치면 무시
    if (fromTier === targetTierIndex) return;

    // 1. 기존 위치에서 제거
    if (fromTier === 'pool') {
      setPool(prev => prev.filter(pid => pid !== id));
    } else {
      setTiers(prev => prev.map((t, idx) => 
        idx === fromTier ? { ...t, items: t.items.filter(tid => tid !== id) } : t
      ));
    }

    // 2. 새 위치에 추가
    if (targetTierIndex === 'pool') {
      setPool(prev => [...prev, id]);
    } else {
      setTiers(prev => prev.map((t, idx) => 
        idx === targetTierIndex ? { ...t, items: [...t.items, id] } : t
      ));
    }
  };

  // --- 티어 관리 ---
  const addTier = () => {
    setTiers([...tiers, { name: 'New', color: '#cccccc', items: [] }]);
  };
  
  const updateTier = (index, newData) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, ...newData } : t));
  };

  const deleteTier = (index) => {
    if (!confirm("티어를 삭제하시겠습니까? 포함된 캐릭터는 대기열로 이동합니다.")) return;
    const itemsToReturn = tiers[index].items;
    setPool(prev => [...prev, ...itemsToReturn]);
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const moveTier = (index, direction) => {
    if (index + direction < 0 || index + direction >= tiers.length) return;
    const newTiers = [...tiers];
    const temp = newTiers[index];
    newTiers[index] = newTiers[index + direction];
    newTiers[index + direction] = temp;
    setTiers(newTiers);
  };

  const resetAll = () => {
    if (!confirm(t(lang, 'confirmReset'))) return;
    // 모든 티어의 아이템을 pool로 반환
    const allItems = tiers.flatMap(t => t.items);
    setPool(prev => [...prev, ...allItems]);
    setTiers(tiers.map(t => ({ ...t, items: [] })));
  };

  // --- 필터링된 Pool (검색) ---
  const filteredPool = useMemo(() => {
    if (!search) return pool;
    const lowerQ = search.toLowerCase();
    return pool.filter(id => {
        const item = itemMap[id];
        if (!item) return false;
        // 현재 언어 혹은 영어 이름으로 검색
        return (item.names[lang] || '').toLowerCase().includes(lowerQ) ||
               (item.names.en || '').toLowerCase().includes(lowerQ);
    });
  }, [pool, search, itemMap, lang]);

  return (
    <div className={`min-h-screen p-6 transition-colors ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* 상단 헤더 & 컨트롤 */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          🔹 {t(lang, 'title')}
        </h1>
        
        <div className="flex flex-wrap gap-2">
            {/* 언어 변경 */}
            <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent border border-gray-500 rounded px-2 py-1 text-sm"
            >
                {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            
            {/* 테마 토글 */}
            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded hover:bg-white/10">
                {isDark ? '☀️' : '🌙'}
            </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* 액션 버튼 그룹 */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-gray-800/50 backdrop-blur border border-white/10 shadow-lg">
          <div className="flex gap-2">
            {[4, 5, 6].map(star => (
              <button 
                key={star}
                onClick={() => fetchOperators(star)}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded font-medium shadow transition"
              >
                {t(lang, 'load', { n: star })}
              </button>
            ))}
          </div>
          <div className="h-8 w-[1px] bg-white/20 mx-2 hidden sm:block"></div>
          <button onClick={addTier} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow">{t(lang, 'addTier')}</button>
          <button onClick={resetAll} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded shadow">{t(lang, 'reset')}</button>
        </div>

        {/* 티어 보드 영역 */}
        <div className={`p-6 rounded-xl shadow-2xl mb-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`} id="tier-board">
            {tiers.map((tier, idx) => (
                <TierRow 
                    key={idx}
                    index={idx}
                    tier={tier}
                    items={tier.items}
                    itemMap={itemMap}
                    lang={lang}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onUpdateTier={updateTier}
                    onDeleteTier={deleteTier}
                    moveTier={moveTier}
                />
            ))}
        </div>

        {/* 캐릭터 풀 (대기 목록) */}
        <div className={`p-6 rounded-xl shadow-inner border-2 ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-200 border-gray-300'}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    📦 {t(lang, 'pool')} 
                    <span className="text-sm font-normal opacity-60">({pool.length})</span>
                </h2>
                <input 
                    type="text" 
                    placeholder={t(lang, 'search')} 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-transparent border-b border-gray-500 px-2 py-1 outline-none focus:border-indigo-500 transition"
                />
            </div>
            
            <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'pool')}
                className="flex flex-wrap gap-2 min-h-[150px] p-2"
            >
                {filteredPool.length === 0 && (
                    <div className="w-full text-center py-10 opacity-40">
                        {loading ? t(lang, 'loading') : "캐릭터를 불러오거나 검색 결과가 없습니다."}
                    </div>
                )}
                {filteredPool.map(id => (
                    <ItemCard 
                        key={id} 
                        item={itemMap[id]} 
                        lang={lang}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ id, fromTier: 'pool' }))} 
                    />
                ))}
            </div>
        </div>
      </main>
    </div>
  );
}
