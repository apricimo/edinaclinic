import React, { useState, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, Settings, Monitor } from 'lucide-react';

const VideoAppointment = ({ appointment, onEndCall }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    // Simulate connection process
    const connectionTimer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);

    // Start call duration timer
    const durationTimer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(connectionTimer);
      clearInterval(durationTimer);
    };
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // TODO: Integrate with Chime SDK to toggle video
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    // TODO: Integrate with Chime SDK to toggle audio
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // TODO: Integrate with Chime SDK for screen sharing
  };

  const handleEndCall = () => {
    // TODO: Clean up Chime SDK connection
    onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">{appointment.service.title}</h2>
            <p className="text-sm text-gray-300">
              Dr. {appointment.service.provider} • {formatDuration(callDuration)}
            </p>
            <p className="text-xs text-gray-400">
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connected'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            <span className="text-sm">
              {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex h-full">
        {/* Remote Video (Doctor) */}
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
          {connectionStatus === 'connected' ? (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              {/* Placeholder for remote video */}
              <div className="text-center text-white">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold">Dr</span>
                </div>
                <p className="text-lg">Dr. {appointment.service.provider}</p>
                <p className="text-sm text-gray-300">Video call in progress</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-white">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Connecting to your appointment...</p>
            </div>
          )}
        </div>

        {/* Local Video (Patient) */}
        <div className="w-80 h-60 absolute bottom-20 right-6 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
          <div className="w-full h-full flex items-center justify-center">
            {isVideoOn ? (
              <div className="text-center text-white">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-bold">You</span>
                </div>
                <p className="text-sm">Your video</p>
              </div>
            ) : (
              <div className="text-center text-white">
                <VideoOff className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Video off</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-6">
        <div className="flex justify-center items-center gap-4">
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isAudioOn 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isVideoOn 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              isScreenSharing 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <Monitor className="w-6 h-6" />
          </button>

          {/* Settings */}
          <button className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors">
            <Settings className="w-6 h-6" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
          >
            <Phone className="w-6 h-6 transform rotate-[225deg]" />
          </button>
        </div>

        {/* Call Info */}
        <div className="text-center mt-4 text-white text-sm">
          <p>Duration: {formatDuration(callDuration)}</p>
          <p className="text-gray-300">
            Appointment: {appointment.date} at {appointment.time}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoAppointment;
