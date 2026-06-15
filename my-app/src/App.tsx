import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import './App.css';

interface Cafe {
  id: number;
  name: string;
  tag: string;
  user_name: string;
  user_id: string;
  image_url: string | null; // 👈 画像URLを追加
}

function App() {
  // 認証関連のステート
  const [user, setUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // カフェデータ関連のステート
  const [cafeName, setCafeName] = useState('');
  const [cafeTag, setCafeTag] = useState('ドリンク');
  const [imageFile, setImageFile] = useState<File | null>(null); // 👈 選択された画像ファイルを保存するステート
  const [cafes, setCafes] = useState<Cafe[]>([]);

  // 編集モード用のステート
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

    if (error) {
      console.error('取得エラー:', error);
    } else {
      setCafes(data || []);
    }
  };

  const getDummyEmail = (name: string) => `${name}@dummy-cafeteria.com`;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) return alert('ユーザー名とパスワードを入力してください');

    const dummyEmail = getDummyEmail(usernameInput);
    const { error } = await supabase.auth.signUp({
      email: dummyEmail,
      password: passwordInput,
      options: {
        data: { display_name: usernameInput }
      }
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

  // ☕ 新しいカフェを登録する関数（画像アップロード処理を追加）
  const handleAddCafe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeName.trim()) return;

    try {
      let imageUrl = '';

      // 📸 画像が選択されている場合、まずStorageにアップロードする
      if (imageFile) {
        // ファイル名が被らないように、現在時刻の数字をファイル名の先頭にくっつけるトリック
        const fileName = `${Date.now()}_${imageFile.name}`;
        
        // 'cafe-images' バケットにファイルをアップロード
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('cafe-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          throw uploadError;
        }

        // アップロードが成功したら、その画像の「公開URL」を取得する
        const { data: publicUrlData } = supabase.storage
          .from('cafe-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // Supabaseのcafesテーブルにデータを挿入（image_url も一緒に保存）
      const { error } = await supabase.from('cafes').insert([{
        name: cafeName,
        tag: cafeTag,
        user_name: user.user_metadata.display_name,
        user_id: user.id,
        image_url: imageUrl || null // 画像がない場合はnull
      }]);

      if (error) throw error;

      // フォームをリセット
      setCafeName('');
      setImageFile(null);
      // ファイルの選択欄（HTML）を空っぽにするためのリセット処理
      const fileInput = document.getElementById('cafe-image-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchCafes(); // 一覧を再取得
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

    if (error) {
      console.error("更新失敗:", error);
    } else {
      setEditingId(null);
      fetchCafes();
    }
  };

  return (
    <div className="app-container">
      <h1>☕ カフェテリア アプリ (Supabase版)</h1>

      {user ? (
        <div>
          <div className="profile-card">
            <span>ようこそ、{user.user_metadata?.display_name} さん </span>
            <button onClick={handleLogout} style={{ marginLeft: '10px' }}>ログアウト</button>
          </div>

          <hr />

          {/* カフェ登録フォーム */}
          <div className="form-section">
            <h3>新しくカフェを登録する</h3>
            <form onSubmit={handleAddCafe}>
              <div style={{ marginBottom: '10px' }}>
                <label>店名：</label>
                <input type="text" value={cafeName} onChange={(e) => setCafeName(e.target.value)} placeholder="カフェの名前" />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>タグ：</label>
                <select value={cafeTag} onChange={(e) => setCafeTag(e.target.value)}>
                  <option value="ドリンク">ドリンク</option>
                  <option value="スイーツ">スイーツ</option>
                  <option value="ランチ">ランチ</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              {/* 👇 ファイル選択欄を追加 */}
              <div style={{ marginBottom: '10px' }}>
                <label>写真：</label>
                <input 
                  id="cafe-image-input"
                  type="file" 
                  accept="image/*" // 画像ファイルだけを選べるように制限
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]); // 選ばれたファイルをステートに保存
                    }
                  }} 
                />
              </div>
              <button type="submit">登録する</button>
            </form>
          </div>

          <hr />

          {/* カフェ一覧 */}
          <div className="list-section">
            <h3>みんなが登録したカフェ一覧（{cafes.length}件）</h3>
            {cafes.length === 0 ? (
              <p>まだ登録されているカフェはありません。</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {cafes.map((cafe) => (
                  <div key={cafe.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', textAlign: 'left' }}>
                    
                    {editingId === cafe.id ? (
                      <div>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ marginBottom: '5px', display: 'block' }} />
                        <select value={editTag} onChange={(e) => setEditTag(e.target.value)} style={{ marginBottom: '5px', display: 'block' }}>
                          <option value="ドリンク">ドリンク</option>
                          <option value="スイーツ">スイーツ</option>
                          <option value="ランチ">ランチ</option>
                          <option value="その他">その他</option>
                        </select>
                        <button onClick={() => handleUpdateCafe(cafe.id)}>保存</button>
                        <button onClick={() => setEditingId(null)} style={{ marginLeft: '5px' }}>キャンセル</button>
                      </div>
                    ) : (
                      <div>
                        <h4>{cafe.name}</h4>
                        <p>🏷️ タグ: {cafe.tag}</p>
                        
                        {/* 👇 画像URLがある場合だけ、画像タグを表示する */}
                        {cafe.image_url && (
                          <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                            <img 
                              src={cafe.image_url} 
                              alt={cafe.name} 
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', objectFit: 'cover' }} 
                            />
                          </div>
                        )}

                        <p><small style={{ color: '#666' }}>投稿者: {cafe.user_name}</small></p>
                        
                        {cafe.user_id === user.id && (
                          <div style={{ marginTop: '10px' }}>
                            <button onClick={() => startEdit(cafe)} style={{ marginRight: '5px' }}>編集</button>
                            <button onClick={() => handleDeleteCafe(cafe.id)}>削除</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="login-screen">
          <h3>ログイン / 新規登録</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
            <input type="text" placeholder="ユーザー名（例：daiki）" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
            <input type="password" placeholder="パスワード（6文字以上）" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleLogin} type="button" style={{ flex: 1 }}>ログイン</button>
              <button onClick={handleSignUp} type="button" style={{ flex: 1 }}>新規登録</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;