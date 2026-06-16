import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import L from 'leaflet';
import './App.css';

// 作成した3つのコンポーネントを読み込む
import HomeTab from './components/HomeTab';
import AddTab from './components/AddTab';
import ListTab from './components/ListTab';

// 🗺️ 地図のアイコン設定（これは全体で必要）
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// 💡 ほかのファイルでも使えるように export する
export interface Cafe {
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
  // アプリ全体のステート（誰がログインしてるか、データ、どのタブを開いてるか）
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'home' | 'add'>('home');
  const [cafes, setCafes] = useState<Cafe[]>([]);

  useEffect(() => { checkUser(); fetchCafes(); }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchCafes = async () => {
    const { data, error } = await supabase.from('cafes').select('*').order('created_at', { ascending: false });
    if (error) console.error('取得エラー:', error);
    else setCafes(data || []);
  };

  const getDummyEmail = (name: string) => `${name}@dummy-cafeteria.com`;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('ユーザー名とパスワードを入力してください');
    const { error } = await supabase.auth.signUp({ email: getDummyEmail(usernameInput), password: passwordInput, options: { data: { display_name: usernameInput } } });
    if (error) alert('登録エラー: ' + error.message); else checkUser();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('入力してください');
    const { error } = await supabase.auth.signInWithPassword({ email: getDummyEmail(usernameInput), password: passwordInput });
    if (error) alert('ログインエラー'); else checkUser();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0 }}>
      
      {/* 📱 ヘッダー */}
      <header style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>🍔🥤</div>
        {user ? (
          <div style={{ fontSize: '12px' }}>({user.user_metadata?.display_name}) でログイン中 <button onClick={handleLogout} style={{ marginLeft: '10px', padding: '2px 5px', fontSize: '10px' }}>ログアウト</button></div>
        ) : (
          <div style={{ fontSize: '12px' }}>未ログイン</div>
        )}
      </header>

      {/* 📱 メインコンテンツ（タブの中身をコンポーネントで呼び出すだけ！） */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f9f9f9' }}>
        {!user ? (
          <div className="login-screen">
            <h3>ログイン / 新規登録</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
              <input type="text" placeholder="ユーザー名" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
              <input type="password" placeholder="パスワード（6文字以上）" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px' }}><button onClick={handleLogin} type="button" style={{ flex: 1 }}>ログイン</button><button onClick={handleSignUp} type="button" style={{ flex: 1 }}>新規登録</button></div>
            </form>
          </div>
        ) : (
          <>
            {activeTab === 'home' && <HomeTab cafes={cafes} />}
            {activeTab === 'list' && <ListTab cafes={cafes} user={user} onUpdate={fetchCafes} />}
            {/* ▼ お店を登録完了(onSuccess)したら、データを再取得してホームタブに戻るように指示 */}
            {activeTab === 'add' && <AddTab user={user} onSuccess={() => { fetchCafes(); setActiveTab('home'); }} />}
          </>
        )}
      </main>

      {/* 📱 フッター */}
      {user && (
        <footer style={{ display: 'flex', justifyContent: 'space-around', padding: '5px', borderTop: '1px solid #ccc', backgroundColor: '#ffffff' }}>
          <button onClick={() => setActiveTab('list')} style={{ backgroundColor: activeTab === 'list' ? '#fee2d3' : 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px 24px', borderRadius: '12px', opacity: activeTab === 'list' ? 1 : 0.6, transition: 'all 0.2s' }}>📄</button>
          <button onClick={() => setActiveTab('home')} style={{ backgroundColor: activeTab === 'home' ? '#fee2d3' : 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px 24px', borderRadius: '12px', opacity: activeTab === 'home' ? 1 : 0.6, transition: 'all 0.2s' }}>🏠</button>
          <button onClick={() => setActiveTab('add')} style={{ backgroundColor: activeTab === 'add' ? '#fee2d3' : 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px 24px', borderRadius: '12px', opacity: activeTab === 'add' ? 1 : 0.6, transition: 'all 0.2s' }}>➕</button>
        </footer>
      )}
    </div>
  );
}

export default App;