import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import './Tutorials.css';

function Tutorials() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    difficulty: 'all',
    category: 'all',
    search: ''
  });
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        if (!isAuthenticated) {
          setError('You must be logged in to view tutorials');
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/tutorials');
        if (response.data.success) {
          setTutorials(response.data.tutorials);
        } else {
          setError('Failed to fetch tutorials');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Authentication required. Please log in.');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Error fetching tutorials');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, [isAuthenticated, navigate]);

  const handleStartTutorial = (tutorial) => {
    if (tutorial.link) {
      if (tutorial.link.startsWith('http://') || tutorial.link.startsWith('https://')) {
        window.open(tutorial.link, '_blank');
      } else {
        navigate(tutorial.link);
      }
    } else {
      navigate(`/tutorials/${tutorial._id}`);
    }
  };

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesDifficulty = filter.difficulty === 'all' || tutorial.difficulty === filter.difficulty;
    const matchesCategory = filter.category === 'all' || tutorial.category === filter.category;
    const matchesSearch = tutorial.title.toLowerCase().includes(filter.search.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(filter.search.toLowerCase());
    return matchesDifficulty && matchesCategory && matchesSearch;
  });

  const categories = [...new Set(tutorials.map(tutorial => tutorial.category))];
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  if (loading) {
    return (
      <div className="tutorials-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading tutorials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tutorials-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tutorials-container">
      <div className="tutorials-header">
        <h1>Cyber Security <span className="highlight">Tutorials</span></h1>
        <p>Comprehensive guides to help you master cyber security concepts</p>
      </div>

      <div className="tutorials-filters">
        <div className="search-box">
          <div className="particles">
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
            <div className="particle"></div>
          </div>
          <div className="holographic-overlay"></div>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tutorials..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
          >
            <option value="all">All Difficulties</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredTutorials.length === 0 ? (
        <div className="no-tutorials">
          <div className="no-results-icon">🔍</div>
          <p>No tutorials found matching your criteria.</p>
          <button onClick={() => setFilter({ difficulty: 'all', category: 'all', search: '' })}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="tutorials-grid">
          {filteredTutorials.map(tutorial => (
            <div key={tutorial._id} className="tutorial-card">
              <div className={`tutorial-level ${tutorial.difficulty}`}>
                {tutorial.difficulty}
              </div>
              <div className="tutorial-content">
                <h2>{tutorial.title}</h2>
                <p className="tutorial-duration">
                  <span className="duration-icon">⏱️</span>
                  {tutorial.estimatedTime}
                </p>
                <p className="tutorial-description">{tutorial.description}</p>
                <div className="tutorial-category">
                  <span className="category-icon">📁</span>
                  {tutorial.category}
                </div>
                {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
                  <div className="prerequisites-list">
                    <h3>
                      <span className="prerequisites-icon">📋</span>
                      Prerequisites:
                    </h3>
                    <ul>
                      {tutorial.prerequisites.map((prerequisite, index) => (
                        <li key={index}>{prerequisite}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="tutorial-meta">
                  <span className="author">
                    <span className="author-icon">👤</span>
                    {tutorial.author?.username || 'Admin'}
                  </span>
                  <span className="updated">
                    <span className="updated-icon">🕒</span>
                    {new Date(tutorial.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                className="start-tutorial"
                onClick={() => handleStartTutorial(tutorial)}
              >
                Click Here
                <span className="arrow-icon">→</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tutorials;