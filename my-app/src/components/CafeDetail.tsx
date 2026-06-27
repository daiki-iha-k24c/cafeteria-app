import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import type { Cafe } from '../App';
import EditCafe from './EditCafe';

interface CafeDetailProps {
  cafe: Cafe;
  user: any;
  onBack: () => void;
  onUpdate: () => void;
}

export default function CafeDetail({ cafe, user, onBack, onUpdate }: CafeDetailProps) {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  
  // 🌟 追加：削除確認ポップアップを開くかどうかのステート
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (cafe.latitude && cafe.longitude) {
      setAddress('住所を取得中...');
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${cafe.latitude}&lon=${cafe.longitude}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            const cleanAddress = data.display_name
              .split(', ').reverse().join('')
              .replace(/日本/g, '').replace(/〒?\d{3}-\d{4}/g, '').trim();
            setAddress(cleanAddress);
          } else {
            setAddress('住所を自動取得できませんでした');
          }
        })
        .catch(() => {
          setAddress('住所取得エラー');
        });
    } else {
      setAddress('位置情報が登録されていません');
    }
  }, [cafe]);

  const checkIsOpen = (c: Cafe) => {
    if (!c.open_time || !c.close_time) return null;
    const now = new Date();
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
    if (c.regular_holidays && c.regular_holidays.includes(dayOfWeek)) return false; 
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = c.open_time.split(':').map(Number);
    const [closeH, closeM] = c.close_time.split(':').map(Number);
    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;
    if (openTime <= closeTime) return currentTime >= openTime && currentTime <= closeTime;
    return currentTime >= openTime || currentTime <= closeTime;
  };

  const isOpen = checkIsOpen(cafe);
  const tags = cafe.tag ? cafe.tag.split(', ') : [];

  // 🚨 修正：重複していた const images の定義を1つにまとめました
  const getImages = (urlStr: string | null): string[] => {
    if (!urlStr) return [];
    return urlStr.split(',').map(url => url.trim()).filter(url => url.length > 0);
  };
  const images = getImages(cafe.image_url);

  // 🚨 修正：7{cafe.latitude} を ${cafe.latitude} に直し、公式の経路案内URLに変更しました
  const handleOpenGoogleMap = () => {
    if (cafe.latitude && cafe.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${cafe.latitude},${cafe.longitude}`;
      window.open(url, '_blank');
    }
  };

  // 削除ボタンが押された時の実際の処理
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('cafes')
        .delete()
        .eq('id', cafe.id);

      if (error) throw error;

      alert('お店を削除しました。');
      setShowDeleteConfirm(false); 
      onUpdate?.();                  
      onBack?.();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました。');
    }
  };

  // ==========================================
  // 🌟 編集モードの場合の表示
  // ==========================================
  if (isEditing) {
    return (
      <EditCafe 
        cafe={cafe} 
        user={user} 
        onCancel={() => setIsEditing(false)} 
        onSuccess={() => {
          setIsEditing(false);
          onUpdate();
        }} 
      />
    );
  }
  

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', textAlign: 'left' }}>
      
      <div style={{ padding: '10px 10px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #1565c0', borderRadius: '4px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← 一覧に戻る
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
        
        <div>
          <h2 style={{ textAlign: 'left', margin: '0 0 10px 0', fontSize: '20px' }}>{cafe.name}</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isOpen === true && <span style={{ padding: '0px 8px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>営業中</span>}
            {isOpen === false && <span style={{ padding: '0px 8px', backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #c62828', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>営業時間外</span>}
            {tags.map((t, idx) => <span key={idx} style={{ padding: '0px 8px', border: '1px solid #555', borderRadius: '4px', fontSize: '13px' }}>{t}</span>)}
          </div>
        </div>

        <div style={{ backgroundColor: '#f4fff9', padding: '10px 5px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex' }}><span style={{ width: '100px', padding: '0px 0px 0px 8px', fontWeight: 'bold', color: '#555' }}>営業時間</span><span>{cafe.open_time && cafe.close_time ? `${cafe.open_time} 〜 ${cafe.close_time}` : '未登録'}</span></div>
          <div style={{ display: 'flex', borderTop: '1px solid #eee', paddingTop: '10px' }}><span style={{ width: '100px', padding: '0px 0px 0px 8px', fontWeight: 'bold', color: '#555' }}>定休日</span><span>{cafe.regular_holidays || '未登録'}</span></div>
          <div style={{ display: 'flex', borderTop: '1px solid #eee', paddingTop: '10px' }}><span style={{ width: '100px', padding: '0px 0px 0px 8px', fontWeight: 'bold', color: '#555' }}>投稿者</span><span>{cafe.user_name}</span></div>
        </div>

        {images.length > 0 && (
          <div>
            <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', scrollSnapType: 'x mandatory' }}>
              {images.map((url, idx) => (
                <img key={idx} src={url} alt="写真" onClick={() => setFullScreenImage(url)} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid #eee', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        )}

        {cafe.latitude && cafe.longitude && (
          <div style={{ backgroundColor: '#f4fff9', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex' }}><span style={{ width: '100px', padding: '0px 0px 0px 8px', fontWeight: 'bold', color: '#555' }}>住所</span><span style={{ textAlign: 'left', padding: '0px 0px 0px 12px' }}>{address}</span></div>
            <div style={{ height: '150px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc', marginBottom: '15px' }}>
              <MapContainer center={[cafe.latitude, cafe.longitude]} zoom={13} zoomControl={false} dragging={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
                <Marker position={[cafe.latitude, cafe.longitude]} />
              </MapContainer>
            </div>
            {/* 🚨 修正：14{cafe.latitude} を ${cafe.latitude} に直し、正しい経路案内URLにしました */}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${cafe.latitude},${cafe.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '5px solid #99ccff', textAlign: 'center', padding: '8px', backgroundColor: '#fff', color: '#4285F4', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Googleマップで経路案内</a>
          </div>
        )}

        {/* 自分が投稿したお店の場合のみボタンを表示 */}
        {user && user.id === cafe.user_id && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '15px', borderTop: '2px dashed #ccc' }}>
            <button onClick={() => setIsEditing(true)} style={{ flex: 1, padding: '12px', backgroundColor: '#fff', border: '2px solid #1565c0', color: '#1565c0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✏️ 編集する</button>            
            <button onClick={() => setShowDeleteConfirm(true)} style={{ flex: 1, padding: '12px', backgroundColor: '#ffebee', border: '2px solid #c62828', color: '#c62828', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🗑️ 削除する</button>
          </div>
        )}
      </div>

      {/* 写真の拡大表示用モーダル */}
      {fullScreenImage && (
        <div onClick={() => setFullScreenImage(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', cursor: 'zoom-out' }}>
          <button onClick={() => setFullScreenImage(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '24px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✖</button>
          <img src={fullScreenImage} alt="拡大写真" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }} />
        </div>
      )}

      {/* 🌟 カスタム削除確認モーダル */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '300px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗑️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>お店の削除</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              本当にこのお店を削除しますか？<br/>この操作は取り消せません。
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}>
                キャンセル
              </button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                削除する
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}