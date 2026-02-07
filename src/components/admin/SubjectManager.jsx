import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSubjects, deleteSubject } from '../../services/storyService';

function SubjectManager() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newSubject, setNewSubject] = useState({
        name: '',
        description: '',
        icon: '📖',
        order: 0
    });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        setLoading(true);
        const data = await getAllSubjects();
        setSubjects(data);
        setLoading(false);
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        setAdding(true);

        try {
            const { addSubject } = await import('../../services/storyService');
            await addSubject({
                ...newSubject,
                order: subjects.length
            });

            setNewSubject({ name: '', description: '', icon: '📖', order: 0 });
            loadSubjects();
        } catch (error) {
            alert('Error adding subject: ' + error.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deleteSubject(id);
                loadSubjects();
            } catch (error) {
                alert('Error deleting subject: ' + error.message);
            }
        }
    };

    if (loading) {
        return (
            <div className="admin-layout">
                <AdminSidebar />
                <div className="admin-content">
                    <div className="loading">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <AdminSidebar />

            <div className="admin-content">
                <h1 style={{ marginBottom: '2rem', color: 'white' }}>Manage Subjects</h1>

                {/* Add New Subject Form */}
                <div className="admin-card">
                    <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>Add New Subject</h3>
                    <form onSubmit={handleAddSubject}>
                        <div className="form-group">
                            <label className="form-label">Icon (emoji)</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newSubject.icon}
                                onChange={(e) => setNewSubject({ ...newSubject, icon: e.target.value })}
                                placeholder="📖 🚀 🌊 🦁"
                                maxLength={2}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Subject Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newSubject.name}
                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                placeholder="e.g., Space Adventures"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newSubject.description}
                                onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                                placeholder="e.g., Explore the cosmos and distant planets"
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={adding}>
                            {adding ? 'Adding...' : '+ Add Subject'}
                        </button>
                    </form>
                </div>

                {/* Subjects List */}
                <div className="admin-card">
                    <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>Existing Subjects ({subjects.length})</h3>

                    {subjects.length === 0 ? (
                        <p style={{ opacity: 0.7 }}>No subjects yet. Add one above!</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {subjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    style={{
                                        padding: '1.5rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontSize: '2.5rem' }}>{subject.icon}</span>
                                        <div>
                                            <h4 style={{ color: 'white', marginBottom: '0.25rem' }}>{subject.name}</h4>
                                            <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{subject.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(subject.id, subject.name)}
                                        className="btn"
                                        style={{
                                            background: 'var(--error)',
                                            color: 'white',
                                            padding: '0.5rem 1rem'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Simple sidebar component
function AdminSidebar() {
    return (
        <div className="admin-sidebar">
            <h2 style={{ marginBottom: '2rem', color: 'white' }}>📚 Admin Panel</h2>
            <nav>
                <Link to="/admin/dashboard" className="admin-nav-link">🏠 Dashboard</Link>
                <Link to="/admin/subjects" className="admin-nav-link active">📁 Subjects</Link>
                <Link to="/admin/stories" className="admin-nav-link">📖 Stories</Link>
            </nav>
        </div>
    );
}

export default SubjectManager;
