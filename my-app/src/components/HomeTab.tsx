import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Cafe } from '../App'; // App.tsxから型（ルール）をもらってくる

interface HomeTabProps {
  cafes: Cafe[];
}

export default function HomeTab({ cafes }: HomeTabProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
        <span style={{ fontSize: '12px', alignSelf: 'center' }}>絞り込み</span>
        <button style={{ fontSize: '12px', padding: '2px 5px' }}>営業時間内</button>
        <button style={{ fontSize: '12px', padding: '2px 5px' }}>カテゴリ▼</button>
        <button style={{ fontSize: '12px', padding: '2px 5px' }}>ユーザー▼</button>
      </div>
      <div style={{ flex: 1, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #ccc' }}>
        <MapContainer 
          center={[26.48, 127.95]} 
          zoom={9.3}                    
          minZoom={9.3}
          maxBounds={[[26.05, 127.55], [26.90, 128.35]]}
          maxBoundsViscosity={1.0}     
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          />
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
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${cafe.latitude},${cafe.longitude}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '5px 10px', backgroundColor: '#4285F4', color: 'white', textDecoration: 'none', borderRadius: '5px', fontSize: '12px' }}>
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
  );
}