import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import L from 'leaflet';
import { format } from 'date-fns';

// Haritayı son konuma odaklamak için yardımcı bileşen
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.flyTo(position, 18, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

// Fix for default marker icons in Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapComponent({ selectedDevice, isHistoryMode, nicknames = {} }) {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!db || !selectedDevice) return;

    const q = query(
      collection(db, 'locations'), 
      where('deviceId', '==', selectedDevice),
      orderBy('timestamp', 'desc'), 
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          locs.push({
            id: doc.id,
            lat: data.latitude,
            lng: data.longitude,
            time: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            deviceId: data.deviceId
          });
        }
      });
      // Zaman sırasına göre diz (Polyline ve Marker sırası için)
      setLocations(locs.sort((a, b) => a.time - b.time));
    });

    return () => unsubscribe();
  }, [selectedDevice]);

  const center = locations.length > 0 
    ? [locations[locations.length - 1].lat, locations[locations.length - 1].lng] 
    : [39.92077, 32.85411];

  const polyline = locations.map(loc => [loc.lat, loc.lng]);

  // Canlı modda sadece son konumu gösteriyoruz, Geçmiş modunda hepsini
  const visibleLocations = isHistoryMode ? locations : (locations.length > 0 ? [locations[locations.length - 1]] : []);

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap position={center} />
        {visibleLocations.map((loc, index) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup>
              <div className="popup-content">
                <strong>Cihaz:</strong> {nicknames[loc.deviceId] || loc.deviceId || 'Bilinmiyor'} <br/>
                <strong>Zaman:</strong> {format(loc.time, 'dd MMM yyyy HH:mm:ss')} <br/>
                {(isHistoryMode && index === visibleLocations.length - 1) && <span className="current-badge">Son Konum</span>}
                {!isHistoryMode && <span className="current-badge">Canlı Konum</span>}
              </div>
            </Popup>
          </Marker>
        ))}
        {isHistoryMode && locations.length > 1 && (
          <Polyline positions={polyline} color="#4F46E5" weight={4} opacity={0.7} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapComponent;
