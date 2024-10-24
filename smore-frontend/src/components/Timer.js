import React, { useState, useEffect } from 'react';
import api from '../api';


const Timer = ({ projectId, onSessionSaved }) => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // For display purposes
  const [notes, setNotes] = useState('');

  // Timer logic to update the elapsed time
  useEffect(() => {
    let timer = null;
    if (isActive) {
      timer = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    } else if (!isActive && startTime !== null) {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isActive, startTime]);

  const handleStart = () => {
    setStartTime(Date.now());
    setIsActive(true);
  };

  const handleStop = () => {
    const now = Date.now();
    setEndTime(now);
    setDuration(Math.floor((now - startTime) / 1000)); // Convert duration to seconds
    setIsActive(false);
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('jwtToken');  // Get token from localStorage

      if (!token) {
        alert('User not authenticated. Please log in.');
        return;
      }

      const formattedStartTime = new Date(startTime).toISOString();
      const formattedEndTime = new Date(endTime).toISOString();

      let durationInMinutes = Math.floor(duration / 60);
      if (durationInMinutes < 1) {
        durationInMinutes = 1;
      }

      await api.post(
        `/api/v1/projects/${projectId}/workSessions`,
        {
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          duration: durationInMinutes,
          notes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert('Work session saved successfully');
      resetTimer();
      onSessionSaved();  // Call the callback to notify Project.js
    } catch (error) {
      console.error('Error saving work session', error);
      alert('Failed to save work session. Please try again.');
    }
  };

  const resetTimer = () => {
    setStartTime(null);
    setEndTime(null);
    setDuration(0);
    setElapsedTime(0);
    setNotes('');
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer">
      <h3>Session Timer</h3>
      <div className="time-display">
        <span>{formatTime(elapsedTime)}</span>
      </div>
      <div className="controls">
        {!isActive && !startTime ? (
          <button onClick={handleStart}>Start</button>
        ) : isActive ? (
          <button onClick={handleStop}>Stop</button>
        ) : (
          <>
            <button onClick={handleSave}>Save</button>
            <button onClick={resetTimer}>Reset</button>
          </>
        )}
      </div>
      <div className="notes-section">
        <textarea
          placeholder="Add notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
};

export default Timer;

