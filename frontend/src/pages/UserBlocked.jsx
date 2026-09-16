import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import './UserBlocked.css';

function UserBlocked() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      logout();
      navigate('/login');
    }, 30000);

    return () => clearTimeout(timer);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="blocked-container">
      <div className="blocked-card">
        <div className="blocked-icon">🔒</div>
        <h1>Account Blocked</h1>
        <p className="blocked-message">
          You are blocked. Suspicious activity detected.
        </p>
        <p className="blocked-submessage">
          Your account has been temporarily blocked due to suspicious activity or policy violation.
        </p>
        <div className="blocked-actions">
          <p className="contact-info">
            Please contact the administrator for further information and assistance.
          </p>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
          <p className="auto-logout-note">
            You will be automatically logged out in 30 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserBlocked;
