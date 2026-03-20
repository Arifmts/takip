import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, query, orderBy, onSnapshot, limit, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import L from 'leaflet';
import { format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { RefreshCw } from 'lucide-react';

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

function MapComponent({ selectedDevice, isHistoryMode, nicknames = {}, selectedDate, focusedLocation, locations = [] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    if (selectedDevice) {
      try {
        await setDoc(doc(db, 'commands', selectedDevice), {
          request_location: true,
          timestamp: new Date(),
        }, { merge: true });
        console.log('Konum isteği gönderildi!');
      } catch (error) {
        console.error('Komut gönderme hatası:', error);
      }
    }
    
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Tarihe göre filtrele
  const filteredLocations = selectedDate 
    ? locations.filter(loc => isSameDay(new Date(loc.time), new Date(selectedDate)))
    : locations;

  // Center hesapla - önce focusedLocation, sonra tarih filtresi, sonra son konum
  const mapCenter = (() => {
    if (focusedLocation) {
      return [focusedLocation.lat, focusedLocation.lng];
    }
    if (filteredLocations.length > 0) {
      return [filteredLocations[filteredLocations.length - 1].lat, filteredLocations[filteredLocations.length - 1].lng];
    }
    return [39.92077, 32.85411];
  })();

  const polyline = filteredLocations.map(loc => [loc.lat, loc.lng]);

  // Visible locations - canlı modda sadece son, geçmiş modunda filtrelenmiş
  const visibleLocations = isHistoryMode 
    ? filteredLocations 
    : (locations.length > 0 ? [locations[locations.length - 1]] : []);

  // Marker zoom seviyesi
  const markerZoom = focusedLocation ? 18 : 15;

  return (
    <div className="map-wrapper">
      <button 
        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
        onClick={handleRefresh}
        title="Konumu Yenile"
      >
        <RefreshCw size={18} />
      </button>
      <MapContainer center={mapCenter} zoom={markerZoom} style={{ height: '100%', width: '100%', borderRadius: '16px' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <RecenterMap position={mapCenter} />
        {visibleLocations.map((loc, index) => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]}>
            <Popup>
              <div className="popup-content">
                <strong>Cihaz:</strong> {nicknames[loc.deviceId] || loc.deviceId || 'Bilinmiyor'} <br/>
                <strong>Zaman:</strong> {format(new Date(loc.time), 'dd MMM yyyy HH:mm:ss')} <br/>
                {(isHistoryMode && index === visibleLocations.length - 1) && <span className="current-badge">Son Konum</span>}
                {!isHistoryMode && <span className="current-badge">Canlı Konum</span>}
              </div>
            </Popup>
          </Marker>
        ))}
        {isHistoryMode && filteredLocations.length > 1 && (
          <Polyline positions={polyline} color="#4F46E5" weight={4} opacity={0.7} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapComponent;
