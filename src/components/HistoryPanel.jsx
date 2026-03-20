import React, { useState } from 'react';
import { Calendar, ChevronRight, MapPin, Clock } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const HistoryPanel = ({ locations, onLocationSelect, selectedDate, onDateChange }) => {
  const [expandedDays, setExpandedDays] = useState({});

  const toggleDay = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const groupLocationsByDate = (locs) => {
    const grouped = {};
    locs.forEach(loc => {
      const dateKey = format(new Date(loc.time), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(loc);
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const formatDateHeader = (dateKey) => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(date, today)) return 'Bugün';
    if (isSameDay(date, yesterday)) return 'Dün';
    return format(date, 'd MMMM yyyy, EEEE', { locale: tr });
  };

  const groupedLocations = groupLocationsByDate(locations);
  const totalLocations = locations.length;

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>Konum Geçmişi</h3>
        <input
          type="date"
          value={selectedDate || ''}
          onChange={(e) => onDateChange(e.target.value)}
          className="date-input"
        />
      </div>
      <div className="history-stats">
        <span><MapPin size={14} /> {totalLocations} kayıt</span>
        <span><Clock size={14} /> {groupedLocations.length} gün</span>
      </div>
      <div className="history-list">
        {groupedLocations.length === 0 ? (
          <div className="history-empty">
            <Calendar size={32} />
            <p>Bu tarihte kayıt bulunamadı</p>
          </div>
        ) : (
          groupedLocations.map(([dateKey, dayLocations]) => (
            <div key={dateKey} className="day-group">
              <div className="day-header" onClick={() => toggleDay(dateKey)}>
                <span>{formatDateHeader(dateKey)}</span>
                <span className="day-count">{dayLocations.length} kayıt</span>
                <ChevronRight size={18} className={`day-chevron ${expandedDays[dateKey] ? 'expanded' : ''}`} />
              </div>
              {expandedDays[dateKey] && (
                <div className="day-locations">
                  {dayLocations.map((loc) => (
                    <div key={loc.id} className="location-item" onClick={() => onLocationSelect?.(loc)}>
                      <div className="location-time">{format(new Date(loc.time), 'HH:mm:ss')}</div>
                      <div className="location-coords">
                        <span>{parseFloat(loc.lat).toFixed(6)}</span>
                        <span>{parseFloat(loc.lng).toFixed(6)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
