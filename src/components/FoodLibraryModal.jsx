import { useState, useEffect, useMemo } from 'react';
import {
  loadFoodComponents,
  saveFoodComponents,
  saveSingleComponent,
  deleteFoodComponent,
  resetFoodComponents,
  normalizeFoodKey,
} from '../engine/foodComponents.js';

export default function FoodLibraryModal({ isOpen, onClose }) {
  const [components, setComponents] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'learned' | 'custom' | 'default'
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '',
    key: '',
    unit: 'bowl',
    servingGrams: 200,
    calories: 150,
    protein_g: 10,
    carbs_g: 18,
    fat_g: 4,
    fiber_g: 3,
  });

  function reload() {
    setComponents(loadFoodComponents());
  }

  useEffect(() => {
    if (isOpen) {
      reload();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleUpdate() {
      reload();
    }
    window.addEventListener('fitrack_components_updated', handleUpdate);
    return () => window.removeEventListener('fitrack_components_updated', handleUpdate);
  }, []);

  const itemsList = useMemo(() => {
    let list = Object.values(components);

    if (filter === 'learned') {
      list = list.filter(c => c.source === 'learned');
    } else if (filter === 'custom') {
      list = list.filter(c => c.source === 'custom');
    } else if (filter === 'default') {
      list = list.filter(c => c.source === 'default');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || (c.key && c.key.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [components, filter, search]);

  if (!isOpen) return null;

  function handleStartEdit(comp) {
    setEditingKey(comp.key);
    setEditForm({ ...comp });
  }

  function handleSaveEdit() {
    if (!editForm || !editingKey) return;
    saveSingleComponent(editingKey, {
      ...editForm,
      source: editForm.source === 'default' ? 'custom' : editForm.source,
    });
    setEditingKey(null);
    setEditForm(null);
    reload();
  }

  function handleDelete(key) {
    if (window.confirm(`Delete "${key}" from your saved food library?`)) {
      deleteFoodComponent(key);
      reload();
    }
  }

  function handleAddNew(e) {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    const finalKey = normalizeFoodKey(newForm.key.trim() || newForm.name.trim());
    saveSingleComponent(finalKey, {
      ...newForm,
      key: finalKey,
      name: newForm.name.trim(),
      calories: Number(newForm.calories) || 0,
      protein_g: Number(newForm.protein_g) || 0,
      carbs_g: Number(newForm.carbs_g) || 0,
      fat_g: Number(newForm.fat_g) || 0,
      fiber_g: Number(newForm.fiber_g) || 0,
      servingGrams: Number(newForm.servingGrams) || 100,
      source: 'custom',
    });
    setIsAdding(false);
    setNewForm({
      name: '',
      key: '',
      unit: 'bowl',
      servingGrams: 200,
      calories: 150,
      protein_g: 10,
      carbs_g: 18,
      fat_g: 4,
      fiber_g: 3,
    });
    reload();
  }

  function handleReset() {
    if (window.confirm('Reset all food components to standard factory defaults? Custom and learned dishes will be cleared.')) {
      resetFoodComponents();
      reload();
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#13131a',
        border: '1px solid #2a2a3a',
        borderRadius: 16,
        width: '100%',
        maxWidth: 680,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e1e2a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🍱</span>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8ed', margin: 0 }}>
                Food Components Library
              </h2>
              <span style={{
                fontSize: 11,
                color: '#b388ff',
                background: '#b388ff18',
                padding: '2px 8px',
                borderRadius: 12,
                fontWeight: 600,
              }}>
                {Object.keys(components).length} mapped
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#7a7a8a', margin: '4px 0 0 0' }}>
              Exact string mapping engine: each component is mapped and memorized individually.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a7a8a',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e2a', background: '#0e0e14' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search components (e.g. roti, soya chunk pulav, sabzi)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                background: '#13131a',
                border: '1px solid #2a2a3a',
                borderRadius: 8,
                padding: '7px 12px',
                color: '#e8e8ed',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={() => setIsAdding(a => !a)}
              style={{
                background: isAdding ? '#2a2a3a' : '#00e676',
                color: isAdding ? '#c8c8d8' : '#0a0a0f',
                border: 'none',
                borderRadius: 8,
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isAdding ? 'Cancel' : '＋ Add Component'}
            </button>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'learned', label: '✨ Learned by AI' },
              { id: 'custom', label: '🛠 Custom' },
              { id: 'default', label: '📌 Defaults' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  background: filter === f.id ? '#1e1e2e' : 'transparent',
                  border: `1px solid ${filter === f.id ? '#b388ff' : '#222230'}`,
                  borderRadius: 6,
                  color: filter === f.id ? '#b388ff' : '#6a6a7a',
                  fontSize: 11,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  fontWeight: filter === f.id ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add Component Form */}
        {isAdding && (
          <form
            onSubmit={handleAddNew}
            style={{
              padding: '16px 20px',
              background: '#161622',
              borderBottom: '1px solid #2a2a3a',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: '#00e676' }}>
              Add New Food Component (Exact Mapping)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <div>
                <label style={labelStyle}>Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g. Soya Chunk Pulav"
                  value={newForm.name}
                  onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Exact String Key</label>
                <input
                  type="text"
                  placeholder="auto-derived if empty"
                  value={newForm.key}
                  onChange={e => setNewForm({ ...newForm, key: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <select
                  value={newForm.unit}
                  onChange={e => setNewForm({ ...newForm, unit: e.target.value })}
                  style={inputStyle}
                >
                  <option value="bowl">Bowl</option>
                  <option value="plate">Plate</option>
                  <option value="piece">Piece</option>
                  <option value="slice">Slice</option>
                  <option value="scoop">Scoop</option>
                  <option value="glass">Glass</option>
                  <option value="cup">Cup</option>
                  <option value="serving">Serving</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Serving Grams (g)</label>
                <input
                  type="number"
                  value={newForm.servingGrams}
                  onChange={e => setNewForm({ ...newForm, servingGrams: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newForm.protein_g}
                  onChange={e => setNewForm({ ...newForm, protein_g: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Calories (kcal)</label>
                <input
                  type="number"
                  value={newForm.calories}
                  onChange={e => setNewForm({ ...newForm, calories: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Carbs (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newForm.carbs_g}
                  onChange={e => setNewForm({ ...newForm, carbs_g: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newForm.fat_g}
                  onChange={e => setNewForm({ ...newForm, fat_g: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{ background: 'transparent', border: '1px solid #3a3a4a', color: '#9a9aaa', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ background: '#00e676', color: '#0a0a0f', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Save Component
              </button>
            </div>
          </form>
        )}

        {/* Components List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {itemsList.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#5a5a6a', padding: '30px 0', fontSize: 13 }}>
              No matching components found.
            </div>
          ) : (
            itemsList.map(comp => {
              const isEditing = editingKey === comp.key;

              if (isEditing) {
                return (
                  <div
                    key={comp.key}
                    style={{
                      background: '#1a1a28',
                      border: '1px solid #b388ff50',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#b388ff' }}>
                      Editing "{comp.key}"
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
                      <div>
                        <label style={labelStyle}>Display Name</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Unit</label>
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Protein (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.protein_g}
                          onChange={e => setEditForm({ ...editForm, protein_g: Number(e.target.value) })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Calories (kcal)</label>
                        <input
                          type="number"
                          value={editForm.calories}
                          onChange={e => setEditForm({ ...editForm, calories: Number(e.target.value) })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Carbs (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.carbs_g || 0}
                          onChange={e => setEditForm({ ...editForm, carbs_g: Number(e.target.value) })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Fat (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.fat_g || 0}
                          onChange={e => setEditForm({ ...editForm, fat_g: Number(e.target.value) })}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        onClick={() => { setEditingKey(null); setEditForm(null); }}
                        style={{ background: 'transparent', border: '1px solid #3a3a4a', color: '#8a8a9a', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        style={{ background: '#b388ff', color: '#0a0a0f', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={comp.key}
                  style={{
                    background: '#101016',
                    border: '1px solid #1e1e2a',
                    borderRadius: 10,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e8e8ed' }}>
                        {comp.name}
                      </span>
                      <span style={{
                        fontSize: 9,
                        color: comp.source === 'learned' ? '#b388ff' : comp.source === 'custom' ? '#00e676' : '#7a7a8a',
                        background: comp.source === 'learned' ? '#b388ff15' : comp.source === 'custom' ? '#00e67615' : '#2a2a3a',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}>
                        {comp.source === 'learned' ? '✨ Learned' : comp.source === 'custom' ? '🛠 Custom' : '📌 Default'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#5a5a6a', marginTop: 2 }}>
                      Mapped exact string: <code style={{ color: '#ffab40', background: '#ffab4010', padding: '1px 4px', borderRadius: 3 }}>"{comp.key}"</code>
                      <span style={{ marginLeft: 6 }}>• per {comp.unit} (~{comp.servingGrams || 100}g)</span>
                    </div>
                  </div>

                  {/* Macros info */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#00e676' }}>
                        {comp.protein_g}g P
                      </span>
                      <span style={{ fontSize: 11, color: '#ffab40', marginLeft: 8 }}>
                        {comp.calories} kcal
                      </span>
                      <div style={{ fontSize: 10, color: '#5a5a6a' }}>
                        {comp.carbs_g || 0}g C • {comp.fat_g || 0}g F
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleStartEdit(comp)}
                        style={{
                          background: 'none',
                          border: '1px solid #2a2a3a',
                          color: '#b388ff',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comp.key)}
                        style={{
                          background: 'none',
                          border: '1px solid #3a1a1a',
                          color: '#ff5252',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #1e1e2a',
          background: '#0e0e14',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#7a7a8a',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Reset to standard defaults
          </button>
          <button
            onClick={onClose}
            style={{
              background: '#b388ff',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: '#7a7a8a',
  marginBottom: 2,
};

const inputStyle = {
  width: '100%',
  background: '#101018',
  border: '1px solid #2a2a3a',
  borderRadius: 6,
  padding: '5px 8px',
  color: '#e8e8ed',
  fontSize: 11,
  outline: 'none',
};
