import { useEffect, useState } from 'react';
import { Settings, Save, Upload, Download, Database } from 'lucide-react';
import axios from 'axios';
import { useSiteConfig } from '../context/SiteConfigContext';
import './AdminConfiguration.css';

function AdminConfiguration() {
  const { eventName, logoUrl, visibility, updateEventName, uploadLogo, updateVisibility, refreshConfig } = useSiteConfig();
  const [value, setValue] = useState(eventName || '');
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [backupFile, setBackupFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [backupMode, setBackupMode] = useState('merge');
  const [csvType, setCsvType] = useState('users');
  const [csvImportType, setCsvImportType] = useState('users');
  const [visibilityForm, setVisibilityForm] = useState({
    challenge: 'private',
    account: 'private',
    score: 'private',
    registration: 'private'
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(eventName || '');
  }, [eventName]);

  useEffect(() => {
    setVisibilityForm({
      challenge: visibility?.challenge || 'private',
      account: visibility?.account || 'private',
      score: visibility?.score || 'private',
      registration: visibility?.registration || 'private'
    });
  }, [visibility]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!value.trim()) {
      setError('Event name is required.');
      return;
    }

    setSaving(true);
    const result = await updateEventName(value.trim());
    setSaving(false);

    if (!result.success) {
      setError(result.message || 'Failed to save event name.');
      return;
    }

    await refreshConfig();
    setMessage('Configuration updated successfully.');
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedLogo) {
      setError('Please choose a logo file.');
      return;
    }

    setUploading(true);
    const result = await uploadLogo(selectedLogo);
    setUploading(false);

    if (!result.success) {
      setError(result.message || 'Failed to upload logo.');
      return;
    }

    setSelectedLogo(null);
    await refreshConfig();
    setMessage('Logo updated successfully.');
  };

  const handleVisibilityUpdate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    setSavingVisibility(true);
    const result = await updateVisibility(visibilityForm);
    setSavingVisibility(false);

    if (!result.success) {
      setError(result.message || 'Failed to update visibility settings.');
      return;
    }

    await refreshConfig();
    setMessage('Visibility settings updated successfully.');
  };

  const triggerDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleBackupExport = async () => {
    setMessage('');
    setError('');
    setBackupLoading(true);

    try {
      const response = await axios.get('/api/configuration/backup/export', {
        responseType: 'blob',
        withCredentials: true
      });

      triggerDownload(response.data, `ctf-backup-${Date.now()}.json`);
      setMessage('Backup exported successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to export backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleBackupImport = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!backupFile) {
      setError('Please choose a backup JSON file.');
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('backupFile', backupFile);
      formData.append('mode', backupMode);

      const response = await axios.post('/api/configuration/backup/import', formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(response?.data?.message || 'Backup imported successfully.');
      setBackupFile(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to import backup.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCsvExport = async () => {
    setMessage('');
    setError('');
    setCsvLoading(true);

    try {
      const response = await axios.get(`/api/configuration/backup/csv/${csvType}`, {
        responseType: 'blob',
        withCredentials: true
      });

      triggerDownload(response.data, `${csvType}-backup-${Date.now()}.csv`);
      setMessage(`${csvType} CSV downloaded successfully.`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to download CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleCsvImport = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!csvFile) {
      setError('Please choose a CSV file.');
      return;
    }

    setCsvImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);

      const response = await axios.post(`/api/configuration/backup/csv/${csvImportType}/import`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(response?.data?.message || 'CSV imported successfully.');
      setCsvFile(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to import CSV.');
    } finally {
      setCsvImportLoading(false);
    }
  };

  return (
    <div className="admin-configuration-page-shell">
      <div className="admin-configuration-page-bg" aria-hidden="true" />
      <div className="admin-configuration-orb admin-configuration-orb--primary" aria-hidden="true" />
      <div className="admin-configuration-orb admin-configuration-orb--secondary" aria-hidden="true" />
      <div className="admin-configuration-orb admin-configuration-orb--tertiary" aria-hidden="true" />

      <div className="admin-configuration-page">
        <div className="admin-configuration-container">
          <div className="admin-configuration-card">
            <div className="admin-configuration-header">
              <Settings size={24} />
              <div>
                <h1>Platform Configuration</h1>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="admin-configuration-form">
              <label htmlFor="eventName">Event Name</label>
              <input
                id="eventName"
                type="text"
                maxLength={100}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter event name"
              />

              {error && <div className="admin-configuration-alert admin-configuration-alert-error">{error}</div>}
              {message && <div className="admin-configuration-alert admin-configuration-alert-success">{message}</div>}

              <button type="submit" disabled={saving}>
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </form>

            <form onSubmit={handleLogoUpload} className="admin-configuration-form admin-configuration-logo-form">
              <label htmlFor="eventLogo">Website Logo</label>
              <p className="admin-configuration-hint">Upload an image to use as the website logo, similar to standard logo settings.</p>

              <div className="admin-configuration-logo-row">
                <input
                  id="eventLogo"
                  type="file"
                  accept="image/*,.svg,.ico,.avif,.tiff,.tif"
                  onChange={(e) => setSelectedLogo(e.target.files?.[0] || null)}
                />
                <button type="submit" disabled={uploading}>
                  <Upload size={16} />
                  <span>{uploading ? 'Uploading...' : 'Upload Logo'}</span>
                </button>
              </div>

              <p className="admin-configuration-hint">Supported: PNG, JPG, WEBP, SVG, ICO, GIF, BMP, AVIF, TIFF (max 10MB).</p>

              {logoUrl && (
                <div className="admin-configuration-logo-preview-wrap">
                  <img src={`${logoUrl}?v=${Date.now()}`} alt="Current website logo" className="admin-configuration-logo-preview" />
                </div>
              )}
            </form>

            <form onSubmit={handleVisibilityUpdate} className="admin-configuration-form admin-configuration-visibility-form">
              <label>Challenge Visibility</label>
              <select
                value={visibilityForm.challenge}
                onChange={(e) => setVisibilityForm((prev) => ({ ...prev, challenge: e.target.value }))}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>

              <label>Account Visibility</label>
              <select
                value={visibilityForm.account}
                onChange={(e) => setVisibilityForm((prev) => ({ ...prev, account: e.target.value }))}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="admins">Admins</option>
              </select>

              <label>Score Visibility</label>
              <select
                value={visibilityForm.score}
                onChange={(e) => setVisibilityForm((prev) => ({ ...prev, score: e.target.value }))}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="admins">Admins</option>
              </select>

              <label>Registration Visibility</label>
              <select
                value={visibilityForm.registration}
                onChange={(e) => setVisibilityForm((prev) => ({ ...prev, registration: e.target.value }))}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>

              <button type="submit" disabled={savingVisibility}>
                <Save size={16} />
                <span>{savingVisibility ? 'Updating...' : 'Update Visibility'}</span>
              </button>
            </form>

            <div className="admin-configuration-form admin-configuration-backup-form">
              <label>Backup</label>
              <p className="admin-configuration-hint">Export and import full platform backups.</p>

              <div className="admin-configuration-backup-actions">
                <button type="button" onClick={handleBackupExport} disabled={backupLoading}>
                  <Download size={16} />
                  <span>{backupLoading ? 'Exporting...' : 'Export Backup'}</span>
                </button>
              </div>

              <form onSubmit={handleBackupImport} className="admin-configuration-inline-form">
                <label>Import Mode</label>
                <select value={backupMode} onChange={(e) => setBackupMode(e.target.value)}>
                  <option value="merge">Merge</option>
                  <option value="replace">Replace</option>
                </select>

                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                />

                <button type="submit" disabled={importLoading}>
                  <Database size={16} />
                  <span>{importLoading ? 'Importing...' : 'Import Backup'}</span>
                </button>
              </form>

              <div className="admin-configuration-hint">CSV Tools</div>
              <div className="admin-configuration-inline-form">
                <select value={csvType} onChange={(e) => setCsvType(e.target.value)}>
                  <option value="users">Users</option>
                  <option value="teams">Teams</option>
                  <option value="challenges">Challenges</option>
                </select>

                <button type="button" onClick={handleCsvExport} disabled={csvLoading}>
                  <Download size={16} />
                  <span>{csvLoading ? 'Downloading...' : 'Download CSV'}</span>
                </button>
              </div>

              <form onSubmit={handleCsvImport} className="admin-configuration-inline-form">
                <span className="admin-configuration-hint">CSV import currently supports users.</span>
                <select value={csvImportType} onChange={(e) => setCsvImportType(e.target.value)}>
                  <option value="users">Users</option>
                </select>

                <input
                  type="file"
                  accept="text/csv,.csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                />

                <button type="submit" disabled={csvImportLoading}>
                  <Upload size={16} />
                  <span>{csvImportLoading ? 'Uploading...' : 'Import CSV'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminConfiguration;
