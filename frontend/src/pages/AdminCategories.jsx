import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './AdminCategories.css';

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ id: '', name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({ id: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showAlert('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleAddCategory = async () => {
    if (!newCategory.id || !newCategory.name) {
      showAlert('error', 'Please fill in both ID and Name fields');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/categories', newCategory);
      setCategories([...categories, response.data.data]);
      setNewCategory({ id: '', name: '' });
      showAlert('success', 'Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      showAlert('error', error.response?.data?.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm(`Are you sure you want to delete the "${categories.find(c => c.id === id)?.name}" category?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/categories/${id}`);
      setCategories(categories.filter(cat => cat.id !== id));
      showAlert('success', 'Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      showAlert('error', error.response?.data?.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category) => {
    setEditingId(category.id);
    setEditingData({ ...category });
  };

  const handleSaveEdit = async () => {
    if (!editingData.name) {
      showAlert('error', 'Name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(`/api/categories/${editingId}`, { name: editingData.name });
      setCategories(categories.map(cat => 
        cat.id === editingId ? response.data.data : cat
      ));
      setEditingId(null);
      showAlert('success', 'Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      showAlert('error', error.response?.data?.message || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({ id: '', name: '' });
  };

  return (
    <div className="htb-admin-categories-container">
      <div className="htb-admin-categories-grid-bg" />
      <div className="htb-admin-categories-orb htb-admin-categories-orb--primary" aria-hidden="true" />
      <div className="htb-admin-categories-orb htb-admin-categories-orb--secondary" aria-hidden="true" />
      <div className="htb-admin-categories-orb htb-admin-categories-orb--tertiary" aria-hidden="true" />

      <motion.div 
        className="htb-admin-categories-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="htb-header-content">
          <h1>Challenge <span className="htb-highlight">Categories</span></h1>
          <p>Manage challenge categories for your CTF platform</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {alert.show && (
          <motion.div 
            className={`htb-alert htb-alert-${alert.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{alert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="htb-admin-categories-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Add New Category */}
        <div className="htb-category-section">
          <div className="htb-section-header">
            <h2>Add New Category</h2>
          </div>

          <div className="htb-add-category-form">
            <div className="htb-form-row">
              <div className="htb-form-group">
                <label>Category ID</label>
                <input
                  type="text"
                  placeholder="e.g., web, crypto, forensics"
                  value={newCategory.id}
                  onChange={(e) => setNewCategory({ ...newCategory, id: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  className="htb-input"
                />
                <span className="htb-input-hint">Lowercase, no spaces</span>
              </div>

              <div className="htb-form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g., Web Exploitation"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="htb-input"
                />
              </div>

              <motion.button
                className="htb-btn-add"
                onClick={handleAddCategory}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} />
                <span>Add Category</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Existing Categories */}
        <div className="htb-category-section">
          <div className="htb-section-header">
            <h2>Existing Categories ({categories.length})</h2>
          </div>

          <div className="htb-categories-grid">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                className="htb-category-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                layout
              >
                {editingId === category.id ? (
                  <div className="htb-category-edit-mode">
                    <div className="htb-edit-field">
                      <label>ID (Read-only)</label>
                      <input
                        type="text"
                        value={editingData.id}
                        disabled
                        className="htb-input-disabled"
                      />
                    </div>
                    <div className="htb-edit-field">
                      <label>Name</label>
                      <input
                        type="text"
                        value={editingData.name}
                        onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                        className="htb-input"
                      />
                    </div>
                    <div className="htb-edit-actions">
                      <motion.button
                        className="htb-btn-save"
                        onClick={handleSaveEdit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Save size={16} />
                      </motion.button>
                      <motion.button
                        className="htb-btn-cancel"
                        onClick={handleCancelEdit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="htb-category-view-mode">
                    <div className="htb-category-info">
                      <div className="htb-category-id">{category.id}</div>
                      <div className="htb-category-name">{category.name}</div>
                    </div>
                    <div className="htb-category-actions">
                      <motion.button
                        className="htb-btn-edit"
                        onClick={() => handleStartEdit(category)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Edit category"
                      >
                        <Edit2 size={18} />
                      </motion.button>
                      <motion.button
                        className="htb-btn-delete"
                        onClick={() => handleDeleteCategory(category.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete category"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default AdminCategories;
