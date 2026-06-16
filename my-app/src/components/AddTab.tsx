import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';

interface AddTabProps {
  user: any;
  onSuccess: () => void;
}

export default function AddTab({ user, onSuccess }: AddTabProps) {
  const [cafeName, setCafeName] = useState('');
  const [cafeTag, setCafeTag] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  
  // 🔍 検索用のステートを追加
  const [searchQuery, setSearchQuery] = useState('');

  // 📍 画面が開かれたときに「現在地」を取得する機能
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // 現在地が取得できたら、そこにピンを刺す！
          setSelectedLat(position.coords.latitude);
          setSelectedLng(position.coords.longitude);
        },
        (error) => {
          console.error("現在地取得エラー:", error);
          // ユーザーが位置情報を許可しなかった場合は何もしない（後でタップか検索してもらう）
        }
      );
    }
  }, []); // [] は「画面が開かれた最初の1回だけ実行する」という意味

  // 🔍 住所から緯度経度を検索する機能
  // 🔍 住所や「店名」から緯度経度を検索する機能
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      // 💡 &countrycodes=jp を追加して日本国内に限定し、検索精度を大幅にアップ！
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jp`);
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lon);
      } else {
        // 見つからなかった場合のアドバイスを親切にする
        alert('お店や場所が見つかりませんでした。\n「沖縄県 〇〇」のように地域名を足すか、住所で検索してみてください。');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      alert('検索中にエラーが発生しました。');
    }
  };

  const MapClickHandler = () => {
    useMapEvents({ click(e) { setSelectedLat(e.latlng.lat); setSelectedLng(e.latlng.lng); } });
    return null;
  };

  const MapUpdater = ({ lat, lng }: { lat: number | null, lng: number | null }) => {
    const map = useMap();
    useEffect(() => { if (lat !== null && lng !== null) map.flyTo([lat, lng], 16); }, [lat, lng, map]);
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleRegisterCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeName.trim()) return;
    if (selectedLat === null || selectedLng === null) {
      return alert('地図をタップするか検索して、カフェの場所を指定してください！');
    }

    try {
      let imageUrl = '';
      if (imageFile) {
        const fileName = `${Date.now()}_${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('cafe-images').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('cafe-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('cafes').insert([{
        name: cafeName, tag: cafeTag, user_name: user.user_metadata.display_name,
        user_id: user.id, image_url: imageUrl || null, latitude: selectedLat, longitude: selectedLng
      }]);

      if (error) throw error;
      
      alert("登録が完了しました！");
      onSuccess(); 

    } catch (error) {
      console.error("保存失敗:", error);
      alert("登録に失敗しました");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      <h3 style={{ margin: '0 0 5px 0', fontSize: '22px', fontWeight: 'bold' }}>お店情報の登録</h3>
      
      {/* 📝 入力フォーム全体（上から順に入力していく構成に変更） */}
      <form onSubmit={handleRegisterCafe} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>1. 店名 *</label>
          <input type="text" placeholder="カフェの名前を入力" value={cafeName} onChange={(e) => setCafeName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>2. カテゴリ *</label>
          <input type="text" placeholder="例：古民家カフェ、バーガー" value={cafeTag} onChange={(e) => setCafeTag(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>3. お店の写真</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%', padding: '5px 0' }} />
        </div>

        {/* 🗺️ 場所の指定（最後に配置） */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
            4. お店の場所を指定してください *
          </label>

          {/* 🔍 店名・住所検索バー */}
          <div style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
            <input
              type="text"
              placeholder="店名や住所で検索（例：ブルーシール 牧港本店）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
            />
            {/* ⚠️ 検索ボタンが間違えてフォームを送信しないように type="button" を指定 */}
            <button 
              type="button" 
              onClick={handleSearchLocation} 
              style={{ padding: '8px 15px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
            >
              🔍 検索
            </button>
          </div>

          <div style={{ height: '250px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc' }}>
            <MapContainer center={[26.48, 127.95]} zoom={9.3} minZoom={8} maxBounds={[[26.05, 127.55], [26.90, 128.35]]} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='© OpenStreetMap contributors © CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
              <MapClickHandler />
              <MapUpdater lat={selectedLat} lng={selectedLng} />
              {selectedLat && selectedLng && <Marker position={[selectedLat, selectedLng]}><Popup>ここにお店を登録します</Popup></Marker>}
            </MapContainer>
          </div>
          
          {selectedLat && selectedLng ? (
            <p style={{ fontSize: '13px', color: '#2e7d32', margin: '6px 0 0 0', fontWeight: 'bold' }}>📍 位置がセットされました！</p>
          ) : (
            <p style={{ fontSize: '13px', color: '#d32f2f', margin: '6px 0 0 0' }}>⚠️ まだ場所が選択されていません</p>
          )}
        </div>

        <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fee2d3', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          ✨ この内容でカフェを登録する
        </button>
      </form>
    </div>
  );
}