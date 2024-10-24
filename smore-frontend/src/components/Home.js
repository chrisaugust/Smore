import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import smoreImage from '../assets/smore.webp';
import Register from './Register';

const Home = () => {
  const [projects, setProjects] = useState([]);
  const [user, setUser] = useState(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('jwtToken');

    if (loggedInUser && token) {
      setUser(loggedInUser);

      const fetchProjects = async () => {
        try {
          const response = await api.get('/api/v1/projects', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setProjects(response.data);
        } catch (err) {
          console.log("Error fetching projects:", err);
          setUser(null);
        }
      };

      fetchProjects();
    } else {
      setUser(null);
    }
  }, []);

  const handleLoginRedirect = () => {
    navigate('/login'); // Redirect to login page when button is clicked
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');  // Clear the token from localStorage
    localStorage.removeItem('user')
    navigate('/login');
  };

  const toggleRegisterForm = () => {
    setShowRegisterForm(!showRegisterForm); // Toggle the showRegister state
  };


  return (
    <div>
      <header className="Home-header">
        <div>
          <img src={smoreImage} 
               style={{ display: 'inline', 
                        width: '50px', 
                        height: '50px', 
                        marginRight: '10px'
                      }}  
               alt="S'more" 
               className="smore-image" 
          />  
          <h1 style={{display: 'inline'}}>
            Smore
          </h1>
          {user ? (
            <button onClick={handleLogout} style={{ marginLeft: '20px', padding: '10px' }}>
              Logout
            </button>
          ) : (
            <button onClick={handleLoginRedirect} style={{ marginLeft: '20px', padding: '10px' }}>
              Login
            </button>
          )}
        </div>
      </header>

      {user ? (
        <div>
          <p>{`User ${user.email} is logged in`}</p>

          <h2>Active Projects</h2>
          <ul>
            {projects.length > 0 ? (
              projects.map((project) => (
        
                <li key={project.id}>
                  <Link to={`/projects/${project.id}`}>{project.name}</Link>
                </li>
              ))
            ) : (
              <li>No projects found</li>
            )}
          </ul>
          <Link to="/create-project">Create New Project</Link>
        </div>
      ) : (
        <div>
          <h2>Welcome to Smore!</h2>
          <h3>A time tracking app to help you track and visualize your work sessions...</h3>
          <p>Please log in or register to access your projects.</p>
          <br />
          <button onClick={toggleRegisterForm}>
            {showRegisterForm ? 'Hide Registration Form' : 'Register'}
          </button>
          {showRegisterForm && <Register setUser={setUser} />}
        </div>
      )}
    </div>
  );
};

export default Home;

