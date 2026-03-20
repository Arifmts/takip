import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import HistoryPanel from './components/HistoryPanel';
import { History, Target, Pencil, Menu, Settings, X, Trash2 } from 'lucide-react';
import { db } from './firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, where, getDocs, writeBatch } from 'firebase/firestore';

function SettingsForm({ deviceId, config, onSave, onCancel }) {
  const [distanceFilter, setDistanceFilter] = useState(config.distanceFilter || 10);
  const [timeLimit, setTimeLimit] = useState(config.timeLimit || 30);

  return (
    <div className="settings-form">
      <div className="form-group">
        <label>Mesafe Filtresi (metre)</label>
        <input 
          type="number" 
          value={distanceFilter}
          onChange={e => setDistanceFilter(e.target.value)}
          min="1"
          max="1000"
        />
        <span className="form-hint">Cihaz hareket ettiğinde konum gönder</span>
      </div>
      <div className="form-group">
        <label>Zaman Limiti (saniye)</label>
        <input 
          type="number" 
          value={timeLimit}
          onChange={e => setTimeLimit(e.target.value)}
          min="10"
          max="3600"
        />
        <span className="form-hint">Maksimum süre (0 = sınırsız)</span>
      </div>
      <div className="form-actions">
        <button className="btn-cancel" onClick={onCancel}>İptal</button>
        <button className="btn-save" onClick={() => onSave(deviceId, distanceFilter, timeLimit)}>
          Kaydet
        </button>
      </div>
    </div>
  );
}

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [devices, setDevices] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deviceConfig, setDeviceConfig] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [focusedLocation, setFocusedLocation] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [deleteConfirmDevice, setDeleteConfirmDevice] = useState(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'locations'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueDevices = new Set();
      const locations = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.latitude && data.longitude) {
          locations.push({
            id: docSnap.id,
            lat: data.latitude,
            lng: data.longitude,
            time: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            deviceId: data.deviceId
          });
        }
        if (data.deviceId) uniqueDevices.add(data.deviceId);
      });
      const deviceList = Array.from(uniqueDevices);
      setDevices(deviceList);
      setAllLocations(locations.sort((a, b) => a.time - b.time));
      
      if (!selectedDevice && deviceList.length > 0) {
        setSelectedDevice(deviceList[0]);
      }
    });

    return () => unsubscribe();
  }, [selectedDevice]);

  // Takma isimleri dinle
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'device_nicknames'), (snapshot) => {
      const nicks = {};
      snapshot.forEach((doc) => {
        nicks[doc.id] = doc.data().nickname;
      });
      setNicknames(nicks);
    });
    return () => unsubscribe();
  }, []);

  // Cihaz ayarlarını dinle
  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'device_config'), (snapshot) => {
      const configs = {};
      snapshot.forEach((doc) => {
        configs[doc.id] = doc.data();
      });
      setDeviceConfig(configs);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenSettings = (device) => {
    setSelectedDevice(device);
    setSettingsOpen(true);
  };

  const handleSaveSettings = async (deviceId, distanceFilter, timeLimit) => {
    try {
      await setDoc(doc(db, 'device_config', deviceId), {
        distanceFilter: parseInt(distanceFilter),
        timeLimit: parseInt(timeLimit) || null,
        updatedAt: new Date()
      }, { merge: true });
      setSettingsOpen(false);
    } catch (error) {
      console.error("Ayarlar kaydedilemedi:", error);
    }
  };

  const handleEditNickname = async (e, deviceId) => {
    e.stopPropagation();
    const currentNickname = nicknames[deviceId] || '';
    const newNickname = prompt(`${deviceId} için takma isim girin:`, currentNickname);
    
    if (newNickname !== null) {
      try {
        await setDoc(doc(db, 'device_nicknames', deviceId), {
          nickname: newNickname
        });
      } catch (error) {
        console.error("Takma isim güncellenirken hata:", error);
        alert("Güncelleme başarısız oldu.");
      }
    }
  };

  const handleLocationSelect = (loc) => {
    setFocusedLocation(loc);
  };

  const handleDeleteHistory = async (deviceId) => {
    if (!window.confirm(`"${nicknames[deviceId] || deviceId}" cihazının tüm konum geçmişini silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      const q = query(collection(db, 'locations'), where('deviceId', '==', deviceId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      setDeleteConfirmDevice(null);
    } catch (error) {
      console.error("Geçmiş silinirken hata:", error);
      alert("Geçmiş silinemedi. Lütfen tekrar deneyin.");
    }
  };

  const deviceLocations = selectedDevice 
    ? allLocations.filter(loc => loc.deviceId === selectedDevice)
    : [];

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="logo-icon">
            <Target size={28} color="#ffffff" />
          </div>
          <h1>Konum Takip</h1>
        </div>

        <nav className="menu-group">
          <h3>CİHAZLAR</h3>
          <ul className="device-list">
            {devices.map((device) => (
              <li 
                key={device}
                className={`device-item ${selectedDevice === device && !isHistoryMode ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDevice(device);
                  setIsHistoryMode(false);
                  setSelectedDate(null);
                  setFocusedLocation(null);
                }}
              >
                <div className="device-info">
                  <div className="status-indicator online"></div>
                  <div className="device-name-container">
                    <span className="device-display-name">{nicknames[device] || device}</span>
                    {nicknames[device] && <span className="device-id-sub">{device}</span>}
                  </div>
                </div>
                <div style={{display: 'flex', gap: '4px'}}>
                  <button 
                    className="edit-nickname-btn"
                    onClick={(e) => handleEditNickname(e, device)}
                    title="Takma ismi düzenle"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    className="edit-nickname-btn"
                    onClick={() => handleOpenSettings(device)}
                    title="Ayarlar"
                  >
                    <Settings size={14} />
                  </button>
                  <button 
                    className="edit-nickname-btn delete-btn"
                    onClick={() => setDeleteConfirmDevice(device)}
                    title="Geçmişi Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
            {devices.length === 0 && <li className="hint">Cihaz aranıyor...</li>}
          </ul>
        </nav>

        <nav className="menu-group">
          <h3>İŞLEMLER</h3>
          <button 
            className={`btn-secondary ${isHistoryMode ? 'active-btn' : ''}`}
            onClick={() => {
              setIsHistoryMode(!isHistoryMode);
              if (!isHistoryMode) setSelectedDate(null);
            }}
          >
            <History size={16} />
            Konum Geçmişini Göster
          </button>
          <p className="hint">
            {isHistoryMode 
              ? "Şu an tüm rota geçmişini görüyorsunuz." 
              : "Şu an sadece seçili cihazın anlık konumunu görüyorsunuz."}
          </p>
        </nav>

        <div className="bottom-info">
          <p>
            Veriler Firebase Firestore üzerinden <b>gerçek zamanlı</b> olarak alınmaktadır. Mobil uygulama geliştikçe cihaz isimleri buraya otomatik eklenir.
          </p>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="topbar-title">
              {isHistoryMode ? 'Güzergah' : 'Canlı Takip'}
            </h2>
          </div>
          <div className="user-profile">
            <div className="avatar">A</div>
            <span>Admin Paneli</span>
          </div>
        </header>

        <section className="map-section">
          <MapComponent 
            selectedDevice={selectedDevice} 
            isHistoryMode={isHistoryMode} 
            nicknames={nicknames}
            selectedDate={selectedDate}
            focusedLocation={focusedLocation}
            locations={deviceLocations}
          />
        </section>

        {isHistoryMode && (
          <section className="history-section">
            <HistoryPanel 
              locations={deviceLocations}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onLocationSelect={handleLocationSelect}
            />
          </section>
        )}

        {/* Mobile Device Selector */}
        <div className="mobile-device-selector">
          <button 
            className={`history-toggle-btn ${isHistoryMode ? 'active' : ''}`}
            onClick={() => {
              setIsHistoryMode(!isHistoryMode);
              if (!isHistoryMode) setSelectedDate(null);
            }}
          >
            <History size={16} />
          </button>
          {devices.slice(0, 4).map((device) => (
            <button
              key={device}
              className={`mobile-device-chip ${selectedDevice === device && !isHistoryMode ? 'active' : ''}`}
              onClick={() => {
                setSelectedDevice(device);
                setIsHistoryMode(false);
                setSelectedDate(null);
                setFocusedLocation(null);
              }}
            >
              <span className="status-dot"></span>
              {nicknames[device] || device.substring(0, 8)}...
            </button>
          ))}
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && selectedDevice && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cihaz Ayarları</h3>
              <button className="modal-close" onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-device-name">{nicknames[selectedDevice] || selectedDevice}</p>
              <SettingsForm 
                deviceId={selectedDevice}
                config={deviceConfig[selectedDevice] || {}}
                onSave={handleSaveSettings}
                onCancel={() => setSettingsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDevice && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmDevice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header delete-header">
              <h3>Geçmişi Sil</h3>
              <button className="modal-close" onClick={() => setDeleteConfirmDevice(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-device-name">{nicknames[deleteConfirmDevice] || deleteConfirmDevice}</p>
              <p style={{marginTop: '16px', color: '#dc2626', fontSize: '0.9rem'}}>
                ⚠️ Bu cihazın tüm konum geçmişi silinecek. Bu işlem geri alınamaz!
              </p>
              <div className="form-actions" style={{marginTop: '24px'}}>
                <button className="btn-cancel" onClick={() => setDeleteConfirmDevice(null)}>
                  İptal
                </button>
                <button className="btn-delete" onClick={() => handleDeleteHistory(deleteConfirmDevice)}>
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
