import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Loading } from '../components/ui';
import './Blog.css';

function Blog() {
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Define fetchBlogPosts outside useEffect so it can be reused
  const fetchBlogPosts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/blog');
      // Ensure we're getting an array of blog posts
      if (Array.isArray(res.data)) {
        setBlogPosts(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setBlogPosts(res.data.data);
      } else {
        console.error('Unexpected API response format:', res.data);
        setBlogPosts([]);
        setError('Received unexpected data format from server');
      }
      setLoading(false);
      setError(null);
      setRetryAfter(null);
    } catch (err) {
      console.error('Error fetching blog posts:', err);

      if (err.response?.status === 429) {
        const retrySeconds = err.response.headers['retry-after'] || 60;
        setRetryAfter(retrySeconds);
        setCountdown(retrySeconds);
        setError(`Rate limit exceeded. Please try again in ${retrySeconds} seconds.`);
      } else if (!err.response) {
        setError('Network error - server may be down or unreachable');
      } else if (err.response.status === 404) {
        setError('Blog posts not found');
      } else {
        setError(`Failed to load blog posts: ${err.response?.data?.message || 'Unknown error'}`);
      }

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        setError(`Rate limit exceeded. Please try again in ${countdown - 1} seconds.`);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const retryFetch = () => {
    setError(null);
    setRetryAfter(null);

    setTimeout(() => {
      fetchBlogPosts();
    }, 100);
  };

  if (loading) {
    return (
      <div className="blog-container">
        <Loading text="LOADING POSTS..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-container">
        <div className="error">{error}</div>
        {retryAfter ? (
          <div className="retry-info">
            <p>Please wait {retryAfter} seconds before trying again.</p>
            <button
              onClick={retryFetch}
              className="retry-button"
              disabled={countdown > 0}
            >
              {countdown > 0 ? `Retry in ${countdown}s` : 'Retry Now'}
            </button>
          </div>
        ) : (
          <button onClick={retryFetch} className="retry-button">
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="blog-container">
      <div className="blog-header">
        <h1>Cyber Security <span className="highlight">Blog</span></h1>
        <p>Stay updated with the latest security insights and CTF strategies</p>
      </div>

      <div className="blog-posts">
        {blogPosts.length > 0 ? (
          blogPosts.map(post => (
            <div key={post._id} className="blog-post">
              <div className="post-header">
                <span className="post-category">{post.category}</span>
                <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <h2>{post.title}</h2>
              <p className="post-author">By {post.author}</p>
              <div className="post-content">
                {post.content && typeof post.content === 'string' ? (
                  <ReactMarkdown>{post.content.substring(0, 300) + '...'}</ReactMarkdown>
                ) : (
                  <p>No content available</p>
                )}
              </div>
              {post.externalLink ? (
                <a
                  href={post.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="read-more"
                >
                  Read More
                </a>
              ) : (
                <a href={`/blog/${post._id}`} className="read-more">Read More</a>
              )}
            </div>
          ))
        ) : (
          <div className="no-posts">
            <p>No blog posts available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog;