import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import type { Cafe } from '../App';

interface AddTabProps {
    user: any;
    cafes: Cafe[];
    onSuccess: () => void;
}

export default function AddTab({ user, cafes, onSuccess }: AddTabProps) {
    const [cafeName, setCafeName] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

    const CATEGORIES = ['ラーメン', 'パスタ', 'うどん・そば', '丼もの', 'パン', 'ファストフード', 'ピザ', '肉', '魚', '揚げ物', '粉もの', 'スイーツ', 'その他'];
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]); 

    const [openTime, setOpenTime] = useState('');
    const [closeTime, setCloseTime] = useState('');

    const DAYS_OF_WEEK = ['月', '火', '水', '木', '金', '土', '日', '祝'];
    const [regularHolidays, setRegularHolidays] = useState<string[]>([]);

    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isHolidayOpen, setIsHolidayOpen] = useState(false);

    const [addressInput, setAddressInput] = useState(''); 
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedLat, setSelectedLat] = useState<number | null>(null);
    const [selectedLng, setSelectedLng] = useState<number | null>(null);
    const [currentLat, setCurrentLat] = useState<number | null>(null);
    const [currentLng, setCurrentLng] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [customAlert, setCustomAlert] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);

    // 🌟 追加：送信中（ローディング）状態を管理するステート
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 店名が入力されるたびに重複チェックを行う
    useEffect(() => {
        if (cafeName.length < 2) {
            setDuplicateWarning(null);
            return;
        }

        const checkDuplicate = async () => {
            const { data } = await supabase
                .from('cafes')
                .select('name')
                .ilike('name', `%${cafeName}%`)
                .limit(1);

            if (data && data.length > 0) {
                setDuplicateWarning(`⚠️ 既に「${data[0].name}」というお店が登録されています。`);
            } else {
                setDuplicateWarning(null);
            }
        };

        const timerId = setTimeout(checkDuplicate, 500);
        return () => clearTimeout(timerId);
    }, [cafeName]);

    // 地図が開かれた時に現在地を取得
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...filesArray]); 
            const newUrls = filesArray.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...newUrls]); 
        }
        e.target.value = ''; 
    };
    const handleRemoveImage = (indexToRemove: number) => {
        setImageFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setPreviewUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=jp`);
            const data = await res.json();
            if (data && data.length > 0) setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            else setCustomAlert({ text: '場所が見つかりませんでした。', type: 'warning' });
        } catch (error) {
            setCustomAlert({ text: '検索中にエラーが発生しました。', type: 'warning' });
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
        if (!selectedLat || !selectedLng) return setCustomAlert({ text: '地図上をタップして、お店の場所に赤いピンを刺してください。', type: 'warning' });
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLng}`);
            const data = await res.json();
            if (data && data.display_name) {
                const cleanAddress = data.display_name.split(', ').reverse().join('').replace(/日本/g, '').replace(/〒?\d{3}-\d{4}/g, '');
                setAddressInput(cleanAddress);
            } else {
                setAddressInput('住所を自動取得できませんでした');
            }
        } catch (error) {
            setAddressInput('住所取得エラー');
        }
        setIsMapModalOpen(false);
    };

    const MapClickHandler = () => { useMapEvents({ click(e) { setSelectedLat(e.latlng.lat); setSelectedLng(e.latlng.lng); } }); return null; };
    const MapUpdater = ({ center }: { center: [number, number] | null }) => { const map = useMap(); useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]); return null; };

    // 🌟 登録処理（ローディングの追加）
    const handleRegisterCafe = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 未入力チェック（ここで弾かれた場合は送信処理にいかない）
        if (!cafeName.trim()) return setCustomAlert({ text: '店名を入力してください', type: 'warning' });
        if (selectedTags.length === 0) return setCustomAlert({ text: 'カテゴリを少なくとも1つ選択してください', type: 'warning' });
        if (!selectedLat || !selectedLng) return setCustomAlert({ text: '地図からお店の場所を選択（ピンを刺す）してください', type: 'warning' });

        setIsSubmitting(true); // 🌟 ローディング開始

        try {
            let uploadedUrls: string[] = [];
            if (imageFiles.length > 0) {
                for (let i = 0; i < imageFiles.length; i++) {
                    const file = imageFiles[i];
                    const fileName = `${Date.now()}_${i}_${file.name}`;
                    const { error: uploadError } = await supabase.storage.from('cafe-images').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data } = supabase.storage.from('cafe-images').getPublicUrl(fileName);
                    uploadedUrls.push(data.publicUrl);
                }
            }

            const finalImageUrl = uploadedUrls.length > 0 ? uploadedUrls.join(',') : null;

            const { error } = await supabase.from('cafes').insert([{
                name: cafeName, tag: selectedTags.join(', '), open_time: openTime || null, close_time: closeTime || null,
                regular_holidays: regularHolidays.join(', '), user_name: user.user_metadata.display_name, user_id: user.id,
                image_url: finalImageUrl, latitude: selectedLat, longitude: selectedLng
            }]);

            if (error) throw error;
            setCustomAlert({ text: 'お店の登録が完了しました！', type: 'success' });            
            
            // フォームリセット
            setCafeName(''); setSelectedTags([]); setOpenTime(''); setCloseTime(''); setRegularHolidays([]);
            setAddressInput(''); setSelectedLat(null); setSelectedLng(null); setImageFiles([]); setPreviewUrls([]); 
        } catch (error) {
            setCustomAlert({ text: '登録に失敗しました', type: 'error' });        
        } finally {
            setIsSubmitting(false); // 🌟 成功しても失敗してもローディングを終了する
        }
    };

    return (
        <div style={{ color:'black', padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '15px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 'bold' }}>お店情報の登録</h3>

            <div style={{ backgroundColor: '#fff3e0', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #ff9800', fontSize: '12px', color: '#e65100', lineHeight: '1.4' }}>
                <strong>💡 お願い</strong><br/>
                重複登録を防ぐため、お店が既に登録されていないか「店名」や「地図」でご確認ください。
            </div>

            <form onSubmit={handleRegisterCafe} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* 1. 店名 */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '80px' }}>
                            <label style={{ fontSize: '14px' }}>店名</label>
                            <div style={{ color: '#e53935', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>※必須</div>
                        </div>
                        <input 
                            type="text" 
                            value={cafeName} 
                            onChange={(e) => setCafeName(e.target.value)} 
                            required
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: duplicateWarning ? '2px solid #ef5350' : '1px solid #9ccc65', backgroundColor: '#f9fbe7' }}
                        />
                    </div>
                    {/* 重複警告メッセージ */}
                    {duplicateWarning && (
                        <div style={{ marginLeft: '80px', marginTop: '5px', fontSize: '12px', color: '#d32f2f', fontWeight: 'bold' }}>
                            {duplicateWarning}
                        </div>
                    )}
                </div>

                {/* 2. カテゴリ */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ width: '80px', marginTop: '8px' }}>
                        <label style={{ fontSize: '14px' }}>カテゴリ</label>
                        <div style={{ color: '#e53935', fontSize: '11px', marginTop: '2px', fontWeight: 'bold' }}>※必須</div>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div onClick={() => setIsCategoryOpen(!isCategoryOpen)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: selectedTags.length ? '#000' : '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {selectedTags.length > 0 ? selectedTags.join(', ') : '複数選択可'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px', flexShrink: 0 }}>▼</span>
                        </div>
                        {isCategoryOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, padding: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', maxHeight: '150px', overflowY: 'auto' }}>
                                {CATEGORIES.map(tag => (
                                    <label key={tag} style={{ display: 'flex', alignItems: 'center', padding: '5px', gap: '5px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => handleTagChange(tag)} />
                                        <span style={{ fontSize: '14px' }}>{tag}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
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
                    <div onClick={() => setIsHolidayOpen(!isHolidayOpen)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #9ccc65', backgroundColor: '#f9fbe7', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: regularHolidays.length ? '#000' : '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{regularHolidays.length > 0 ? regularHolidays.join(', ') : '複数選択可'}</span>
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px', flexShrink: 0 }}>▼</span>
                    </div>
                    {isHolidayOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: '80px', right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, padding: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            {DAYS_OF_WEEK.map(day => (
                                <label key={day} style={{ display: 'flex', alignItems: 'center', padding: '3px 8px', gap: '3px', cursor: 'pointer', backgroundColor: regularHolidays.includes(day) ? '#e8f5e9' : '#f0f0f0', borderRadius: '12px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={regularHolidays.includes(day)} onChange={() => handleHolidayChange(day)} style={{ display: 'none' }} />
                                    {day}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* 5. 写真 */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <label style={{ width: '80px', fontSize: '14px', marginTop: '10px' }}>写真</label>
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {previewUrls.map((url, index) => (
                            <div key={index} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '4px', border: '1px solid #ccc', overflow: 'hidden' }}>
                                <img src={url} alt="プレビュー" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button type="button" onClick={() => handleRemoveImage(index)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', padding: 0 }}>✕</button>
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
                            🗺️ 地図を開いてピンを刺す
                        </button>
                    </div>
                </div>

                {/* 🌟 登録ボタン（送信中は押せなくする） */}
                <button 
                    type="submit" 
                    disabled={isSubmitting} // 🌟 連打防止
                    style={{ 
                        marginTop: '10px', 
                        padding: '12px', 
                        backgroundColor: isSubmitting ? '#e0e0e0' : '#dcedc8', // 🌟 送信中はグレーにする
                        border: isSubmitting ? '2px solid #bdbdbd' : '2px solid #8bc34a', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        cursor: isSubmitting ? 'not-allowed' : 'pointer', // 🌟 カーソルも変更
                        fontSize: '15px', 
                        color: isSubmitting ? '#757575' : '#33691e', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                    }}
                >
                    {isSubmitting ? '登録処理中...' : 'この内容で登録する'}
                </button>
            </form>

            {/* 🗺️ 地図ポップアップ（モーダル） */}
            {isMapModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#fff', width: '90%', maxWidth: '500px', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px' }}>地図をタップしてピンを刺す</h4>
                        
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <input type="text" placeholder="大まかな地名で検索 (例: 牧志2丁目)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }} />
                            <button type="button" onClick={handleSearchLocation} style={{ padding: '8px 15px', backgroundColor: '#e0e0e0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>移動</button>
                        </div>

                        <button type="button" onClick={handleGetCurrentLocation} style={{ padding: '8px', backgroundColor: '#f0f4ff', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#1565c0' }}>
                            📍 現在地にカメラを移動する
                        </button>

                        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc' }}>
                            <MapContainer center={[26.48, 127.95]} zoom={9.3} minZoom={8} maxBounds={[[26.05, 127.55], [26.90, 128.35]]} maxBoundsViscosity={1.0} style={{ height: '100%', width: '100%' }}>
                                <TileLayer attribution='© OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png" />
                                <MapClickHandler />
                                <MapUpdater center={mapCenter} />
                                
                                {/* 🔵 現在地の青い丸 */}
                                {currentLat && currentLng && (
                                    <CircleMarker center={[currentLat, currentLng]} radius={8} pathOptions={{ color: 'white', fillColor: '#2196F3', fillOpacity: 1, weight: 2 }}>
                                        <Popup>あなたの現在地です</Popup>
                                    </CircleMarker>
                                )}

                                {/* すでに登録されているお店をグレーの丸で表示 */}
                                {cafes.map(existingCafe => {
                                    if (existingCafe.latitude && existingCafe.longitude) {
                                        return (
                                            <CircleMarker 
                                                key={`existing-${existingCafe.id}`} 
                                                center={[existingCafe.latitude, existingCafe.longitude]} 
                                                radius={6} 
                                                pathOptions={{ color: '#666', fillColor: '#9e9e9e', fillOpacity: 0.8, weight: 1 }}
                                            >
                                                <Popup>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>登録済み: {existingCafe.name}</span>
                                                </Popup>
                                            </CircleMarker>
                                        );
                                    }
                                    return null;
                                })}

                                {/* 🔴 ユーザーが新しく刺した赤いピン */}
                                {selectedLat && selectedLng && (
                                    <Marker position={[selectedLat, selectedLng]}>
                                        <Popup>ここにお店を登録します</Popup>
                                    </Marker>
                                )}
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

            {/* 🌟 ローディングモーダル（送信中のみ表示） */}
            {isSubmitting && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    color: '#fff'
                }}>
                    <div style={{
                        border: '4px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '4px solid #8bc34a',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '10px'
                    }} />
                    <span style={{ fontWeight: 'bold', fontSize: '14px' }}>登録処理中...画面を閉じないでください</span>
                    
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}