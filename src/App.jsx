import React, { useState, useEffect } from 'react';
import MapComponent from './components/MapComponent';
import { History, Target, Pencil, Menu } from 'lucide-react';
import { db } from './firebase';
import { collection, query, onSnapshot, orderBy, doc, setDoc } from 'firebase/firestore';

function App() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [devices, setDevices] = useState([]);
  const [nicknames, setNicknames] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'locations'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const uniqueDevices = new Set();
      snapshot.forEach((doc) => {
        const dId = doc.data().deviceId;
        if (dId) uniqueDevices.add(dId);
      });
      const deviceList = Array.from(uniqueDevices);
      setDevices(deviceList);
      
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
                }}
              >
                <div className="device-info">
                  <div className="status-indicator online"></div>
                  <div className="device-name-container">
                    <span className="device-display-name">{nicknames[device] || device}</span>
                    {nicknames[device] && <span className="device-id-sub">{device}</span>}
                  </div>
                </div>
                <button 
                  className="edit-nickname-btn"
                  onClick={(e) => handleEditNickname(e, device)}
                  title="Takma ismi düzenle"
                >
                  <Pencil size={14} />
                </button>
              </li>
            ))}
            {devices.length === 0 && <li className="hint">Cihaz aranıyor...</li>}
          </ul>
        </nav>

        <nav className="menu-group">
          <h3>İŞLEMLER</h3>
          <button 
            className={`btn-secondary ${isHistoryMode ? 'active-btn' : ''}`}
            onClick={() => setIsHistoryMode(!isHistoryMode)}
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
          />
        </section>

        {/* Mobile Device Selector */}
        <div className="mobile-device-selector">
          <button 
            className={`history-toggle-btn ${isHistoryMode ? 'active' : ''}`}
            onClick={() => setIsHistoryMode(!isHistoryMode)}
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
              }}
            >
              <span className="status-dot"></span>
              {nicknames[device] || device.substring(0, 8)}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
