import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, DollarSign } from 'lucide-react';

const CalendarBooking = ({ service, onBookingSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 8, 17)); // September 17, 2025
  const [selectedDate, setSelectedDate] = useState(17);
  const [selectedTime, setSelectedTime] = useState(null);

  const timeSlots = service.availableSlots || [
    '8:15 PM', '8:30 PM', '8:45 PM', '9:00 PM', '9:15 PM', '9:30 PM',
    '9:45 PM', '10:00 PM', '10:15 PM', '10:30 PM', '10:45 PM'
  ];

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateSelect = (day) => {
    setSelectedDate(day);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    if (onBookingSelect) {
      onBookingSelect({
        date: `September ${selectedDate}, 2025`,
        time: time,
        service: service
      });
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate;
      const isToday = day === 17; // Highlighting the 17th as today
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors
            ${isSelected 
              ? 'bg-green-600 text-white' 
              : isToday 
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'hover:bg-gray-100'
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Calendar Section */}
        <div className="p-6 border-r">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-6">
            {renderCalendar()}
          </div>

          <p className="text-xs text-gray-500 mb-4">
            (GMT-05:00) Central Time (US & Canada)
          </p>

          {selectedDate && (
            <div>
              <h3 className="font-medium mb-3">Evening</h3>
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className={`p-2 text-sm border rounded transition-colors ${
                      selectedTime === time
                        ? 'bg-green-600 text-white border-green-600'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {selectedTime && (
                <button
                  onClick={() => onBookingSelect && onBookingSelect({
                    date: `September ${selectedDate}, 2025`,
                    time: selectedTime,
                    service: service
                  })}
                  className="w-full mt-4 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  BOOK
                </button>
              )}
            </div>
          )}
        </div>

        {/* Service Details Section */}
        <div className="p-6">
          <h1 className="text-xl font-bold mb-2">{service.title}</h1>
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {service.duration} mins
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              ${service.price}
            </span>
          </div>

          {selectedDate && selectedTime && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-800">
                September {selectedDate}, 2025, {selectedTime}
              </p>
              <p className="text-sm text-green-600">
                {service.duration} mins | ${service.price}
              </p>
            </div>
          )}

          <p className="text-gray-700 leading-relaxed">
            {service.description}
          </p>

          <div className="mt-6 flex gap-2">
            <button className="p-2 bg-blue-600 text-white rounded">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button className="p-2 bg-black text-white rounded">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarBooking;
