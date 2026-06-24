import { useState } from 'react';
import type { Cafe } from '../App';
import CafeDetail from './CafeDetail';

interface ListTabProps {
  cafes: Cafe[];
  user: any;
  onUpdate: () => void;
}

export default function ListTab({ cafes, user, onUpdate }: ListTabProps) {
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);

  // 🌟 複数選択に対応するためのステート（配列で管理します）
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterUsers, setFilterUsers] = useState<string[]>([]);

  // 🌟 ドロップダウンを開閉するためのステート
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  const checkIsOpen = (cafe: Cafe) => {
    if (!cafe.open_time || !cafe.close_time) return null;
    const now = new Date();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
    if (cafe.regular_holidays && cafe.regular_holidays.includes(dayOfWeek)) return false;
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = cafe.open_time.split(':').map(Number);
    const [closeH, closeM] = cafe.close_time.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    if (openTime <= closeTime) return currentTime >= openTime && currentTime <= closeTime;
    return currentTime >= openTime || currentTime <= closeTime;
  };

  const allCategories = Array.from(new Set(cafes.flatMap(c => c.tag ? c.tag.split(', ') : []))).filter(Boolean);
  const allUsers = Array.from(new Set(cafes.map(c => c.user_name))).filter(Boolean);

  // 🌟 フィルター処理（複数選択のOR検索に対応）
  const filteredCafes = cafes.filter(cafe => {
    // 1. 営業中
    if (filterOpenNow && checkIsOpen(cafe) !== true) return false;

    // 2. カテゴリ（選んだカテゴリの「いずれか」を含んでいればOK）
    if (filterCategories.length > 0) {
      const cafeTags = cafe.tag ? cafe.tag.split(', ') : [];
      const hasMatch = filterCategories.some(cat => cafeTags.includes(cat));
      if (!hasMatch) return false;
    }

    // 3. ユーザー（選んだユーザーの「いずれか」に合致すればOK）
    if (filterUsers.length > 0) {
      if (!filterUsers.includes(cafe.user_name)) return false;
    }

    return true;
  });

  if (selectedCafe) {
    return <CafeDetail cafe={selectedCafe} user={user} onBack={() => setSelectedCafe(null)} onUpdate={onUpdate} />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* 🌟 絞り込みボタンエリア */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', whiteSpace: 'nowrap', color: '#666', fontWeight: 'bold' }}>絞り込み:</span>

        {/* 営業中 */}
        <button
          onClick={() => setFilterOpenNow(!filterOpenNow)}
          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', border: '1px solid #8bc34a', cursor: 'pointer', background: filterOpenNow ? '#8bc34a' : '#fff', color: filterOpenNow ? '#fff' : '#8bc34a' }}
        >
          {filterOpenNow ? '✅ 営業中' : '🕒 営業中'}
        </button>

        {/* カテゴリ複数選択 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsUserOpen(false); }}
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', border: '1px solid #8bc34a', cursor: 'pointer', background: filterCategories.length > 0 ? '#e8f5e9' : '#fff', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            🏷️ カテゴリ {filterCategories.length > 0 && `(${filterCategories.length})`} ▼
          </button>
          {isCategoryOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '5px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', zIndex: 100, width: '200px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
              {allCategories.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 5px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                  <input
                    type="checkbox"
                    checked={filterCategories.includes(cat)}
                    onChange={() => setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    style={{ width: '16px', height: '16px', accentColor: '#8bc34a' }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ユーザー複数選択 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setIsUserOpen(!isUserOpen); setIsCategoryOpen(false); }}
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', border: '1px solid #8bc34a', cursor: 'pointer', background: filterUsers.length > 0 ? '#e8f5e9' : '#fff', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            👤 ユーザー {filterUsers.length > 0 && `(${filterUsers.length})`} ▼
          </button>
          {isUserOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', zIndex: 1000, width: '200px', maxWidth: '80vw', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>              {allUsers.map(u => (
              <label key={u} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 5px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="checkbox"
                  checked={filterUsers.includes(u)}
                  onChange={() => setFilterUsers(prev => prev.includes(u) ? prev.filter(user => user !== u) : [...prev, u])}
                  style={{ width: '16px', height: '16px', accentColor: '#8bc34a' }}
                />
                <span style={{ fontSize: '14px', color: '#333' }}>{u}</span>
              </label>
            ))}
            </div>
          )}
        </div>
      </div>

      {/* 以下はリストの描画（変更なし） */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '20px' }} onClick={() => { setIsCategoryOpen(false); setIsUserOpen(false); }}>

        {filteredCafes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
            <p>条件に合うお店が見つかりませんでした。</p>
          </div>
        )}

        {filteredCafes.map(cafe => {
          const isOpen = checkIsOpen(cafe);
          const tags = cafe.tag ? cafe.tag.split(', ') : [];
          const images = cafe.image_url ? cafe.image_url.split(',') : [];

          return (
            <div key={cafe.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px 15px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ textAlign: 'left', margin: '0 0 5px 0', fontSize: '16px' }}>{cafe.name}</h3>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                {isOpen === true && <span style={{ padding: '0px 8px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>営業中</span>}
                {isOpen === false && <span style={{ padding: '0px 8px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #c62828', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>営業時間外</span>}
                {tags.map((t, idx) => <span key={idx} style={{ padding: '0px 8px', border: '1px solid #333', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>{t}</span>)}
              </div>

              {images.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '8px' }}>
                  {images.map((url, idx) => <img key={idx} src={url} alt="写真" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid #eee' }} />)}
                </div>
              )}

              <button
                onClick={() => setSelectedCafe(cafe)}
                style={{ width: '100%', padding: '7px', backgroundColor: '#f1f8e9', border: '1px solid #81c784', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#33691e', fontSize: '14px' }}
              >詳細を見る</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}