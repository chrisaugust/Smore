import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/FormStyle.css';

const CreateProject = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem('jwtToken');

    if (!token) {
      setError('User not authenticated. Please log in.');
      return;
    }

    try {
      await api.post('/api/v1/projects', {
        name,
        description,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
      );

      alert('Project created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  return (
    <div>
      <h1>Create a New Project</h1>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Project Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Project Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          ></textarea>
        </div>
        <button type="submit" className="form-button save-button">Create Project</button>
      </form>
    </div>
  );
};

export default CreateProject;

