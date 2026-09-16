import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Flag,
  Award,
  Users,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Input, Card, CardHeader, CardBody, Loading } from '../components/ui';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import './Challenges.css';

const getChallengePreview = (description) => {
  if (!description) {
    return 'Challenge briefing will appear here once the task is published.';
  }

  return description.length > 148 ? `${description.slice(0, 148).trim()}...` : description;
};

const getSolveCount = (challenge) => challenge.solvedBy?.length || challenge.solves?.length || 0;

function ChallengeTile({ challenge, solved, onOpen }) {
  const solveCount = getSolveCount(challenge);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div className="challenge-card-shell">
      <GlowingEffect
        spread={34}
        glow={true}
        disabled={false}
        proximity={86}
        inactiveZone={0.16}
        borderWidth={2}
      />

      <Card
        className={`challenge-card ${solved ? 'solved' : ''}`}
        hover
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <CardHeader className="challenge-card-header">
          <div className="challenge-header">
            <div className="challenge-title-row">
              <span className="challenge-category">{challenge.category || 'General'}</span>
              {solved && (
                <span className="challenge-status">
                  <CheckCircle className="solved-icon" size={16} />
                  Solved
                </span>
              )}
            </div>
            <h3 className="challenge-title">{challenge.title}</h3>
          </div>
        </CardHeader>

        <CardBody className="challenge-card-body">
          <p className="challenge-description">{getChallengePreview(challenge.description)}</p>

          <div className="challenge-footer">
            <div className="challenge-stats">
              <div className="stat">
                <Award size={16} />
                <span>{challenge.points || 0} pts</span>
              </div>
              <div className="stat">
                <Users size={16} />
                <span>{solveCount} solves</span>
              </div>
            </div>

            <span className="challenge-open-indicator">
              <ChevronRight className="arrow-icon" size={18} />
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Challenges() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [challenges, setChallenges] = useState([]);
  const [filteredChallenges, setFilteredChallenges] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'All Categories', icon: null }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('points'); // points, solves, title
  const [stats, setStats] = useState({ solved: 0, remaining: 0, total: 0 });
  
  useEffect(() => {
    fetchCategories();
    fetchChallenges();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      console.log('Categories API response:', response.data);
      
      // Handle different response formats
      const categoriesData = response.data.data || response.data;
      
      if (Array.isArray(categoriesData)) {
        const fetchedCategories = categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: null
        }));
        setCategories([{ id: 'all', name: 'All Categories', icon: null }, ...fetchedCategories]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      console.error('Error response:', error.response?.data);
      // Keep default 'All Categories' if fetch fails
    }
  };

  useEffect(() => {
    filterChallenges();
  }, [challenges, searchTerm, selectedCategory, sortBy]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/challenges?page=1&limit=1000');
      setChallenges(res.data.data || []);
      // Use stats from backend if available
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterChallenges = () => {
    let filtered = [...challenges];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c =>
        c.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'points':
          return (b.points || 0) - (a.points || 0);
        case 'solves':
          return (b.solves?.length || 0) - (a.solves?.length || 0);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredChallenges(filtered);
  };

  const isSolved = (challengeId) => {
    // Use isSolved flag from backend if available
    const challenge = challenges.find(c => c._id === challengeId);
    if (challenge && typeof challenge.isSolved !== 'undefined') {
      return challenge.isSolved;
    }
    // Fallback to user data
    return user?.solvedChallenges?.includes(challengeId);
  };

  const handleChallengeClick = (challengeId) => {
    navigate(`/challenges/${challengeId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="challenges-page-shell">
        <div className="challenges-page-bg" aria-hidden="true" />
        <div className="challenges-orb challenges-orb--primary" aria-hidden="true" />
        <div className="challenges-orb challenges-orb--secondary" aria-hidden="true" />
        <div className="challenges-orb challenges-orb--tertiary" aria-hidden="true" />
        <div className="challenges-page">
          <div className="challenges-page-content">
            <Loading text="LOADING CHALLENGES..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="challenges-page-shell">
      <div className="challenges-page-bg" aria-hidden="true" />
      <div className="challenges-orb challenges-orb--primary" aria-hidden="true" />
      <div className="challenges-orb challenges-orb--secondary" aria-hidden="true" />
      <div className="challenges-orb challenges-orb--tertiary" aria-hidden="true" />

      <div className="challenges-page">
        <div className="challenges-page-content">
        <div className="challenges-header">
          <motion.div
            className="header-content"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="header-title-section">
              <h1 className="page-title">
                <Flag className="title-icon" />
                Challenges
              </h1>
              <p className="page-description">
                Browse the active board in a tighter glass layout with less visual noise and faster scanning.
              </p>
            </div>

            <div className="header-stats">
              <div className="stat-box">
                <Award className="stat-icon" />
                <div>
                  <span className="stat-number">{stats.solved}</span>
                  <span className="stat-label">Solved</span>
                </div>
              </div>
              <div className="stat-box">
                <Clock className="stat-icon" />
                <div>
                  <span className="stat-number">{stats.remaining}</span>
                  <span className="stat-label">Remaining</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="challenges-filters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="filters-card" hover={false}>
            <CardBody className="filters-card-body">
              <div className="filter-section">
                <Input
                  type="text"
                  placeholder="Search challenges..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  icon={<Search size={16} />}
                />
              </div>

              <div className="filter-section">
                <label className="filter-label">
                  <Filter size={16} />
                  Category
                </label>
                <div className="filter-buttons">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      className={`filter-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-group">
                  <label className="filter-label">Sort By</label>
                  <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="points">Points</option>
                    <option value="solves">Solves</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        <div className="results-info">
          <span className="results-count">
            {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} found
          </span>
        </div>

        <motion.div
          className="challenges-grid"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {filteredChallenges.length === 0 ? (
              <motion.div
                className="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Search size={48} />
                <h3>No challenges found</h3>
                <p>Try adjusting your filters</p>
              </motion.div>
            ) : (
              filteredChallenges.map((challenge) => (
                <motion.div key={challenge._id} variants={itemVariants} layout>
                  <ChallengeTile
                    challenge={challenge}
                    solved={isSolved(challenge._id)}
                    onOpen={() => handleChallengeClick(challenge._id)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Challenges;
