import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import '../styles/FormStyle.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/api/v1/users/login', {
        email,
        password,
      });

      console.log('Login response: ', response.data);

      const { token, user } = response.data;

      // Save JWT token to local storage (or cookies, depending on your strategy)
      localStorage.setItem('jwtToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Notify parent component of the logged-in user
      onLogin(user);

      // Redirect to home or projects page
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form className="form-container" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className="form-button">Login</button>
      </form>
    </div>
  );
}

export default Login;

