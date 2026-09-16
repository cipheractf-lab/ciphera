import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './MyTeam.css';

function MyTeam() {
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyTeam = async () => {
      // Wait for auth to finish loading before checking authentication
      if (loading) {
        return;
      }

      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      try {
        // Cookie sent automatically with request
        const response = await axios.get('/api/teams/my/team');

        if (response.data.success && response.data.data) {
          // Redirect to the team details page
          navigate(`/team/${response.data.data._id}`);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('You are not part of any team yet.');
        } else if (err.response?.status === 401) {
          setError('Please log in to view your team.');
          navigate('/login');
        } else {
          setError('Failed to fetch your team information.');
        }
        setPageLoading(false);
      }
    };

    fetchMyTeam();
  }, [isAuthenticated, loading, navigate]);

  if (loading || pageLoading) {
    return (
      <div className="my-team-container">
        <Loading text="LOADING TEAM..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-team-container">
        <div className="error-container">
          <div className="error-icon">
            <i className="fas fa-users-slash"></i>
          </div>
          <h2>No Team Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return null;
}

export default MyTeam;
