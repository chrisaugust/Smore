import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/EditWorkSession.css';

const EditWorkSession = () => {
  const { projectId, workSessionId } = useParams(); // Make sure it's workSessionId
  const navigate = useNavigate();

  const [workSession, setWorkSession] = useState({
    start_time: '',
    end_time: '',
    duration: '',
    notes: '',
    date: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    const token = localStorage.getItem('jwtToken');

    const fetchWorkSessionDetails = async () => {
      try {
        const result = await api.get(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`, 
          }
        });
        setWorkSession(result.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching work session details');
        setLoading(false);
      }
    };

    fetchWorkSessionDetails();
  }, [projectId, workSessionId]); // Ensure workSessionId is used here

  const handleChange = (e) => {
    const { name, value } = e.target;
    setWorkSession((prevSession) => ({
      ...prevSession,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('jwtToken');
    try {
      await api.put(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`, workSession, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Error updating work session: ', err);
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem('jwtToken');
    const confirmed = window.confirm('Are you sure you want to delete this work session?');
    if (confirmed) {
      try {
        await api.delete(`/api/v1/projects/${projectId}/workSessions/${workSessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        navigate(`/projects/${projectId}`);
      } catch (err) {
        console.error('Error deleting work session: ', err);
      }
    }
  };

  if (loading) {
    return <div>Loading work session details...</div>;
  }

  return (
    <div className="edit-container">
      <h2>Edit Work Session</h2>
      <form onSubmit={handleSubmit} className="edit-form">
        <div className="form-group">
          <label>Duration (in minutes)</label>
          <input
            type="number"
            name="duration"
            value={workSession.duration}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={workSession.notes}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            name="date"
            value={workSession.date}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="save-button">Save Changes</button>
      </form>

      <button onClick={handleDelete} className="delete-button">
        Delete Work Session
      </button>
    </div>
  );
};

export default EditWorkSession;
