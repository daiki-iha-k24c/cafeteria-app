import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Cafe } from '../App';

interface ListTabProps {
  cafes: Cafe[];
  user: any;
  onUpdate: () => void; // データが変わったときにApp.tsxに更新をお願いする機能
}

export default function ListTab({ cafes, user, onUpdate }: ListTabProps) {
  // 編集用のステート
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');

  const handleDeleteCafe = async (id: number) => {
    if (!window.confirm("本当にこのカフェを削除しますか？")) return;
    const { error } = await supabase.from('cafes').delete().eq('id', id);
    if (!error) onUpdate();
  };

  const startEdit = (cafe: Cafe) => {
    setEditingId(cafe.id);
    setEditName(cafe.name);
    setEditTag(cafe.tag);
  };

  const handleUpdateCafe = async (id: number) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('cafes').update({ name: editName, tag: editTag }).eq('id', id);
    if (error) console.error("更新失敗:", error);
    else { setEditingId(null); onUpdate(); }
  };

  return (
    <div>
      <h3>みんなが登録したお店一覧（{cafes.length}件）</h3>
      {cafes.length === 0 ? (
        <p>まだ登録されているお店はありません。</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '20px' }}>
          {cafes.map((cafe) => (
            <div key={cafe.id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', backgroundColor: '#fff' }}>
              {editingId === cafe.id ? (
                <div>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ marginBottom: '5px', display: 'block', width: '100%', padding: '5px' }} />
                  <input type="text" value={editTag} onChange={(e) => setEditTag(e.target.value)} style={{ marginBottom: '5px', display: 'block', width: '100%', padding: '5px' }} />
                  <button onClick={() => handleUpdateCafe(cafe.id)}>保存</button>
                  <button onClick={() => setEditingId(null)} style={{ marginLeft: '5px' }}>キャンセル</button>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{cafe.name}</h4>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🏷️ タグ: {cafe.tag}</p>
                  {cafe.image_url && (
                    <img src={cafe.image_url} alt={cafe.name} style={{ width: '100%', maxHeight: '200px', borderRadius: '4px', objectFit: 'cover' }} />
                  )}
                  <p style={{ margin: '5px 0 0 0' }}><small style={{ color: '#666' }}>投稿者: {cafe.user_name}</small></p>
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
  );
}