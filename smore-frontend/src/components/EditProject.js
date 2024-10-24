import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link, useParams, useNavigate } from 'react-router-dom';
import '../styles/EditProject.css';

const EditProject = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState({
    name: '',
    description: '',
    status: '',
    user_id: '',
  });

  const [loading, setLoading] = useState(true);

  // Fetch the current project details on load
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    const fetchProject = async () => {
      try {
        const response = await api.get(`/api/v1/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer: ${token}`,
          },
        });
        setProject(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching project details', error);
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject((prevProject) => ({
      ...prevProject,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    const token = localStorage.getItem('jwtToken');
    e.preventDefault();
    try {
      await api.put(`/api/v1/projects/${projectId}`, project, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate(`/projects/${projectId}`); // Redirect to the project details page after update
    } catch (error) {
      console.error('Error updating project', error);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure? There's no CTR-Z for this...");
    const token = localStorage.getItem('jwtToken');

    if (confirmed) {
      try {
        await api.delete(`/api/v1/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        navigate('/');
      } catch (err) {
        console.error('Error deleting project:', err);
      }
    }
  };



  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="edit-container">
      <h2>Edit Project</h2>
      <form onSubmit={handleSubmit} className="edit-form">
        <div className="form-group">
          <label>Project Name</label>
          <input
            type="text"
            name="name"
            value={project.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={project.description}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <input
            type="text"
            name="status"
            value={project.status}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>User ID</label>
          <input
            type="text"
            name="user_id"
            value={project.user_id}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="save-button">Save Changes</button>
        <button onClick={handleDelete} className="delete-button">
          Delete Project
        </button>
      </form>
    </div>
  );
};

export default EditProject;
