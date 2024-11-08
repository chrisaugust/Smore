import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Timer from './Timer';
import api from '../api';
import smoreImage from '../assets/smore.webp';

const Project = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [workSessions, setWorkSessions] = useState([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status

  const formatDuration = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hours, ${minutes} minutes`;
  };

  // Check if user is logged in by checking if the token exists in localStorage
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    console.log('Token from localStorage', token)
    if (token) {
      setIsLoggedIn(true);
      console.log('user is logged in');
    } else {
      setIsLoggedIn(false);
      console.log('user NOT logged in!!!');
    }
  }, []);

  // Function to fetch project details and work sessions
  const fetchProjectDetails = async () => {
    const token = localStorage.getItem('jwtToken');
    try {
      const projectResponse = await api.get(`/api/v1/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`, // Include the token in the Authorization header
        },
      });
      setProject(projectResponse.data);

      const workSessionsResponse = await api.get(`/api/v1/projects/${projectId}/workSessions`, {
        headers: {
          Authorization: `Bearer ${token}`, // Include the token in the Authorization header
        },
      });
      setWorkSessions(workSessionsResponse.data.work_sessions);
      setTotalDuration(formatDuration(workSessionsResponse.data.total_duration));
    } catch (err) {
      console.log('Error fetching project or work sessions', err);
    }
  };

  // Fetch project details and work sessions when component mounts or when projectId changes
  useEffect(() => {
    fetchProjectDetails(); 
  }, [projectId]);

  // Callback to re-fetch work sessions after a new session is saved
  const handleSessionSaved = () => {
    fetchProjectDetails(); // Re-fetch project details and work sessions
  };

  // Handle logout by clearing localStorage and navigating to login page
  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);  // Update login status
    navigate('/login');  // Redirect to login page
  };

  // If the project is not yet loaded, display a loading message
  if (!project) {
    return <div>Loading project details...</div>; // Show loading state until project data is fetched
  }

  return (
    <div className="Project">
      <header className="Project-header">
        <div>
          <Link to="/" style={{ textDecoration: "none", color: 'inherit' }}>
            <img src={smoreImage} 
                 style={{ display: 'inline', 
                          width: '50px', 
                          height: '50px', 
                          marginRight: '10px'
                        }}  
                 alt="S'more" 
                 className="smore-image" 
            />
            <h1 style={{ display: 'inline' }}>
              Smore
            </h1>
          </Link>

          {/* Show Logout button only if user is logged in */}
          {isLoggedIn ? (
            <button onClick={handleLogout} style={{ marginLeft: '20px', padding: '10px' }}>
              Logout
            </button>
          ) : (
            <p>User not logged in</p>
          )}
        </div>
      </header>

      <main style={{ display: 'flex', padding: '10px' }}>
        <div style={{ flex: '1' }}>
          <h2>
            Working on {' '}
            <Link to={`/projects/${projectId}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <em>{project.name}</em>
            </Link>
          </h2>
          <Timer projectId={projectId} onSessionSaved={handleSessionSaved} />
        </div>
        <div style={{ flex: '1', padding: '10px' }}>
          <h3>Completed Sessions</h3>
          <ul>
            {workSessions.length > 0 ? (
              workSessions.map((session) => (
                <li key={session.id}>
                  <Link to={`/projects/${projectId}/work_sessions/${session.id}/edit`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <strong>Date:</strong> {session.date} <br />
                    <strong>Duration:</strong> {session.duration} minutes <br />
                    {session.notes && (
                      <>
                        <strong>Notes:</strong> {session.notes} <br />
                      </>
                    )}
                  </Link>
                </li>
              ))
            ) : (
              <li>No work sessions recorded yet.</li>
            )}
          </ul>
          <h3>Total Time Spent: {totalDuration}</h3>
        </div>
      </main>
    </div>
  );
};

export default Project;

