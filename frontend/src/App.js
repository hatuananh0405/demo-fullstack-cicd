import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Gọi API tới Container Backend (qua port 5000 công khai ở máy local)
    fetch('http://172.16.5.200/api')
      .then(response => {
        if (!response.ok) throw new Error('Mạng có sự cố, không gọi được API');
        return response.json();
      })
      .then(data => {
        setUsers(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>Ứng dụng 3-Tier Thực Hành Lab 11</h1>
      <h2>{ "Frontend (ReactJS) <--> Backend (NodeJS) <--> Database (MySQL)" }</h2>
      <hr style={{ width: '50%' }} />
      
      {loading && <p>Đang tải dữ liệu từ database...</p>}
      {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>}
      
      {!loading && !error && (
        <div>
          <h3>Danh sách User lấy từ MySQL:</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {users.map(user => (
              <li key={user.id} style={{ background: '#f4f4f4', margin: '5px auto', padding: '10px', width: '300px', borderRadius: '5px' }}>
                ID: {user.id} - <strong>{user.name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;