const express = require('express');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 5000;

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'userpassword',
  database: process.env.DB_NAME || 'my_database'
};

let connection;
let isConnecting = false; // Biến cờ (Flag) chặn spam kết nối trùng lặp

function handleDisconnect() {
  if (isConnecting) return; // Nếu đang có 1 luồng chờ kết nối, chặn không cho tạo luồng mới
  isConnecting = true;

  console.log('🔄 Backend đang thử kết nối tới MySQL...');
  connection = mysql.createConnection(dbConfig);

  connection.connect((err) => {
    isConnecting = false; // Reset lại cờ sau khi có kết quả kết nối
    
    if (err) {
      console.error('❌ Lỗi kết nối MySQL, sẽ thử lại sau 5 giây:', err.message);
      // Chỉ duy nhất dòng này chịu trách nhiệm gọi lại hàm sau 5 giây
      setTimeout(handleDisconnect, 5000); 
    } else {
      console.log('🚀 Đã kết nối thành công tới MySQL!');
    }
  });

  // Sự kiện này CHỈ xử lý khi app ĐANG CHẠY mà DB đột ngột bị sập ngầm
  connection.on('error', (err) => {
    console.log(`⚠️ Phát hiện lỗi ngầm: ${err.code}`);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔌 Mất kết nối đột ngột, tiến hành kết nối lại...');
      handleDisconnect();
    }
  });
}

// Khởi chạy
handleDisconnect();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/api/users', (req, res) => {
  connection.query('SELECT * FROM users', (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi truy vấn: " + err.message });
    }
    res.json({ message: "Lấy dữ liệu thành công!", data: results });
  });
});

app.listen(port, () => {
  console.log(`Server đang chạy tại port ${port}`);
});