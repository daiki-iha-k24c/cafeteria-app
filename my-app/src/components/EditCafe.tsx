import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import type { Cafe } from '../App';

interface EditCafeProps {
    cafe: Cafe;
    user: any;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function EditCafe({ cafe, user, onCancel, onSuccess }: EditCafeProps) {
    // 📝 初期値として、渡された cafe のデータを入れる
    const [cafeName, setCafeName] = useState(cafe.name);
    
    const CATEGORIES = ['ラーメン', 'パスタ', 'うどん・そば', '丼もの', 'パン', 'ファストフード', 'ピザ', '肉', '魚', '揚げ物', '粉もの', 'スイーツ', 'その他'];
    const [selectedTags, setSelectedTags] = useState<string[]>(cafe.tag ? cafe.tag.split(', ') : []);

    const [openTime, setOpenTime] = useState(cafe.open_time || '');
    const [closeTime, setCloseTime] = useState(cafe.close_time || '');

    const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日', '祝'];
    const [regularHolidays, setRegularHolidays] = useState<string[]>(cafe.regular_holidays ? cafe.regular_holidays.split(', ') : []);

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isHolidayOpen, setIsHolidayOpen] = useState(false);

    // 📸 写真ステート（既存の写真 ＋ 新しく追加する写真）
    const [existingImageUrls, setExistingImageUrls] = useState<string[]>(cafe.image_url ? cafe.image_url.split(',') : []);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);

    // 📍 位置情報ステート
    const [addressInput, setAddressInput] = useState(''); 
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedLat, setSelectedLat] = useState<number | null>(cafe.latitude);
    const [selectedLng, setSelectedLng] = useState<number | null>(cafe.longitude);
    const [currentLat, setCurrentLat] = useState<number | null>(null);
    const [currentLng, setCurrentLng] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [customAlert, setCustomAlert] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);

    // 🌍 画面を開いた時に、既存の座標から住所をテキスト化しておく
    useEffect(() => {
        if (cafe.latitude && cafe.longitude) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${cafe.latitude}&lon=${cafe.longitude}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        const cleanAddress = data.display_name.split(', ').reverse().join('').replace(/日本/g, '').replace(/〒?\d{3}-\d{4}/g, '');
                        setAddressInput(cleanAddress);
                    }
                });
        }
    }, [cafe]);

    useEffect(() => {
        if (isMapModalOpen && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLat(position.coords.latitude);
                    setCurrentLng(position.coords.longitude);
                    if (!selectedLat) setMapCenter([position.coords.latitude, position.coords.longitude]);
                },
                (error) => console.error("現在地取得エラー:", error)
            );
        }
    }, [isMapModalOpen]);

    const handleTagChange = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    const handleHolidayChange = (day: string) => setRegularHolidays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

    // 写真の追加・削除
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setNewImageFiles(prev => [...prev, ...filesArray]); 
            const newUrls = filesArray.map(file => URL.createObjectURL(file));
            setNewPreviewUrls(prev => [...prev, ...newUrls]); 
        }
        e.target.value = ''; 
    };
    const handleRemoveExistingImage = (indexToRemove: number) => setExistingImageUrls(prev => prev.filter((_, i) => i !== indexToRemove));
    const handleRemoveNewImage = (indexToRemove: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== indexToRemove));
        setNewPreviewUrls(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    // マップ関連処理
    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jp`);
            const data = await res.json();
            if (data && data.length > 0) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            else setCustomAlert({ text: '場所が見つかりませんでした。', type: 'warning' });
        } catch (error) {
            setCustomAlert({ text: '検索エラーが発生しました。', type: 'warning' });
        }
    };
    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCurrentLat(pos.coords.latitude);
                    setCurrentLng(pos.coords.longitude);
                    setMapCenter([pos.coords.latitude, pos.coords.longitude]);
                },
                () => setCustomAlert({ text: '現在地を取得できませんでした。', type: 'warning' })
            );
        }
    };
    const handleConfirmLocation = async () => {
        if (!selectedLat || !selectedLng) return setCustomAlert({ text: '地図上をタップしてピンを刺してください。', type: 'warning' });
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLng}`);
            const data = await res.json();
            if (data && data.display_name) {
                const cleanAddress = data.display_name.split(', ').reverse().join('').replace(/日本/g, '').replace(/〒?\d{3}-\d{4}/g, '');
                setAddressInput(cleanAddress);
            }
        } catch (error) {
            setAddressInput('住所取得エラー');
        }
        setIsMapModalOpen(false);
    };

    const MapClickHandler = () => { useMapEvents({ click(e) { setSelectedLat(e.latlng.lat); setSelectedLng(e.latlng.lng); } }); return null; };
    const MapUpdater = ({ center }: { center: [number, number] | null }) => { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]); return null; };

    // 💾 編集内容の保存（UPDATE）
    const handleUpdateCafe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cafeName.trim()) return setCustomAlert({ text: '店名を入力してください', type: 'warning' });
        if (selectedTags.length === 0) return setCustomAlert({ text: 'カテゴリを選択してください', type: 'warning' });
        if (!selectedLat || !selectedLng) return setCustomAlert({ text: 'ピンを刺してください', type: 'warning' });

        try {
            let uploadedUrls: string[] = [];
            // 新しい写真があればアップロード
            if (newImageFiles.length > 0) {
                for (let i = 0; i < newImageFiles.length; i++) {
                    const file = newImageFiles[i];
                    const fileName = `${Date.now()}_${i}_${file.name}`;
                    const { error: uploadError } = await supabase.storage.from('cafe-images').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('cafe-images').getPublicUrl(fileName);
                    uploadedUrls.push(data.publicUrl);
                }
            }

            // 既存の写真と新しい写真を合体
            const finalImageUrls = [...existingImageUrls, ...uploadedUrls];
            const finalImageUrlString = finalImageUrls.length > 0 ? finalImageUrls.join(',') : null;

            // Supabaseのデータを更新 (update)
            const { error } = await supabase.from('cafes').update({
                name: cafeName,
                tag: selectedTags.join(', '),
                open_time: openTime || null,
                close_time: closeTime || null,
                regular_holidays: regularHolidays.join(', '),
                image_url: finalImageUrlString,
                latitude: selectedLat,
                longitude: selectedLng
            }).eq('id', cafe.id); // 👈 このお店IDだけを更新！

            if (error) throw error;
            setCustomAlert({ text: 'お店の情報を更新しました！', type: 'success' });            
        } catch (error) {
            console.error("更新失敗:", error);
            setCustomAlert({ text: '更新に失敗しました', type: 'error' });        
        }
    };

    return (
        <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '30px', backgroundColor: '#fff', minHeight: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>お店情報の編集</h3>
                <button onClick={onCancel} style={{ background: 'none', border: '1px solid #ccc', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>キャンセル</button>
            </div>

            <form onSubmit={handleUpdateCafe} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* 1. 店名 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ width: '80px', fontSize: '14px' }}>店名</label>
                    <input type="text" value={cafeName} onChange={(e) => setCafeName(e.target.value)} required style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7' }} />
                </div>

                {/* 2. カテゴリ */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <label style={{ width: '80px', fontSize: '14px' }}>カテゴリ</label>
                    <div onClick={() => setIsCategoryOpen(!isCategoryOpen)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: selectedTags.length ? '#000' : '#666' }}>{selectedTags.length > 0 ? selectedTags.join(', ') : '複数選択可'}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
                    </div>
                    {isCategoryOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: '80px', right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, padding: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                            {CATEGORIES.map(tag => (
                                <label key={tag} style={{ display: 'flex', alignItems: 'center', padding: '5px', gap: '5px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => handleTagChange(tag)} />
                                    <span style={{ fontSize: '14px' }}>{tag}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. 営業時間 */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ width: '80px', fontSize: '14px' }}>営業時間</label>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7' }} />
                        <span>〜</span>
                        <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7' }} />
                    </div>
                </div>

                {/* 4. 定休日 */}
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <label style={{ width: '80px', fontSize: '14px' }}>定休日</label>
                    <div onClick={() => setIsHolidayOpen(!isHolidayOpen)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', color: regularHolidays.length ? '#000' : '#666' }}>{regularHolidays.length > 0 ? regularHolidays.join(', ') : '複数選択可'}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
                    </div>
                    {isHolidayOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: '80px', right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, padding: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {DAYS_OF_WEEK.map(day => (
                                <label key={day} style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', gap: '3px', cursor: 'pointer', backgroundColor: regularHolidays.includes(day) ? '#e8f5e9' : '#f0f0f0', borderRadius: '12px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={regularHolidays.includes(day)} onChange={() => handleHolidayChange(day)} style={{ display: 'none' }} />
                                    {day}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* 5. 写真の追加・編集 */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <label style={{ width: '80px', fontSize: '14px', marginTop: '10px' }}>写真</label>
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        
                        {/* 既存の写真 */}
                        {existingImageUrls.map((url, index) => (
                            <div key={`existing-${index}`} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: '1px solid #ccc', overflow: 'hidden' }}>
                                <img src={url} alt="既存" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" onClick={() => handleRemoveExistingImage(index)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: 0 }}>✕</button>
                            </div>
                        ))}

                        {/* 新規追加プレビュー */}
                        {newPreviewUrls.map((url, index) => (
                            <div key={`new-${index}`} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: '2px solid #8bc34a', overflow: 'hidden' }}>
                                <img src={url} alt="新規" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" onClick={() => handleRemoveNewImage(index)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: 0 }}>✕</button>
                            </div>
                        ))}

                        <label style={{ width: '60px', height: '60px', border: '2px dashed #9ccc65', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', backgroundColor: '#f9fbe7' }}>
                            <span style={{ fontSize: '24px', color: '#8bc34a', fontWeight: 'bold' }}>+</span>
                            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                {/* 6. 場所（ピン）の選択 */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ width: '80px', marginTop: '10px' }}>
                        <label style={{ fontSize: '14px' }}>所在地</label>
                        <div style={{ color: '#e53935', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>※必須</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '10px', borderRadius: '4px', border: addressInput ? '1px solid #9ccc65' : '1px dashed #ccc', backgroundColor: addressInput ? '#f9fbe7' : '#fafafa', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: addressInput ? '#333' : '#999', lineHeight: '1.4' }}>{addressInput || '未選択（地図からピンを刺してください）'}</span>
                        </div>
                        <button type="button" onClick={() => setIsMapModalOpen(true)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #90caf9', backgroundColor: '#e3f2fd', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: '#1565c0', width: '100%' }}>
                            🗺️ ピンの位置を修正する
                        </button>
                    </div>
                </div>

                {/* 更新ボタン */}
                <button type="submit" style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fff8e1', border: '2px solid #ffca28', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', color: '#f57f17', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    ✨ 編集内容を保存する
                </button>
            </form>

            {/* 🗺️ 地図ポップアップ */}
            {isMapModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '500px', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px' }}>地図をタップしてピンを修正</h4>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="大まかな地名で検索 (例: 牧志2丁目)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }} />
                            <button type="button" onClick={handleSearchLocation} style={{ padding: '8px 15px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>移動</button>
                        </div>
                        <button type="button" onClick={handleGetCurrentLocation} style={{ padding: '8px', backgroundColor: '#f0f4ff', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#1565c0' }}>📍 現在地にカメラを移動する</button>
                        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc' }}>
                            <MapContainer center={selectedLat && selectedLng ? [selectedLat, selectedLng] : [26.48, 127.95]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer attribution='© OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
                                <MapClickHandler />
                                <MapUpdater center={mapCenter} />
                                {currentLat && currentLng && <CircleMarker center={[currentLat, currentLng]} radius={8} pathOptions={{ color: 'white', fillColor: '#2196F3', fillOpacity: 1, weight: 2 }} />}
                                {selectedLat && selectedLng && <Marker position={[selectedLat, selectedLng]} />}
                            </MapContainer>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                            <button type="button" onClick={() => setIsMapModalOpen(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}>キャンセル</button>
                            <button type="button" onClick={handleConfirmLocation} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#fee2d3', fontWeight: 'bold', cursor: 'pointer', color: '#d84315' }}>✅ ここに決定</button>
                        </div>
                    </div>
                </div>
            )}

            {/* カスタムアラート */}
            {customAlert && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', padding: '30px 20px', borderRadius: '16px', width: '100%', maxWidth: '300px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>{customAlert.type === 'success' ? '✨' : customAlert.type === 'error' ? '❌' : '⚠️'}</div>
                        <p style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold', color: '#333', lineHeight: '1.5' }}>{customAlert.text}</p>
                        <button onClick={() => { const isSuccess = customAlert.type === 'success'; setCustomAlert(null); if (isSuccess) onSuccess(); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: customAlert.type === 'success' ? '#8bc34a' : '#ff9800', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}