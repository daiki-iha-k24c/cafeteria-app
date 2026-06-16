import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
// 👇 useMap を新しく追加
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Cafe {
  id: number;
  name: string;
  tag: string;
  user_name: string;
  user_id: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // 📱 タブ切り替え用のステート ('list' | 'home' | 'add')
  const [activeTab, setActiveTab] = useState<'list' | 'home' | 'add'>('home');

  const [cafeName, setCafeName] = useState('');
  const [cafeTag, setCafeTag] = useState('ドリンク');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);

  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  
  // 🔍 検索用のステートを追加
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('ドリンク');

  useEffect(() => {
    checkUser();
    fetchCafes();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchCafes = async () => {
    const { data, error } = await supabase
      .from('cafes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('取得エラー:', error);
    else setCafes(data || []);
  };

  const getDummyEmail = (name: string) => `${name}@dummy-cafeteria.com`;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('ユーザー名とパスワードを入力してください');
    const dummyEmail = getDummyEmail(usernameInput);
    const { error } = await supabase.auth.signUp({
      email: dummyEmail,
      password: passwordInput,
      options: { data: { display_name: usernameInput } }
    });
    if (error) alert('登録エラー: ' + error.message);
    else checkUser();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('ユーザー名とパスワードを入力してください');
    const dummyEmail = getDummyEmail(usernameInput);
    const { error } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: passwordInput,
    });
    if (error) alert('ログインエラー: ユーザー名かパスワードが違います');
    else checkUser();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // 🗺️ 手動クリック用のコンポーネント
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        setSelectedLat(e.latlng.lat);
        setSelectedLng(e.latlng.lng);
      },
    });
    return null;
  };

  // 🗺️ 検索されたときに地図の視点をアニメーションで移動させるコンポーネント
  const MapUpdater = ({ lat, lng }: { lat: number | null, lng: number | null }) => {
    const map = useMap();
    useEffect(() => {
      if (lat !== null && lng !== null) {
        map.flyTo([lat, lng], 16); // 16はズームレベル（拡大具合）
      }
    }, [lat, lng, map]);
    return null;
  };

  // 🔍 住所や店名から緯度・経度を検索する関数
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // 無料のOpenStreetMap検索APIを呼び出し
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        // 一番最初に見つかった結果の緯度・経度をセット
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lon);
      } else {
        alert('場所が見つかりませんでした。別のキーワードや住所の番地を試してください。');
      }
    } catch (error) {
      console.error('検索エラー:', error);
      alert('検索中にエラーが発生しました。');
    }
  };

  const handleAddCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeName.trim()) return;
    if (selectedLat === null || selectedLng === null) {
      return alert('地図をクリックするか検索して、カフェの場所を指定してください！');
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
        name: cafeName,
        tag: cafeTag,
        user_name: user.user_metadata.display_name,
        user_id: user.id,
        image_url: imageUrl || null,
        latitude: selectedLat,
        longitude: selectedLng
      }]);

      if (error) throw error;

      setCafeName('');
      setImageFile(null);
      setSelectedLat(null);
      setSelectedLng(null);
      setSearchQuery(''); // 検索窓も空にする
      const fileInput = document.getElementById('cafe-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchCafes();
    } catch (error) {
      console.error("保存失敗:", error);
      alert("登録に失敗しました");
    }
  };

  const handleDeleteCafe = async (id: number) => {
    if (!window.confirm("本当にこのカフェを削除しますか？")) return;
    const { error } = await supabase.from('cafes').delete().eq('id', id);
    if (!error) fetchCafes();
  };

  const startEdit = (cafe: Cafe) => {
    setEditingId(cafe.id);
    setEditName(cafe.name);
    setEditTag(cafe.tag);
  };

  const handleUpdateCafe = async (id: number) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('cafes').update({
      name: editName,
      tag: editTag
    }).eq('id', id);

    if (error) console.error("更新失敗:", error);
    else {
      setEditingId(null);
      fetchCafes();
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0 }}>
      
      {/* 📱 ヘッダー部分 */}
      <header style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🍔🥤</div>
        {user ? (
          <div style={{ fontSize: '12px' }}>
            ({user.user_metadata?.display_name}) でログイン中
            <button onClick={handleLogout} style={{ marginLeft: '10px', padding: '2px 5px', fontSize: '10px' }}>ログアウト</button>
          </div>
        ) : (
          <div style={{ fontSize: '12px' }}>未ログイン</div>
        )}
      </header>

      {/* 📱 メインコンテンツ部分（ここがタブで切り替わる） */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f9f9f9' }}>
        {!user ? (
          // ▼ 未ログイン時：ログイン画面
          <div className="login-screen">
            <h3>ログイン / 新規登録</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
              <input type="text" placeholder="ユーザー名（例：daiki）" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
              <input type="password" placeholder="パスワード（6文字以上）" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleLogin} type="button" style={{ flex: 1 }}>ログイン</button>
                <button onClick={handleSignUp} type="button" style={{ flex: 1 }}>新規登録</button>
              </div>
            </form>
          </div>
        ) : (
          // ▼ ログイン済み：タブに応じて表示を切り替え
          <>
            {/* 🏠 ホーム（地図）タブ */}
            {activeTab === 'home' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '12px', alignSelf: 'center' }}>絞り込み</span>
                  <button style={{ fontSize: '12px', padding: '2px 5px' }}>営業時間内</button>
                  <button style={{ fontSize: '12px', padding: '2px 5px' }}>カテゴリ▼</button>
                  <button style={{ fontSize: '12px', padding: '2px 5px' }}>ユーザー▼</button>
                </div>
                <div style={{ flex: 1, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc' }}>
                  {/* ここに以前の <MapContainer> のコードがそのまま入ります */}
                  <MapContainer 
                    center={[26.48, 127.95]} 
                    zoom={9}                    
                    minZoom={9}
                    maxBounds={[[26.05, 127.55], [26.90, 128.35]]}
                    maxBoundsViscosity={1.0}     
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
                    />
                    
                    <MapClickHandler />
                    <MapUpdater lat={selectedLat} lng={selectedLng} />

                    {selectedLat && selectedLng && (
                      <Marker position={[selectedLat, selectedLng]}>
                        <Popup>ここにカフェを登録します</Popup>
                      </Marker>
                    )}

                    {cafes.map((cafe) => {
                      if (cafe.latitude && cafe.longitude) {
                        return (
                          <Marker key={cafe.id} position={[cafe.latitude, cafe.longitude]}>
                            <Popup>
                              <div style={{ maxWidth: '200px' }}>
                                <strong style={{ fontSize: '16px' }}>{cafe.name}</strong>
                                <p style={{ margin: '5px 0', color: '#777' }}>🏷️ {cafe.tag}</p>
                                {cafe.image_url && (
                                  <img src={cafe.image_url} alt={cafe.name} style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                )}
                                <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#999' }}>投稿者: {cafe.user_name}</p>
                                <div style={{ marginTop: '10px' }}>
                                  <a href={`https://www.google.com/maps/dir/?api=1&destination=$${cafe.latitude},${cafe.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '5px 10px', backgroundColor: '#4285F4', color: 'white', textDecoration: 'none', borderRadius: '5px', fontSize: '12px' }}>
                                    🗺️ 経路
                                  </a>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      }
                      return null;
                    })}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* 📄 一覧タブ */}
            {activeTab === 'list' && (
              <div>
                <h3>店一覧</h3>
                {/* ここは以前の「みんなが登録したカフェ一覧」のコードが入ります */}
                <p>（ここに一覧が表示されます）</p>
              </div>
            )}

            {/* ➕ 登録タブ */}
            {activeTab === 'add' && (
              <div>
                <h3>新しくカフェを登録する</h3>
                {/* ここは以前のフォームのコードが入ります */}
                <p>（ここに登録フォームが表示されます）</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* 📱 フッター部分（ナビゲーションバー） */}
      {user && (
        <footer style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          padding: '5px', 
          borderTop: '1px solid #ccc', 
          backgroundColor: '#ffffff' // 👈 フッター全体の背景を「白」に変更
        }}>
          {/* 📄 一覧ボタン */}
          <button 
            onClick={() => setActiveTab('list')} 
            style={{ 
              backgroundColor: activeTab === 'list' ? '#fee2d3' : 'transparent', // アクティブならオレンジ、違うなら透明
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer', 
              padding: '4px 24px', // 👈 アイコンの周りに余白を持たせる
              borderRadius: '12px', // 👈 背景を角丸にする
              opacity: activeTab === 'list' ? 1 : 0.6, // アクティブじゃない時は少し薄くする
              transition: 'all 0.2s ease-in-out' // ふわっと切り替わるアニメーション
            }}
          >
            📄
          </button>

          {/* 🏠 ホームボタン */}
          <button 
            onClick={() => setActiveTab('home')} 
            style={{ 
              backgroundColor: activeTab === 'home' ? '#fee2d3' : 'transparent',
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer', 
              padding: '4px 24px',
              borderRadius: '12px',
              opacity: activeTab === 'home' ? 1 : 0.6,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            🏠
          </button>

          {/* ➕ 登録ボタン */}
          <button 
            onClick={() => setActiveTab('add')} 
            style={{ 
              backgroundColor: activeTab === 'add' ? '#fee2d3' : 'transparent',
              border: 'none', 
              fontSize: '24px', 
              cursor: 'pointer', 
              padding: '4px 24px',
              borderRadius: '12px',
              opacity: activeTab === 'add' ? 1 : 0.6,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            ➕
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;