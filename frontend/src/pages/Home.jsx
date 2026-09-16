import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useAnimation, useScroll, useTransform } from 'framer-motion';
import { 
  Trophy, Target, Shield, Zap, Users, Award, 
  TrendingUp, ChevronRight, Code, Lock, Search,
  Terminal, Flag, Cpu, Database, Network, ChevronDown
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { Button } from '../components/ui';
import { Card, CardBody } from '../components/ui';
import axios from 'axios';
import './Home.css';

function Home() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const { eventName } = useSiteConfig();
  const eventSlug = eventName.toLowerCase().replace(/\s+/g, '-');
  const navigate = useNavigate();
  const [terminalText, setTerminalText] = useState('');
  const [terminalLine, setTerminalLine] = useState(0);
  const [teamStats, setTeamStats] = useState(null);
  
  // Scroll progress
  const { scrollYProgress } = useScroll();
  
  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const terminalCommands = [
    `$ sudo ./${eventSlug} --init`,
    '[✓] System initialized...',
    '[✓] Connecting to challenge matrix...',
    '[✓] Loading exploit frameworks...',
    '[✓] Scanning for vulnerabilities...',
    '[!] Access granted. Ready to hack.',
    '$ exploit --start_',
  ];

  // Fetch team stats
  useEffect(() => {
    const fetchTeamStats = async () => {
      if (isAuthenticated && user?.team) {
        try {
          // Extract team ID properly (handle both string and object cases)
          const teamId = user.team._id || user.team;
          const response = await axios.get(`/api/teams/${teamId}`);
          if (response.data && response.data.data) {
            setTeamStats(response.data.data);
            // Team stats loaded successfully
          }
        } catch (error) {
          console.error('Error fetching team stats:', error);
        }
      }
    };
    fetchTeamStats();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (terminalLine < terminalCommands.length) {
      const command = terminalCommands[terminalLine];
      let charIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (charIndex <= command.length) {
          setTerminalText(prev => {
            const lines = prev.split('\n');
            lines[terminalLine] = command.substring(0, charIndex);
            return lines.join('\n');
          });
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            setTerminalLine(prev => prev + 1);
            setTerminalText(prev => prev + '\n');
          }, 500);
        }
      }, 50);

      return () => clearInterval(typeInterval);
    }
  }, [terminalLine]);

  const features = [
    {
      icon: <Code size={28} />,
      title: "Web Exploitation",
      description: "Master XSS, SQL injection, and advanced web vulnerabilities",
      color: "#00ff88",
      bgColor: "rgba(168, 85, 247, 0.1)"
    },
    {
      icon: <Lock size={28} />,
      title: "Cryptography",
      description: "Break ciphers and understand cryptographic protocols",
      color: "#A855F7",
      bgColor: "rgba(168, 85, 247, 0.1)"
    },
    {
      icon: <Search size={28} />,
      title: "Forensics",
      description: "Investigate artifacts and recover hidden data",
      color: "#ff00ff",
      bgColor: "rgba(255, 0, 255, 0.1)"
    },
    {
      icon: <Cpu size={28} />,
      title: "Reverse Engineering",
      description: "Disassemble binaries, analyze code, and break protections",
      color: "#ff0055",
      bgColor: "rgba(255, 0, 85, 0.1)"
    },
    {
      icon: <Database size={28} />,
      title: "OSINT",
      description: "Open source intelligence and reconnaissance",
      color: "#ffc107",
      bgColor: "rgba(255, 193, 7, 0.1)"
    },
    {
      icon: <Network size={28} />,
      title: "Miscellaneous",
      description: "Unique challenges that don't fit traditional categories",
      color: "#bd00ff",
      bgColor: "rgba(189, 0, 255, 0.1)"
    }
  ];

  return (
    <div className="htb-home-container">
      {/* Scroll Progress Bar */}
      <motion.div 
        className="htb-scroll-progress"
        style={{ scaleX: scrollYProgress }}
      />
      
      {/* Animated Grid Background */}
      <motion.div 
        className="htb-home-grid-bg"
        style={{ y: y1 }}
      />
      
      {/* Hero Section with Floating Terminal */}
      <section className="htb-hero-section">
        <div className="htb-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="htb-hero-text"
          >
            <motion.div 
              className="htb-hero-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Shield size={16} />
              <span>{eventName.toUpperCase()}</span>
            </motion.div>

            <h1 className="htb-hero-title">
              HACK THE
              <br />
              <span className="htb-gradient-text">IMPOSSIBLE</span>
            </h1>

            <p className="htb-hero-description">
              Challenge yourself with cutting-edge cybersecurity puzzles.
              Compete with elite hackers. Dominate the leaderboard.
            </p>

            <div className="htb-hero-actions">
              {isAuthenticated ? (
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => navigate('/challenges')}
                >
                  START HACKING
                </Button>
              ) : (
                <>
                  <Button 
                    variant="primary" 
                    size="lg"
                    onClick={() => navigate('/register')}
                  >
                    REGISTER NOW
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate('/login')}
                  >
                    SIGN IN
                  </Button>
                </>
              )}
              <Button 
                variant="ghost" 
                size="lg"
                onClick={() => navigate('/scoreboard')}
              >
                LEADERBOARD
              </Button>
            </div>

            {isAuthenticated && user && (
              <motion.div 
                className="htb-user-quick-stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <div className="htb-quick-stat">
                  <Trophy size={20} />
                  <div>
                    <span className="htb-stat-value">{teamStats?.totalPoints || 0}</span>
                    <span className="htb-stat-label">Points</span>
                  </div>
                </div>
                <div className="htb-quick-stat">
                  <Flag size={20} />
                  <div>
                    <span className="htb-stat-value">{teamStats?.solvedChallenges || 0}</span>
                    <span className="htb-stat-label">Flags</span>
                  </div>
                </div>
                <div className="htb-quick-stat">
                  <TrendingUp size={20} />
                  <div>
                    <span className="htb-stat-value">#{teamStats?.rank || '—'}</span>
                    <span className="htb-stat-label">Rank</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Floating Terminal */}
          <motion.div
            className="htb-floating-terminal"
            initial={{ opacity: 0, x: 50, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <div className="htb-terminal-header">
              <div className="htb-terminal-buttons">
                <span className="htb-terminal-btn htb-terminal-close"></span>
                <span className="htb-terminal-btn htb-terminal-minimize"></span>
                <span className="htb-terminal-btn htb-terminal-maximize"></span>
              </div>
              <div className="htb-terminal-title">
                <Terminal size={14} />
                <span>root@{eventSlug}:~#</span>
              </div>
            </div>
            <div className="htb-terminal-body">
              <pre className="htb-terminal-text">{terminalText}<span className="htb-terminal-cursor">|</span></pre>
            </div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <motion.div 
          className="htb-floating-element htb-float-1"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Lock size={24} />
        </motion.div>
        <motion.div 
          className="htb-floating-element htb-float-2"
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Code size={24} />
        </motion.div>
        <motion.div 
          className="htb-floating-element htb-float-3"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Shield size={24} />
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="htb-scroll-indicator"
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
          }}
          transition={{ delay: 1.5 }}
          onClick={() => {
            document.querySelector('.htb-categories-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <motion.div
            className="htb-scroll-icon"
            animate={{ 
              y: [0, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <ChevronDown size={28} />
            <ChevronDown size={28} />
          </motion.div>
          <span className="htb-scroll-text">Scroll to explore</span>
        </motion.div>
      </section>

      {/* Challenge Categories */}
      <section className="htb-categories-section">
        <motion.div 
          className="htb-section-header"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="htb-section-header-content">
            <span className="htb-section-tag">PLATFORM</span>
            <h2 className="htb-section-title">CHALLENGE CATEGORIES</h2>
          </div>
        </motion.div>

        <motion.div 
          className="htb-categories-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.08 }
            }
          }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              className="htb-category-card"
              style={{ 
                '--card-color': feature.color,
                '--card-bg': feature.bgColor
              }}
              onClick={() => navigate('/challenges')}
            >
              <div className="htb-category-header">
                <div className="htb-category-icon" style={{ 
                  color: feature.color,
                  borderColor: feature.color 
                }}>
                  {feature.icon}
                </div>
                <div className="htb-category-arrow">
                  <ChevronRight size={20} style={{ color: feature.color }} />
                </div>
              </div>
              <h3 className="htb-category-title">{feature.title}</h3>
              <p className="htb-category-description">{feature.description}</p>
              <div className="htb-category-glow" style={{ background: `radial-gradient(circle at center, ${feature.color}15 0%, transparent 70%)` }}></div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="htb-cta-section">
        <motion.div 
          className="htb-cta-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="htb-cta-content">
            <h2 className="htb-cta-title">READY TO COMPETE?</h2>
            <p className="htb-cta-description">
              {isAuthenticated 
                ? "Your next challenge awaits. Start solving and climb the leaderboard."
                : "Join thousands of hackers and prove your skills in the arena."}
            </p>
            <div className="htb-cta-actions">
              {isAuthenticated ? (
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => navigate('/challenges')}
                >
                  GO TO CHALLENGES
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => navigate('/register')}
                >
                  JOIN NOW
                </Button>
              )}
            </div>
          </div>
          <div className="htb-cta-glow"></div>
        </motion.div>
      </section>
    </div>
  );
}

export default Home;