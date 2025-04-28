import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './InstructorDashboard.css';
import { API_URL } from './config'; // Import the config

const InstructorDashboard = () => {
  const [view, setView] = useState('myCourses'); // 'myCourses' or 'createCourse'
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'Beginner',
    modules: [
      { title: '', description: '', order_index: 1, contents: [], quiz: { questions: [], passing_score: 70 } },
    ],
  });
  const [newModuleData, setNewModuleData] = useState({
    title: '',
    description: '',
    order_index: 1,
    contents: [],
    quiz: { questions: [], passing_score: 70 },
  });
  const [editingModule, setEditingModule] = useState(null);
  const [selectedModuleContent, setSelectedModuleContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Debug log to track component re-renders
  console.log('InstructorDashboard rendering, view:', view);

  // Safely decode token ID
  const tokenId = React.useMemo(() => {
    if (!token) {
      console.error('No token found');
      return null;
    }
    try {
      const [header, payload, signature] = token.split('.');
      if (!payload) throw new Error('Invalid token format');
      const decodedPayload = JSON.parse(atob(payload));
      console.log('Decoded payload:', decodedPayload);
      return decodedPayload.id || decodedPayload.sub;
    } catch (e) {
      console.error('Invalid token parsing:', e);
      return null;
    }
  }, [token]);

  // Debug effect to monitor token/tokenId
  useEffect(() => {
    console.log('Token available:', !!token);
    console.log('TokenId parsed:', tokenId);
  }, [token, tokenId]);

  // Effect to fetch courses when tokenId is available
  useEffect(() => {
    if (tokenId) {
      console.log('TokenId available, fetching courses');
      fetchCourses();
    } else {
      console.warn('No tokenId available, cannot fetch courses');
    }
  }, [tokenId]);

  // Debug effect to monitor courses state
  useEffect(() => {
    console.log('Current courses state:', courses);
  }, [courses]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);

    if (!tokenId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      console.log(`Fetching courses for instructor ID: ${tokenId} with token: ${token.substring(0, 10)}...`);
      const response = await axios.get(`${API_URL}/api/courses/instructor/${tokenId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Raw courses response:', response);
      if (Array.isArray(response.data)) {
        setCourses(response.data);
        console.log(`Successfully loaded ${response.data.length} courses`);
      } else if (response.data && response.data.courses && Array.isArray(response.data.courses)) {
        setCourses(response.data.courses);
        console.log(`Successfully loaded ${response.data.courses.length} courses`);
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Invalid data format from server');
        setCourses([]);
      }
    } catch (err) {
      console.error('Detailed fetch error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(`Failed to load courses: ${err.response?.data?.message || err.message}`);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (e) => {
    setCourseData({ ...courseData, [e.target.name]: e.target.value });
  };

  const handleModuleChange = (index, e) => {
    const newModules = [...courseData.modules];
    newModules[index][e.target.name] = e.target.value;
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleContentChange = (moduleIndex, contentIndex, e) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].contents[contentIndex] = {
      ...newModules[moduleIndex].contents[contentIndex],
      [e.target.name]: e.target.value,
    };
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleQuizChange = (moduleIndex, qIndex, e) => {
    const newModules = [...courseData.modules];
    if (!newModules[moduleIndex].quiz.questions[qIndex]) {
      newModules[moduleIndex].quiz.questions[qIndex] = {};
    }
    newModules[moduleIndex].quiz.questions[qIndex][e.target.name] = e.target.value;
    setCourseData({ ...courseData, modules: newModules });
  };

  const addModule = () => {
    setCourseData({
      ...courseData,
      modules: [
        ...courseData.modules,
        { title: '', description: '', order_index: courseData.modules.length + 1, contents: [], quiz: { questions: [], passing_score: 70 } },
      ],
    });
  };

  const addContent = (moduleIndex) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].contents.push({ type: 'video', url: '', duration: '', order_index: 1 });
    setCourseData({ ...courseData, modules: newModules });
  };

  const addQuestion = (moduleIndex) => {
    const newModules = [...courseData.modules];
    newModules[moduleIndex].quiz.questions.push({ question: '', options: ['', '', ''], answer: '' });
    setCourseData({ ...courseData, modules: newModules });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const isValid = courseData.title && courseData.description && courseData.category &&
      courseData.modules.every(m => m.title &&
        m.contents.every(c => c.type && c.url && (c.type === 'video' ? c.duration : true)) &&
        m.quiz && m.quiz.passing_score && m.quiz.questions.every(q => q.question && q.options.length > 0 && q.answer));
    if (!isValid) {
      setError('Please fill in all required fields, including content URLs and quiz details.');
      setLoading(false);
      return;
    }
    console.log('Request body:', JSON.stringify({ ...courseData }, null, 2));
    try {
      const response = await axios.post(`${API_URL}/api/courses/create`, courseData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Success response:', response.data);
      alert(response.data.message);
      setCourseData({
        title: '',
        description: '',
        category: '',
        difficulty: 'Beginner',
        modules: [{ title: '', description: '', order_index: 1, contents: [], quiz: { questions: [], passing_score: 70 } }],
      });
      setView('myCourses');
      fetchCourses();
    } catch (err) {
      console.error('Course creation error:', err.response ? err.response.data : err.message);
      setError('Failed to create course: ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      setLoading(true);
      try {
        await axios.delete(`${API_URL}/api/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCourses();
        alert('Course deleted successfully!');
      } catch (err) {
        console.error('Error deleting course:', err);
        setError('Failed to delete course.');
      } finally {
        setLoading(false);
      }
    }
  };

  const manageCourse = async (course) => {
    console.log('Managing course:', course);
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/api/courses/${course.id}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Module data received:', response.data);
      setSelectedCourse({ ...course, modules: response.data });
    } catch (err) {
      console.error('Error fetching course modules:', err.response ? err.response.data : err.message);
      setError(`Failed to load modules for ${course.title}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleContent = async (moduleId) => {
    try {
      const response = await axios.get(`${API_URL}/api/modules/${moduleId}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Module content received:', response.data);
      setSelectedModuleContent(response.data);
    } catch (err) {
      console.error('Error fetching module content:', err);
      setError(`Failed to load content for module: ${err.message}`);
    }
  };

  const handleNewModuleChange = (e) => {
    setNewModuleData({ ...newModuleData, [e.target.name]: e.target.value });
  };

  const handleNewModuleContentChange = (contentIndex, e) => {
    const newContents = [...newModuleData.contents];
    newContents[contentIndex] = {
      ...newContents[contentIndex],
      [e.target.name]: e.target.value,
    };
    setNewModuleData({ ...newModuleData, contents: newContents });
  };

  const handleNewModuleQuizChange = (qIndex, e) => {
    const newQuestions = [...newModuleData.quiz.questions];
    if (!newQuestions[qIndex]) {
      newQuestions[qIndex] = {};
    }
    newQuestions[qIndex][e.target.name] = e.target.value;
    setNewModuleData({
      ...newModuleData,
      quiz: { ...newModuleData.quiz, questions: newQuestions },
    });
  };

  const addNewModuleContent = () => {
    setNewModuleData({
      ...newModuleData,
      contents: [
        ...newModuleData.contents,
        { type: 'video', url: '', duration: '', order_index: newModuleData.contents.length + 1 },
      ],
    });
  };

  const addNewModuleQuestion = () => {
    setNewModuleData({
      ...newModuleData,
      quiz: {
        ...newModuleData.quiz,
        questions: [
          ...newModuleData.quiz.questions,
          { question: '', options: ['', '', ''], answer: '' },
        ],
      },
    });
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    const isValid = newModuleData.title &&
      newModuleData.contents.every(c => c.type && c.url && (c.type === 'video' ? c.duration : true)) &&
      newModuleData.quiz && newModuleData.quiz.passing_score &&
      newModuleData.quiz.questions.every(q => q.question && q.options.length > 0 && q.answer);
  
    if (!isValid) {
      setError('Please fill in all required fields, including content URLs and quiz details for the new module.');
      setLoading(false);
      return;
    }
  
    try {
      const moduleResponse = await axios.post(
        `${API_URL}/api/courses/${selectedCourse.id}/modules`,
        {
          title: newModuleData.title,
          description: newModuleData.description,
          order_index: newModuleData.order_index,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const moduleId = moduleResponse.data.id;
  
      // Add contents with corrected path
      for (const content of newModuleData.contents) {
        await axios.post(
          `${API_URL}/api/courses/course-content`, // Changed from /api/course-content to /courses/course-content
          {
            module_id: moduleId,
            type: content.type,
            url: content.url,
            duration: content.duration || null,
            order_index: content.order_index,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
  
      // Add quiz
      if (newModuleData.quiz.questions.length > 0) {
        await axios.post(
          `${API_URL}/api/courses/quizzes`, // Changed from /api/quizzes to /courses/quizzes
          {
            module_id: moduleId,
            questions: newModuleData.quiz.questions,
            passing_score: newModuleData.quiz.passing_score,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
  
      const updatedModules = await axios.get(`${API_URL}/api/courses/${selectedCourse.id}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedCourse({
        ...selectedCourse,
        modules: updatedModules.data,
      });
      setNewModuleData({
        title: '',
        description: '',
        order_index: selectedCourse.modules.length + 2,
        contents: [],
        quiz: { questions: [], passing_score: 70 },
      });
      alert('Module added successfully!');
    } catch (err) {
      console.error('Add module error:', err.response ? err.response.data : err.message);
      setError('Failed to add module: ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setLoading(false);
    }
  };
  const handleEditModule = (module) => {
    setEditingModule({ ...module });
  };

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    if (!editingModule.title) {
      setError('Module title is required.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.put(
        `${API_URL}/api/courses/${selectedCourse.id}/modules/${editingModule.id}`,
        {
          title: editingModule.title,
          description: editingModule.description,
          order_index: editingModule.order_index,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Update module response:', response.data);
      setSelectedCourse({
        ...selectedCourse,
        modules: selectedCourse.modules.map((m) =>
          m.id === editingModule.id ? response.data : m
        ),
      });
      setEditingModule(null);
      alert('Module updated successfully!');
    } catch (err) {
      console.error('Update module error:', err.response ? err.response.data : err.message);
      setError('Failed to update module: ' + (err.response ? err.response.data.error : err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      setLoading(true);
      try {
        await axios.delete(
          `${API_URL}/api/courses/${selectedCourse.id}/modules/${moduleId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedCourse({
          ...selectedCourse,
          modules: selectedCourse.modules.filter((m) => m.id !== moduleId),
        });
        alert('Module deleted successfully!');
      } catch (err) {
        console.error('Delete module error:', err.response ? err.response.data : err.message);
        setError('Failed to delete module: ' + (err.response ? err.response.data.error : err.message));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleContentChangeUpdate = (contentIndex, e) => {
    const newContent = [...selectedModuleContent];
    newContent[contentIndex] = {
      ...newContent[contentIndex],
      [e.target.name]: e.target.value,
    };
    setSelectedModuleContent(newContent);
  };

  const updateContent = async (contentId, content) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/${editingModule.id}/content/${contentId}`,
        {
          type: content.type,
          url: content.url,
          duration: content.duration || null,
          order_index: content.order_index,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Content updated:', response.data);
      fetchModuleContent(editingModule.id); // Refresh content
      alert('Content updated successfully!');
    } catch (err) {
      console.error('Update content error:', err);
      setError('Failed to update content: ' + err.message);
    }
  };

  const addQuiz = async (moduleId, quizData) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/quizzes`,
        {
          module_id: moduleId,
          questions: quizData.questions,
          passing_score: quizData.passing_score,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Quiz added:', response.data);
      fetchModuleContent(moduleId); // Refresh to reflect quiz (if endpoint supports it)
      alert('Quiz added successfully!');
    } catch (err) {
      console.error('Add quiz error:', err);
      setError('Failed to add quiz: ' + err.message);
    }
  };

  const updateQuiz = async (moduleId, quizData) => {
    try {
      const response = await axios.put(
        `${API_URL}/api/${moduleId}/quizzes`,
        {
          questions: quizData.questions,
          passing_score: quizData.passing_score,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Quiz updated:', response.data);
      fetchModuleContent(moduleId); // Refresh to reflect quiz
      alert('Quiz updated successfully!');
    } catch (err) {
      console.error('Update quiz error:', err);
      setError('Failed to update quiz: ' + err.message);
    }
  };

  return (
    <div className="instructor-dashboard">
      <h1 className="text-center mb-4">Instructor Dashboard</h1>
      <div className="btn-group mb-4" role="group">
        <button
          className={`btn ${view === 'myCourses' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setView('myCourses')}
        >
          My Courses
        </button>
        <button
          className={`btn ${view === 'createCourse' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setView('createCourse')}
        >
          Create New Course
        </button>
      </div>

      {loading && <div className="alert alert-info">Loading...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {view === 'myCourses' && (
        <div>
          <h2>My Courses</h2>
          {courses.length === 0 ? (
            <div className="alert alert-warning">
              <p>No courses found. {tokenId ? '' : 'User ID not available - please log in again.'}</p>
              <button className="btn btn-primary" onClick={fetchCourses}>Refresh Courses</button>
            </div>
          ) : (
            <div>
              <p>Found {courses.length} course(s)</p>
              <ul className="list-group course-list">
                {courses.map((course) => (
                  <li
                    key={course.id}
                    className="list-group-item d-flex justify-content-between align-items-center course-item"
                    style={{ border: '1px solid #ddd', marginBottom: '8px', padding: '10px' }}
                  >
                    <div>
                      <strong>{course.title}</strong>
                      <span className="ms-2 badge bg-secondary">{course.category}</span>
                      <span className="ms-2 badge bg-info">{course.difficulty}</span>
                    </div>
                    <div>
                      <button className="btn btn-info btn-sm me-2" onClick={() => manageCourse(course)}>
                        Manage
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCourse(course.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selectedCourse && (
            <div className="mt-4 selected-course-container" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
              <h3>Manage Course: {selectedCourse.title}</h3>
              <button className="btn btn-secondary mb-2" onClick={() => setSelectedCourse(null)}>
                Back to Courses
              </button>
              {selectedCourse.modules && selectedCourse.modules.length > 0 ? (
                <ul className="list-group">
                  {selectedCourse.modules.map((module, index) => (
                    <li key={index} className="list-group-item">
                      <strong onClick={() => fetchModuleContent(module.id)} style={{ cursor: 'pointer' }}>
                        {module.title} - {module.description || 'No description'} (Order: {module.order_index})
                      </strong>
                      {selectedModuleContent.length > 0 && selectedModuleContent[0].module_id === module.id && (
                        <div>
                          <h4>Contents</h4>
                          {selectedModuleContent.map((content, cIndex) => (
                            <div key={cIndex} className="content-section">
                              <div className="form-group">
                                <label>Type:</label>
                                <select
                                  name="type"
                                  value={content.type}
                                  onChange={(e) => handleContentChangeUpdate(cIndex, e)}
                                >
                                  <option value="video">Video</option>
                                  <option value="PDF">PDF</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>URL:</label>
                                <input
                                  name="url"
                                  value={content.url}
                                  onChange={(e) => handleContentChangeUpdate(cIndex, e)}
                                />
                              </div>
                              {content.type === 'video' && (
                                <div className="form-group">
                                  <label>Duration:</label>
                                  <input
                                    name="duration"
                                    value={content.duration || ''}
                                    onChange={(e) => handleContentChangeUpdate(cIndex, e)}
                                  />
                                </div>
                              )}
                              <div className="form-group">
                                <label>Order Index:</label>
                                <input
                                  type="number"
                                  name="order_index"
                                  value={content.order_index}
                                  onChange={(e) => handleContentChangeUpdate(cIndex, e)}
                                />
                              </div>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => updateContent(content.id, selectedModuleContent[cIndex])}
                              >
                                Update Content
                              </button>
                            </div>
                          ))}
                          {/* Quiz Section (Placeholder until PUT /quizzes is implemented) */}
                          <h4>Quiz</h4>
                          <p>Quiz update functionality will be available once backend supports it.</p>
                        </div>
                      )}
                      <div className="mt-2">
                        <button
                          className="btn btn-warning btn-sm me-2"
                          onClick={() => handleEditModule(module)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteModule(module.id)}
                        >
                          Delete
                        </button>
                      </div>
                      {editingModule && editingModule.id === module.id && (
                        <div>
                          <form onSubmit={handleUpdateModule}>
                            <div className="form-group">
                              <label>Title:</label>
                              <input
                                name="title"
                                value={editingModule.title}
                                onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label>Description:</label>
                              <textarea
                                name="description"
                                value={editingModule.description || ''}
                                onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                              />
                            </div>
                            <div className="form-group">
                              <label>Order Index:</label>
                              <input
                                type="number"
                                name="order_index"
                                value={editingModule.order_index}
                                onChange={(e) => setEditingModule({ ...editingModule, order_index: parseInt(e.target.value) })}
                              />
                            </div>
                            <button type="submit" className="btn btn-success btn-sm me-2">Save</button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingModule(null)}
                            >
                              Cancel
                            </button>
                          </form>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No modules available for this course.</p>
              )}
              <div className="mt-3">
                <h4>Add New Module</h4>
                <form onSubmit={handleAddModule}>
                  <div className="form-group">
                    <label>Title:</label>
                    <input
                      name="title"
                      value={newModuleData.title}
                      onChange={handleNewModuleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description:</label>
                    <textarea
                      name="description"
                      value={newModuleData.description}
                      onChange={handleNewModuleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Order Index:</label>
                    <input
                      type="number"
                      name="order_index"
                      value={newModuleData.order_index}
                      onChange={handleNewModuleChange}
                    />
                  </div>
                  <h5>Contents</h5>
                  {newModuleData.contents.map((content, contentIndex) => (
                    <div key={contentIndex} className="content-section">
                      <div className="form-group">
                        <label>Type:</label>
                        <select
                          name="type"
                          value={content.type}
                          onChange={(e) => handleNewModuleContentChange(contentIndex, e)}
                        >
                          <option value="video">Video</option>
                          <option value="PDF">PDF</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>URL:</label>
                        <input
                          name="url"
                          value={content.url}
                          onChange={(e) => handleNewModuleContentChange(contentIndex, e)}
                          required
                        />
                      </div>
                      {content.type === 'video' && (
                        <div className="form-group">
                          <label>Duration:</label>
                          <input
                            name="duration"
                            value={content.duration}
                            onChange={(e) => handleNewModuleContentChange(contentIndex, e)}
                          />
                        </div>
                      )}
                      <div className="form-group">
                        <label>Order Index:</label>
                        <input
                          type="number"
                          name="order_index"
                          value={content.order_index}
                          onChange={(e) => handleNewModuleContentChange(contentIndex, e)}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mb-3"
                    onClick={addNewModuleContent}
                  >
                    Add Content
                  </button>
                  <h5>Quiz</h5>
                  <div className="form-group">
                    <label>Passing Score:</label>
                    <input
                      type="number"
                      name="passing_score"
                      value={newModuleData.quiz.passing_score}
                      onChange={(e) =>
                        setNewModuleData({
                          ...newModuleData,
                          quiz: { ...newModuleData.quiz, passing_score: parseInt(e.target.value) },
                        })
                      }
                    />
                  </div>
                  {newModuleData.quiz.questions.map((q, qIndex) => (
                    <div key={qIndex} className="quiz-section">
                      <div className="form-group">
                        <label>Question:</label>
                        <input
                          name="question"
                          value={q.question}
                          onChange={(e) => handleNewModuleQuizChange(qIndex, e)}
                          required
                        />
                      </div>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="form-group">
                          <label>Option {optIndex + 1}:</label>
                          <input
                            name="options"
                            value={opt}
                            onChange={(e) => {
                              const newQuestions = [...newModuleData.quiz.questions];
                              newQuestions[qIndex].options[optIndex] = e.target.value;
                              setNewModuleData({
                                ...newModuleData,
                                quiz: { ...newModuleData.quiz, questions: newQuestions },
                              });
                            }}
                          />
                        </div>
                      ))}
                      <div className="form-group">
                        <label>Correct Answer:</label>
                        <input
                          name="answer"
                          value={q.answer}
                          onChange={(e) => handleNewModuleQuizChange(qIndex, e)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mb-3"
                    onClick={addNewModuleQuestion}
                  >
                    Add Question
                  </button>
                  <button type="submit" className="btn btn-success">Add Module</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'createCourse' && (
        <div>
          <h2>Create New Course</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title:</label>
              <input name="title" value={courseData.title} onChange={handleCourseChange} required />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea name="description" value={courseData.description} onChange={handleCourseChange} />
            </div>
            <div className="form-group">
              <label>Category:</label>
              <input name="category" value={courseData.category} onChange={handleCourseChange} />
            </div>
            <div className="form-group">
              <label>Difficulty:</label>
              <select name="difficulty" value={courseData.difficulty} onChange={handleCourseChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            {courseData.modules.map((module, moduleIndex) => (
              <div key={moduleIndex} className="module-section">
                <h3>Module {moduleIndex + 1}</h3>
                <div className="form-group">
                  <label>Title:</label>
                  <input name="title" value={module.title} onChange={(e) => handleModuleChange(moduleIndex, e)} required />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea name="description" value={module.description} onChange={(e) => handleModuleChange(moduleIndex, e)} />
                </div>
                <div className="form-group">
                  <label>Order Index:</label>
                  <input type="number" name="order_index" value={module.order_index} onChange={(e) => handleModuleChange(moduleIndex, e)} />
                </div>
                <h4>Contents</h4>
                {module.contents.map((content, contentIndex) => (
                  <div key={contentIndex} className="content-section">
                    <div className="form-group">
                      <label>Type:</label>
                      <select name="type" value={content.type} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)}>
                        <option value="video">Video</option>
                        <option value="PDF">PDF</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>URL:</label>
                      <input name="url" value={content.url} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} required />
                    </div>
                    {content.type === 'video' && (
                      <div className="form-group">
                        <label>Duration:</label>
                        <input name="duration" value={content.duration} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Order Index:</label>
                      <input type="number" name="order_index" value={content.order_index} onChange={(e) => handleContentChange(moduleIndex, contentIndex, e)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addContent(moduleIndex)}>
                  Add Content
                </button>
                <h4>Quiz</h4>
                <div className="form-group">
                  <label>Passing Score:</label>
                  <input
                    type="number"
                    name="passing_score"
                    value={module.quiz.passing_score}
                    onChange={(e) => handleQuizChange(moduleIndex, 0, e)}
                  />
                </div>
                {module.quiz.questions.map((q, qIndex) => (
                  <div key={qIndex} className="quiz-section">
                    <div className="form-group">
                      <label>Question:</label>
                      <input name="question" value={q.question} onChange={(e) => handleQuizChange(moduleIndex, qIndex, e)} />
                    </div>
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="form-group">
                        <label>Option {optIndex + 1}:</label>
                        <input
                          name="options"
                          value={opt}
                          onChange={(e) => {
                            const newModules = [...courseData.modules];
                            newModules[moduleIndex].quiz.questions[qIndex].options[optIndex] = e.target.value;
                            setCourseData({ ...courseData, modules: newModules });
                          }}
                        />
                      </div>
                    ))}
                    <div className="form-group">
                      <label>Correct Answer:</label>
                      <input name="answer" value={q.answer} onChange={(e) => handleQuizChange(moduleIndex, qIndex, e)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add" onClick={() => addQuestion(moduleIndex)}>
                  Add Question
                </button>
              </div>
            ))}
            <button type="button" className="btn-add" onClick={addModule}>
              Add Module
            </button>
            <button type="submit" className={`btn-submit ${loading ? 'disabled' : ''}`} disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
