import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './BlogPost.css';

function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryAfter, setRetryAfter] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Define fetchBlogPost outside useEffect so it can be reused
  const fetchBlogPost = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/blog/${id}`);

      // Handle different response formats
      if (res.data && typeof res.data === 'object') {
        if (res.data.data) {
          // If the API returns { data: {...} }
          setPost(res.data.data);
        } else {
          // If the API returns the post directly
          setPost(res.data);
        }
      } else {
        console.error('Unexpected API response format:', res.data);
        setError('Received unexpected data format from server');
        setPost(null);
      }

      setLoading(false);
      setError(null);
      setRetryAfter(null);

      // If the post has an external link, redirect to it
      const postData = res.data.data || res.data;
      if (postData && postData.externalLink) {
        window.open(postData.externalLink, '_blank');
        navigate('/blog'); // Navigate back to blog list
      }
    } catch (err) {
      console.error('Error fetching blog post:', err);

      if (err.response?.status === 429) {
        const retrySeconds = err.response.headers['retry-after'] || 60;
        setRetryAfter(retrySeconds);
        setCountdown(retrySeconds);
        setError(`Rate limit exceeded. Please try again in ${retrySeconds} seconds.`);
      } else if (!err.response) {
        setError('Network error - server may be down or unreachable');
      } else if (err.response.status === 404) {
        setError('Blog post not found');
      } else {
        setError(`Failed to load blog post: ${err.response?.data?.message || 'Unknown error'}`);
      }

      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBlogPost();
    }
  }, [id, navigate]);

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
      fetchBlogPost();
    }, 100);
  };

  if (loading) {
    return (
      <div className="blog-post-container">
        <div className="loading">Loading blog post...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-post-container">
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
        <Link to="/blog" className="back-button">Back to Blog</Link>
      </div>
    );
  }

  if (!post || !post.title) {
    return (
      <div className="blog-post-container">
        <div className="error">Blog post not found or invalid data received</div>
        <Link to="/blog" className="back-button">Back to Blog</Link>
      </div>
    );
  }

  return (
    <div className="blog-post-container">
      <div className="blog-post-header">
        <div className="post-meta">
          <span className="post-category">{post.category}</span>
          <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <h1 className="post-title">{post.title}</h1>
        <p className="post-author">By {post.author}</p>
      </div>

      {post.image && (
        <div className="post-image">
          <img src={post.image} alt={post.title} />
        </div>
      )}

      <div className="post-content">
        {post.content && typeof post.content === 'string' ? (
          <ReactMarkdown>{post.content}</ReactMarkdown>
        ) : (
          <p>No content available</p>
        )}
      </div>

      <div className="post-navigation">
        <Link to="/blog" className="back-to-blog">
          ← Back to Blog
        </Link>
        {post.externalLink && (
          <a
            href={post.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
          >
            Visit Original Source →
          </a>
        )}
      </div>
    </div>
  );
}

export default BlogPost;
