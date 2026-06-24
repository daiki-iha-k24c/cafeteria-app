import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import L from 'leaflet';
import './App.css';

// 作成した3つのコンポーネントを読み込む
import HomeTab from './components/HomeTab';
import AddTab from './components/AddTab';
import ListTab from './components/ListTab';

// 🗺️ 地図のアイコン設定
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

export interface Cafe {
  id: number;
  name: string;
  tag: string;
  user_name: string;
  user_id: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  open_time?: string | null;
  close_time?: string | null;
  regular_holidays?: string | null;
}

function App() {
  const [user, setUser] = useState<any>(null);
  
  // 🌟 追加・変更したステート
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirmInput, setPasswordConfirmInput] = useState(''); // 再確認用パスワード
  const [isSignUpMode, setIsSignUpMode] = useState(false); // ログインか新規登録かの切り替え
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージ用
  
  const [activeTab, setActiveTab] = useState<'list' | 'home' | 'add'>('home');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

  // 🌟 新規登録の処理（alertをエラーポップアップに変更、パスワード確認追加）
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput || !passwordConfirmInput) return setErrorMessage('すべての項目を入力してください');
    if (passwordInput !== passwordConfirmInput) return setErrorMessage('パスワードが一致しません');
    if (passwordInput.length < 6) return setErrorMessage('パスワードは6文字以上で入力してください');

    const { error } = await supabase.auth.signUp({ 
      email: getDummyEmail(usernameInput), 
      password: passwordInput, 
      options: { data: { display_name: usernameInput } } 
    });
    if (error) setErrorMessage('登録エラー: ' + error.message); 
    else checkUser();
  };

  // 🌟 ログインの処理（alertをエラーポップアップに変更）
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return setErrorMessage('ユーザー名とパスワードを入力してください');
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: getDummyEmail(usernameInput), 
      password: passwordInput 
    });
    if (error) setErrorMessage('ログインに失敗しました。ユーザー名かパスワードが間違っています。'); 
    else checkUser();
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: 0 }}>
      
      {/* 📱 ヘッダー */}
      <header style={{ padding: '10px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}></div>
        {user ? (
          <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>({user.user_metadata?.display_name}) でログイン中</span>
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', padding: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '12px' }}>未ログイン</div>
        )}
      </header>

      {/* 📱 メインコンテンツ */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f9f9f9' }}>
        {!user ? (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px' }}>
            <div style={{ 
              width: '100%', maxWidth: '320px', backgroundColor: '#fff', 
              padding: '40px 20px', borderRadius: '20px', 
              boxShadow: '0 8px 25px rgba(0,0,0,0.05)', textAlign: 'center' 
            }}>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64">
                  <g>
                    <path fill="rgb(129, 223, 86)" d="M479.336,335.852c20.763-27.978,32.711-64.873,32.664-110.414V103.265
                      c-0.01-24.739-20.044-44.763-44.774-44.773c0,0-85.116,0-171.396,0c-86.29,0-173.744,0-178.43,0
                      C52.556,58.502,0.009,111.048,0,175.893c-0.038,32.389,13.302,61.228,34.539,81.924c21.226,20.744,50.255,33.65,82.038,35.468
                      c2.272,0.122,4.488,0.179,6.646,0.179c4.772,0,9.335-0.341,13.738-0.938c11.125,27.571,28.773,51.799,51.259,70.592l-0.34-0.284
                      l0.255,0.217c0.729,0.616,1.648,1.326,2.547,2.036H123.64v40.902c0.01,26.244,21.264,47.508,47.519,47.518h293.19
                      c26.244-0.01,47.51-21.264,47.518-47.518v-40.902h-61.246C461.31,356.756,471.014,347.099,479.336,335.852z M482.782,394.173
                      v11.816c-0.018,10.178-8.265,18.415-18.433,18.433h-293.19c-10.178-0.018-18.416-8.256-18.434-18.433v-11.816h94.28h147.868
                      H482.782z M389.884,365.088H252.137c-11.769-4.299-21.729-9.165-29.332-13.539c-8.058-4.62-13.662-8.805-15.849-10.679l0.161,0.141
                      l-0.246-0.198c-21.558-18.027-37.88-42.075-46.676-69.513l-4.355-13.539l-13.634,4.043c-5.454,1.619-11.684,2.575-18.983,2.575
                      c-1.628,0-3.294-0.048-5.008-0.142c-24.919-1.412-47.32-11.532-63.34-27.221c-16.019-15.725-25.752-36.706-25.79-61.123
                      c0.009-24.437,9.865-46.421,25.866-62.45c16.029-16.01,38.013-25.856,62.45-25.866c9.373,0,349.826,0,349.826,0
                      c8.654,0.01,15.67,7.025,15.688,15.688v122.173c-0.048,40.617-10.348,70.62-26.955,93.106
                      C439.722,340.434,417,355.564,389.884,365.088z" />
                    <path fill="rgb(129, 223, 86)" d="M122.712,122.154c-29.691,0.01-53.73,24.057-53.74,53.74c0.01,29.691,24.058,53.739,53.74,53.748
                      c9.572,0,18.368-2.708,25.838-6.826l6.268-3.455v-86.934l-6.268-3.446C141.08,124.852,132.284,122.144,122.712,122.154z
                       M130.58,204.164c-2.537,0.767-5.15,1.24-7.868,1.24c-16.294-0.028-29.474-13.208-29.502-29.511
                      c0.028-16.285,13.218-29.474,29.502-29.502c2.718,0.01,5.33,0.483,7.868,1.24V204.164z" />
                  </g>
                </svg>
              </div>              
              <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#4a4a4a' }}>Cafe Map</h3>
              <p style={{ margin: '0 0 25px 0', fontSize: '13px', color: '#888' }}>
                {isSignUpMode ? '新しいアカウントを作成' : 'お気に入りのお店を記録しよう'}
              </p>
              
              <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" 
                  placeholder="ユーザー名" 
                  value={usernameInput} 
                  onChange={(e) => setUsernameInput(e.target.value)} 
                  style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '15px', backgroundColor: '#fafafa', outlineColor: '#8bc34a' }}
                />
                <input 
                  type="password" 
                  placeholder="パスワード（6文字以上）" 
                  value={passwordInput} 
                  onChange={(e) => setPasswordInput(e.target.value)} 
                  style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '15px', backgroundColor: '#fafafa', outlineColor: '#8bc34a' }}
                />
                
                {/* 🌟 新規登録モードの時だけ表示されるパスワード確認フィールド */}
                {isSignUpMode && (
                  <input 
                    type="password" 
                    placeholder="パスワード（確認用）" 
                    value={passwordConfirmInput} 
                    onChange={(e) => setPasswordConfirmInput(e.target.value)} 
                    style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e0e0e0', fontSize: '15px', backgroundColor: '#fafafa', outlineColor: '#8bc34a' }}
                  />
                )}
                
                {/* 🌟 モードによってボタンを出し分ける */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {!isSignUpMode ? (
                    <>
                      <button 
                        onClick={handleLogin} 
                        type="button" 
                        style={{ padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#8bc34a', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(139, 195, 74, 0.3)' }}
                      >
                        ログイン
                      </button>
                      
                      <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                        <span>初めての方はこちら</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                      </div>

                      <button 
                        onClick={() => { setIsSignUpMode(true); setErrorMessage(null); setPasswordConfirmInput(''); }} 
                        type="button" 
                        style={{ padding: '14px', borderRadius: '10px', border: '2px solid #8bc34a', backgroundColor: '#fff', color: '#8bc34a', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                      >
                        新規登録
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={handleSignUp} 
                        type="button" 
                        style={{ padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#8bc34a', color: '#fff', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(139, 195, 74, 0.3)' }}
                      >
                        登録してはじめる
                      </button>
                      
                      <div style={{ fontSize: '12px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                        <span>すでにアカウントをお持ちの方</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                      </div>

                      <button 
                        onClick={() => { setIsSignUpMode(false); setErrorMessage(null); }} 
                        type="button" 
                        style={{ padding: '14px', borderRadius: '10px', border: '2px solid #ccc', backgroundColor: '#fff', color: '#666', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                      >
                        ログイン画面に戻る
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'home' && <HomeTab cafes={cafes} user={user} onUpdate={fetchCafes} />}
            {activeTab === 'list' && <ListTab cafes={cafes} user={user} onUpdate={fetchCafes} />}
            {activeTab === 'add' && <AddTab user={user} cafes={cafes} onSuccess={() => { setActiveTab('home'); fetchCafes(); }} />}
          </>
        )}
      </main>

      {/* 🌟 カスタム：エラー表示モーダル（alertの代わり） */}
      {errorMessage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '300px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#ff5252', marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>エラー</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666', lineHeight: '1.5' }}>{errorMessage}</p>
            <button 
              onClick={() => setErrorMessage(null)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#333', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ログアウト確認モーダル */}
      {showLogoutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '300px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>ログアウト</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#666' }}>ログアウトしてよろしいですか？</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}>
                キャンセル
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); handleLogout(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#ff5252', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📱 フッター */}
      {user && (
        <footer style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 5px', borderTop: '1px solid #ccc', backgroundColor: '#ffffff' }}>
          <button onClick={() => setActiveTab('list')} style={{ color:'black', fontWeight:'bold', backgroundColor: activeTab === 'list' ? '#d1ffd1' : 'transparent', border: 'none', cursor: 'pointer', padding: '6px 24px', borderRadius: '12px', opacity: activeTab === 'list' ? 1 : 0.6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </button>
          <button onClick={() => setActiveTab('home')} style={{ backgroundColor: activeTab === 'home' ? '#d1ffd1' : 'transparent', border: 'none', cursor: 'pointer', padding: '6px 24px', borderRadius: '12px', opacity: activeTab === 'home' ? 1 : 0.6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </button>
          <button onClick={() => setActiveTab('add')} style={{ backgroundColor: activeTab === 'add' ? '#d1ffd1' : 'transparent', border: 'none', cursor: 'pointer', padding: '6px 24px', borderRadius: '12px', opacity: activeTab === 'add' ? 1 : 0.6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </button>
        </footer>
      )}
    </div>
  );
}

export default App;