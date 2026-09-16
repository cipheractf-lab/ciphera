import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './CreateChallenge.css';

function CreateChallenge() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'web',
    difficulty: 'Easy',
    points: 100,
    flag: '',
    hints: [{ content: '', cost: 0 }],
    isVisible: true,
    // Dynamic scoring fields
    function: 'static',
    initial: 500,
    minimum: 100,
    decay: 20
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const { title, description, category, difficulty, points, flag } = formData;

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/challenges');
    }
  }, [isAuthenticated, user, navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'points' || name === 'initial' || name === 'minimum' || name === 'decay'
        ? parseInt(value, 10) || ''
        : value
    });
    setFormError('');
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const handleHintChange = (index, field, value) => {
    const newHints = [...formData.hints];
    newHints[index] = { ...newHints[index], [field]: value };
    setFormData({ ...formData, hints: newHints });
  };

  const addHint = () => {
    setFormData({
      ...formData,
      hints: [...formData.hints, { content: '', cost: 0 }]
    });
  };

  const removeHint = (index) => {
    const newHints = formData.hints.filter((_, i) => i !== index);
    setFormData({ ...formData, hints: newHints });
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!title || !description || !category || !difficulty || !points || !flag) {
      setFormError('Please fill in all fields');
      return;
    }

    // Filter out empty hints
    const validHints = formData.hints.filter(hint => hint.content.trim() !== '');

    setIsSubmitting(true);

    try {
      const challengeData = {
        ...formData,
        hints: validHints
      };

      // For static challenges, don't send dynamic fields (set to null)
      if (formData.function === 'static') {
        challengeData.initial = null;
        challengeData.minimum = null;
        challengeData.decay = null;
      }

      const res = await axios.post(
        '/api/challenges',
        challengeData
      );

      const challengeId = res?.data?.data?._id || res?.data?.data?.id;

      if (!challengeId) {
        throw new Error('Challenge was created but no challenge ID was returned');
      }

      // Upload files if any selected
      if (selectedFiles.length > 0) {
        setSuccessMessage('Challenge created! Uploading files...');
        const fileFormData = new FormData();
        selectedFiles.forEach(file => {
          fileFormData.append('files', file);
        });

        try {
          await axios.post(
            `/api/challenges/${challengeId}/files`,
            fileFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
              timeout: 120000 // 120 seconds for large file uploads
            }
          );
          setSuccessMessage('Challenge and files uploaded successfully!');
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr);
          setSuccessMessage('Challenge created but file upload failed. Redirecting to edit page...');
        }
      } else {
        setSuccessMessage('Challenge created successfully!');
      }
      
      setTimeout(() => {
        navigate(`/edit-challenge/${challengeId}`);
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-challenge-container">
      <div className="create-challenge-card">
        <div className="create-challenge-header">
          <h2>Create New <span className="highlight">Challenge</span></h2>
          <p>Add a new challenge to the platform</p>
        </div>

        {formError && <div className="form-error">{formError}</div>}
        {successMessage && <div className="form-success">{successMessage}</div>}

        <form onSubmit={onSubmit} className="challenge-form">
          <div className="form-group">
            <label htmlFor="title">Challenge Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={onChange}
              placeholder="Enter a title for your challenge"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={onChange}
              placeholder="Describe the challenge and provide any necessary context"
              rows="4"
              required
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={onChange}
                required
              >
                <option value="web">Web Exploitation</option>
                <option value="crypto">Cryptography</option>
                <option value="forensics">Forensics</option>
                <option value="reverse">Reverse Engineering</option>
                <option value="osint">OSINT</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="points">Points</label>
            <input
              type="number"
              id="points"
              name="points"
              value={points}
              onChange={onChange}
              min="50"
              max="1000"
              step="50"
              required
            />
            <small className="form-hint">
              {formData.function === 'static'
                ? 'Fixed points - all solvers get this amount'
                : 'Current value (will change as users solve)'}
            </small>
          </div>

          {/* Scoring Type Section */}
          <div className="scoring-section">
            <h3>Scoring Type</h3>
            <div className="form-group">
              <label htmlFor="function">Scoring Function</label>
              <select
                id="function"
                name="function"
                value={formData.function}
                onChange={onChange}
                required
              >
                <option value="static">Static (Fixed Points)</option>
                <option value="linear">Linear Decay (Arithmetic)</option>
                <option value="logarithmic">Logarithmic Decay (Exponential Curve)</option>
              </select>
              <small className="form-hint">
                {formData.function === 'static' && 'All solvers get the same points'}
                {formData.function === 'linear' && 'Points decrease by a fixed amount per solve'}
                {formData.function === 'logarithmic' && 'Points decrease slowly at first, then rapidly'}
              </small>
            </div>

            {/* Dynamic Scoring Fields - Only show for linear/logarithmic */}
            {formData.function !== 'static' && (
              <div className="dynamic-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="initial">Initial Points</label>
                    <input
                      type="number"
                      id="initial"
                      name="initial"
                      value={formData.initial}
                      onChange={onChange}
                      min="100"
                      max="2000"
                      step="50"
                      required
                    />
                    <small className="form-hint">Maximum points (first solver)</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="minimum">Minimum Points</label>
                    <input
                      type="number"
                      id="minimum"
                      name="minimum"
                      value={formData.minimum}
                      onChange={onChange}
                      min="50"
                      max="1000"
                      step="50"
                      required
                    />
                    <small className="form-hint">Points floor (won't go below)</small>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="decay">Decay Factor</label>
                  <input
                    type="number"
                    id="decay"
                    name="decay"
                    value={formData.decay}
                    onChange={onChange}
                    min="1"
                    max="100"
                    step="1"
                    required
                  />
                  <small className="form-hint">
                    {formData.function === 'linear'
                      ? `Points decrease by ${formData.decay} per solve`
                      : `Reaches minimum at ~${formData.decay} solves`}
                  </small>
                </div>

                {/* Scoring Preview */}
                <div className="scoring-preview">
                  <strong>Preview:</strong>
                  <ul>
                    <li>1st solver: {formData.initial} points</li>
                    {formData.function === 'linear' && (
                      <>
                        <li>2nd solver: {Math.max(formData.minimum, formData.initial - formData.decay)} points</li>
                        <li>3rd solver: {Math.max(formData.minimum, formData.initial - (2 * formData.decay))} points</li>
                      </>
                    )}
                    {formData.function === 'logarithmic' && (
                      <>
                        <li>5th solver: ~{Math.max(formData.minimum, Math.floor((((formData.minimum - formData.initial) / (formData.decay ** 2)) * (4 ** 2)) + formData.initial))} points</li>
                        <li>{formData.decay}th solver: ~{Math.max(formData.minimum, Math.floor((((formData.minimum - formData.initial) / (formData.decay ** 2)) * ((formData.decay - 1) ** 2)) + formData.initial))} points</li>
                      </>
                    )}
                    <li>After many solves: {formData.minimum} points (minimum)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="flag">Flag</label>
            <input
              type="text"
              id="flag"
              name="flag"
              value={flag}
              onChange={onChange}
              placeholder="Enter the flag SECE{Flag_Here}"
              required
            />
            <small className="form-hint">This will be hidden from users until they solve the challenge.</small>
          </div>

          <div className="hints-section">
            <h3>Hints</h3>
            <div className="hints-container">
              {formData.hints.map((hint, index) => (
                <div key={index} className="hint-item">
                  <div className="hint-content">
                    <textarea
                      value={hint.content}
                      onChange={(e) => handleHintChange(index, 'content', e.target.value)}
                      placeholder="Enter hint content"
                      rows="3"
                    />
                  </div>
                  <div className="hint-cost">
                    <input
                      type="number"
                      value={hint.cost}
                      onChange={(e) => handleHintChange(index, 'cost', parseInt(e.target.value) || 0)}
                      min="0"
                      placeholder="Cost"
                    />
                    <span className="hint-cost-label">points</span>
                  </div>
                  <button
                    type="button"
                    className="remove-hint-btn"
                    onClick={() => removeHint(index)}
                    disabled={formData.hints.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="add-hint-btn" onClick={addHint}>
              Add Hint
            </button>
          </div>

          <div className="file-upload-section">
            <h3>Challenge Files (Optional)</h3>
            <p className="section-description">Upload files that participants need to solve the challenge (max 20MB per file)</p>
            
            <div className="file-selector">
              <input
                type="file"
                id="file-input"
                multiple
                onChange={onFileChange}
                  accept="*/*"
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="file-selector-btn">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Select Files
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="selected-files">
                <h4>Selected Files ({selectedFiles.length}/10)</h4>
                <ul className="selected-files-list">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="selected-file-item">
                      <div className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">{formatFileSize(file.size)} MB</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="remove-file-btn"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isVisible"
                checked={formData.isVisible}
                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
              />
              <span>Make challenge visible to users</span>
            </label>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateChallenge;
