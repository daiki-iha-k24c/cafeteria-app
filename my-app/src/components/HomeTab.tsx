import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { Cafe } from '../App';
import CafeDetail from './CafeDetail';

interface HomeTabProps {
  cafes: Cafe[];
  user: any;
  onUpdate: () => void;
}

export default function HomeTab({ cafes, user, onUpdate }: HomeTabProps) {
  const [popupCafe, setPopupCafe] = useState<Cafe | null>(null);
  const [detailCafe, setDetailCafe] = useState<Cafe | null>(null);

  // 🌟 複数選択ステート
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterUsers, setFilterUsers] = useState<string[]>([]);

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

  const filteredCafes = cafes.filter(cafe => {
    if (filterOpenNow && checkIsOpen(cafe) !== true) return false;
    if (filterCategories.length > 0) {
      const cafeTags = cafe.tag ? cafe.tag.split(', ') : [];
      const hasMatch = filterCategories.some(cat => cafeTags.includes(cat));
      if (!hasMatch) return false;
    }
    if (filterUsers.length > 0) {
      if (!filterUsers.includes(cafe.user_name)) return false;
    }
    return true;
  });

  if (detailCafe) {
    return <CafeDetail cafe={detailCafe} user={user} onBack={() => setDetailCafe(null)} onUpdate={onUpdate} />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* 🌟 絞り込みボタンエリア */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', whiteSpace: 'nowrap', color: '#666', fontWeight: 'bold' }}>絞り込み:</span>

        <button
          onClick={() => { setFilterOpenNow(!filterOpenNow); setPopupCafe(null); }}
          style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', border: '1px solid #8bc34a', cursor: 'pointer', background: filterOpenNow ? '#8bc34a' : '#fff', color: filterOpenNow ? '#fff' : '#8bc34a' }}
        >
          {filterOpenNow ? '✅ 営業中' : '🕒 営業中'}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setIsCategoryOpen(!isCategoryOpen); setIsUserOpen(false); }}
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold', border: '1px solid #8bc34a', cursor: 'pointer', background: filterCategories.length > 0 ? '#e8f5e9' : '#fff', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            🏷️ カテゴリ {filterCategories.length > 0 && `(${filterCategories.length})`} ▼
          </button>
          {isCategoryOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '5px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px', zIndex: 1000, width: '200px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', maxHeight: '200px', overflowY: 'auto' }}>
              {allCategories.map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 5px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                  <input
                    type="checkbox"
                    checked={filterCategories.includes(cat)}
                    onChange={() => {
                      setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
                      setPopupCafe(null);
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#8bc34a' }}
                  />
                  <span style={{ fontSize: '14px', color: '#333' }}>{cat}</span>
                </label>
              ))}
            </div>
          )}
        </div>

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
                  onChange={() => {
                    setFilterUsers(prev => prev.includes(u) ? prev.filter(user => user !== u) : [...prev, u]);
                    setPopupCafe(null);
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#8bc34a' }}
                />
                <span style={{ fontSize: '14px', color: '#333' }}>{u}</span>
              </label>
            ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc', position: 'relative' }} onClick={() => { setIsCategoryOpen(false); setIsUserOpen(false); }}>
        <MapContainer center={[26.48, 127.95]} zoom={9.3} minZoom={9.3} maxBounds={[[26.05, 127.55], [26.90, 128.35]]} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='© OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />

          {filteredCafes.map((cafe) => {
            if (cafe.latitude && cafe.longitude) {
              return (
                <Marker key={cafe.id} position={[cafe.latitude, cafe.longitude]} eventHandlers={{ click: () => setPopupCafe(cafe) }} />
              );
            }
            return null;
          })}
        </MapContainer>

        {/* ... (ポップアップ部分は今まで通り) ... */}
        {popupCafe && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px 15px', width: '100%', maxWidth: '300px', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              <button onClick={() => setPopupCafe(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666', zIndex: 10 }}>✖</button>
              {(() => {
                const isOpen = checkIsOpen(popupCafe);
                const tags = popupCafe.tag ? popupCafe.tag.split(', ') : [];
                const images = popupCafe.image_url ? popupCafe.image_url.split(',') : [];

                return (
                  <>
                    <h3 style={{ textAlign: 'left', margin: '0 0 5px 0', fontSize: '16px', paddingRight: '20px' }}>{popupCafe.name}</h3>
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
                      onClick={() => { setDetailCafe(popupCafe); setPopupCafe(null); }}
                      style={{ width: '100%', padding: '7px', backgroundColor: '#f1f8e9', border: '1px solid #81c784', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', color: '#33691e', fontSize: '14px' }}
                    >詳細を見る</button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}