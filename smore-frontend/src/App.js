import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Project from './components/Project';
import Home from './components/Home';
import CreateProject from './components/CreateProject';
import EditProject from './components/EditProject';
import EditWorkSession from './components/EditWorkSession';
import Register from './components/Register';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<Home user={user}/>} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/projects/:projectId" element={<Project />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/projects/:projectId/edit" element={<EditProject />} /> 
        <Route path="/projects/:projectId/work_sessions/:workSessionId/edit" element={<EditWorkSession />} />
      </Routes>
    </Router>
  );
}

export default App;
