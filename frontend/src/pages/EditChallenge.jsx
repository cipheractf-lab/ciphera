import { useState, useContext, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './CreateChallenge.css'; // Reusing the same styles

function EditChallenge() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const challenge = location.state?.challenge;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'web',
    difficulty: 'Easy',
    points: 100,
    flag: '',
    // Dynamic scoring fields
    function: 'static',
    initial: 500,
    minimum: 100,
    decay: 20
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState('');

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/challenges');
    }
  }, [isAuthenticated, user, navigate]);

  // Load challenge data
  useEffect(() => {
    const fetchChallenge = async () => {
      if (challenge) {
        setFormData({
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          difficulty: challenge.difficulty,
          points: challenge.points,
          flag: '',
          function: challenge.function || 'static',
          initial: challenge.initial || 500,
          minimum: challenge.minimum || 100,
          decay: challenge.decay || 20
        });
      } else if (id) {
        try {
          const res = await axios.get(`/api/challenges/${id}`);
          const challengeData = res.data.data;
          setFormData({
            title: challengeData.title,
            description: challengeData.description,
            category: challengeData.category,
            difficulty: challengeData.difficulty,
            points: challengeData.points,
            flag: '',
            function: challengeData.function || 'static',
            initial: challengeData.initial || 500,
            minimum: challengeData.minimum || 100,
            decay: challengeData.decay || 20
          });
        } catch (err) {
          setFormError('Failed to load challenge data');
        }
      }
    };
    
    fetchChallenge();
  }, [challenge, id]);

  // Load challenge files
  useEffect(() => {
    const fetchFiles = async () => {
      if (!id) return;
      
      setIsLoadingFiles(true);
      try {
        const res = await axios.get(`/api/challenges/${id}/files`);
        setUploadedFiles(res.data.data.files || []);
      } catch (err) {
        console.error('Error loading files:', err);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    fetchFiles();
  }, [id]);

  // Handle file selection
  const onFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setFormError('Please select files to upload');
      return;
    }

    const formDataObj = new FormData();
    files.forEach(file => {
      formDataObj.append('files', file);
    });

    try {
      setIsSubmitting(true);
      await axios.post(`/api/challenges/${id}/files`, formDataObj, {
        timeout: 120000 // 120 seconds for large file uploads
      });
      
      setSuccessMessage('Files uploaded successfully');
      setFiles([]);
      document.getElementById('file-input').value = '';
      
      // Reload files
      const res = await axios.get(`/api/challenges/${id}/files`);
      setUploadedFiles(res.data.data.files || []);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file deletion
  const handleFileDelete = async (filename) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      setIsDeletingFile(filename);
      const encodedFilename = encodeURIComponent(filename);
      await axios.delete(`/api/challenges/${id}/files/${encodedFilename}`);
      
      setSuccessMessage('File deleted successfully');
      setUploadedFiles(uploadedFiles.filter(f => f.filename !== filename));
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to delete file');
    } finally {
      setIsDeletingFile('');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.description || !formData.category || !formData.difficulty || !formData.points) {
      setFormError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Only include flag in the update if it was changed
      const updateData = { ...formData };
      if (!updateData.flag) {
        delete updateData.flag;
      }

      const res = await axios.put(
        `/api/challenges/${id}`,
        updateData
      );

      setSuccessMessage('Challenge updated successfully!');

      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { title, description, category, difficulty, points, flag } = formData;

  return (
    <div className="create-challenge-container">
      <div className="create-challenge-card">
        <div className="create-challenge-header">
          <h2>Edit <span className="highlight">Challenge</span></h2>
          <p>Update challenge details</p>
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

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                name="difficulty"
                value={difficulty}
                onChange={onChange}
                required
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
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
            <label htmlFor="flag">Flag (leave empty to keep existing)</label>
            <input
              type="text"
              id="flag"
              name="flag"
              value={flag}
              onChange={onChange}
              placeholder="Enter new flag SECE{Flag_Here}"
            />
            <small className="form-hint">Only fill this if you want to change the flag.</small>
          </div>

          {/* File Upload Section */}
          <div className="file-upload-section">
            <h3>Challenge Files</h3>
            
            {/* Existing Files */}
            {uploadedFiles.length > 0 && (
              <div className="uploaded-files-list">
                <h4>Uploaded Files ({uploadedFiles.length})</h4>
                {uploadedFiles.map((file) => (
                  <div key={file.filename} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <strong>{file.originalName}</strong>
                        <small>
                          {formatFileSize(file.size)} • 
                          Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="delete-file-btn"
                      onClick={() => handleFileDelete(file.filename)}
                      disabled={isDeletingFile === file.filename}
                    >
                      {isDeletingFile === file.filename ? '🔄' : '🗑️'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload New Files */}
            <div className="upload-new-files">
              <label htmlFor="file-input">Upload New Files</label>
              <input
                type="file"
                id="file-input"
                multiple
                onChange={onFileChange}
                accept="*/*"
              />
              <small className="form-hint">
                Max 10 files, 20MB each. Allowed: archives, documents, images, binaries, source code, network captures
              </small>
              
              {files.length > 0 && (
                <div className="selected-files">
                  <strong>Selected Files:</strong>
                  <ul>
                    {files.map((file, idx) => (
                      <li key={idx}>
                        {file.name} ({formatFileSize(file.size)})
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="upload-files-btn"
                    onClick={handleFileUpload}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditChallenge;