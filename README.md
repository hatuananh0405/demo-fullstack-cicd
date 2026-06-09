## **Lab11 docs** 

Based trên lab 10, tạo 1 full-stack app: ReactJS, NodeJS, MySQL 

Xây dựng 1 small DevSecOps pipeline bằng 2 công cụ (2 bài lab nhỏ) : Jenkins (CD-Master n slave) và Github Action (CI). Thỏa mãn các y/c sau: 

- Chạy đủ 1 luồng: 

   - Pre-commit ( check code lint, secret detection) 

   - Scan code with SonarQube 

   - Build Code (image) 

   - Docker image & Scan image security bằng Trivy Scan 

   - Artifacts to Central docker registry ( tự dưng docker hub) 

   - Release new image to existing environment 

- Mô tả git flow áp dụng cho lab 

## **I. MÔ TẢ LUỒNG HOẠT ĐỘNG (WORKFLOW & GIT FLOW)** 

## **1. Luồng CI (GitHub Actions)** 

1. **Pre-commit & Static Scan:** Kiểm tra lỗi cú pháp (Lint) và quét lộ thông tin mật (Secret Detection bằng Gitleaks). 

2. **SAST:** Quét mã nguồn tĩnh bảo mật thông qua SonarQube (SonarCloud). 

3. **Build Local:** Đóng gói thử nghiệm Docker Image tại môi trường máy ảo Runner. 

4. **Image Security Scan:** Sử dụng Trivy Scan kiểm tra lỗ hổng của Image. Nếu dính lỗi CRITICAL, pipeline sẽ tự động sập ngay lập tức. 

5. **Push Registry:** Đăng nhập và đẩy Image chính thức lên Central Registry (Docker Hub). 

6. **Webhook Trigger:** Bắn tín hiệu Webhook gọi sang Jenkins Master kích hoạt luồng CD. 

## **2. Luồng CD** 

1. **Jenkins Master** tiếp nhận Webhook từ GitHub Actions. 

2. **Stage 1 (Checkout Code):** Điều phối **Build-Slave** kéo code mới nhất từ GitHub để chạy biệt lập an toàn. 

3. **Stage 2 (Pull Image):** Điều phối **Deploy-Slave** chuẩn bị Docker CLI và kéo Image sạch từ Docker Hub về máy triển khai. 

4. **Stage 3 (Deploy to Live): Deploy-Slave** (có đặc quyền root và docker.sock) thực hiện dọn dẹp cụm cũ kèm theo xóa trạng thái Volume (down -v), sau đó khởi chạy cụm container mới (up -d) kèm theo nạp file init.sql mới. 

## **II. XÂY DỰNG ỨNG DỤNG FULL-STACK VÀ THÀNH PHẦN DOCKER** 

## **1. Thành phần Backend (NodeJS)** 

**a) index.js** 

const express = require('express'); const mysql = require('mysql2'); const app = express(); const port = process.env.PORT || 5000; 

const dbConfig = { host: process.env.DB_HOST || 'db', user: process.env.DB_USER || 'user', password: process.env.DB_PASSWORD || 'userpassword', database: process.env.DB_NAME || 'my_database' }; let connection; let isConnecting = false; // Biến cờ (Flag) chặn spam kết nối trùng lặp 

function handleDisconnect() { if (isConnecting) return; // Nếu đang có 1 luồng chờ kết nối, chặn không cho tạo luồng mới isConnecting = true; 

console.log('🔄 Backend đang thử kết nối tới MySQL...'); connection = mysql.createConnection(dbConfig); 

connection.connect((err) => { isConnecting = false; // Reset lại cờ sau khi có kết quả kết nối if (err) { console.error(' Lỗi kết nối MySQL, sẽ thử lại sau 5 giây:', err.message); // Chỉ duy nhất dòng này chịu trách nhiệm gọi lại hàm sau 5 giây 

setTimeout(handleDisconnect, 5000); } else { console.log(' Đã kết nối thành công tới MySQL!'); } }); 

// Sự kiện này CHỈ xử lý khi app ĐANG CHẠY mà DB đột ngột bị sập ngầm connection.on('error', (err) => { console.log(` Phát hiện lỗi ngầm: ${err.code}`); if (err.code === 'PROTOCOL_CONNECTION_LOST') { console.log(' Mất kết nối đột ngột, tiến hành kết nối lại...'); handleDisconnect(); } }); } // Khởi chạy handleDisconnect(); app.use((req, res, next) => { res.header("Access-Control-Allow-Origin", "*"); res.header("Access-Control-Allow-Headers", "Origin, X-RequestedWith, Content-Type, Accept"); next(); }); app.get('/api/users', (req, res) => { connection.query('SELECT * FROM users', (err, results) => { if (err) { return res.status(500).json({ error: "Lỗi truy vấn: " + err.message }); } res.json({ message: "Lấy dữ liệu thành công!", data: results }); }); }); app.listen(port, () => { console.log(`Server đang chạy tại port ${port}`); 

}); 

 **b) Cấu hình Dockerfile cho Backend (./backend/Dockerfile)** Dockerfile 

FROM node:20-alpine WORKDIR /app COPY package*.json ./ RUN npm install COPY . . EXPOSE 5000 CMD ["npm", "run", "dev"] 

##  **2. Thành phần Frontend (ReactJS)** 

## **a) Khởi tạo và cập nhật giao diện kết nối API (App.js)** 

Khởi tạo ứng dụng bằng lệnh: npx create-react-app frontend và cấu hình file App.js như sau: 

JavaScript import React, { useEffect, useState } from 'react'; import './App.css'; function App() { const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); useEffect(() => { // Gọi API tới Container Backend (qua port 5000 công khai ở máy local) fetch('http://localhost:5000/api/users') .then(response => { if (!response.ok) throw new Error('Mạng có sự cố, không gọi được API'); return response.json(); }) .then(data => { setUsers(data.data); setLoading(false); }) 

.catch(err => { setError(err.message); setLoading(false); }); }, []); return ( <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}> <h1>Ứng dụng 3-Tier Thực Hành Lab 11</h1> <h2>{ "Frontend (ReactJS) <--> Backend (NodeJS) <--> Database (MySQL)" }</h2> <hr style={{ width: '50%' }} /> {loading && <p>Đang tải dữ liệu từ database...</p>} {error && <p style={{ color: 'red' }}>Lỗi: {error}</p>} {!loading && !error && ( <div> <h3>Danh sách User lấy từ MySQL:</h3> <ul style={{ listStyleType: 'none', padding: 0 }}> {users.map(user => ( <li key={user.id} style={{ background: '#f4f4f4', margin: '5px auto', padding: '10px', width: '300px', borderRadius: '5px' }}> ID: {user.id} - <strong>{user.name}</strong> </li> ))} </ul> </div> )} </div> ); } export default App; 

 **b) Cấu hình Dockerfile cho Frontend (./frontend/Dockerfile)** Dockerfile 

FROM node:18-alpine WORKDIR /app COPY package*.json ./ RUN npm install COPY . . EXPOSE 3000 CMD ["npm", "start"] 

##  **3. Thành phần Cơ sở dữ liệu (MySQL)** 

**a) Tập tin khởi tạo dữ liệu (./database/init.sql)** SQL 

USE my_database; 

CREATE TABLE IF NOT EXISTS users ( id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ); 

INSERT INTO users (name) VALUES ('Data from init.sql'); 

 **b) Cấu hình Dockerfile cho Database (./database/Dockerfile)** Dockerfile 

FROM mysql:8.0 COPY ./init.sql /docker-entrypoint-initdb.d/init.sql 

##  **4. Điều phối tổng thể dịch vụ (Docker-Compose.yaml)** 

YAML 

version: '3.8' 

services: # 1. Khởi tạo Cơ sở dữ liệu (MySQL) 

db: image: mysql:8.0 build: ./database         # Tải bản sao môi trường MySQL bản 8.0 ổn định. container_name: mysql_db  # Đặt tên cố định cho container để dễ quản lý, thay vì Docker tự sinh tên ngẫu nhiên. 

restart: always           # Nếu container bị sập do lỗi hệ thống hoặc Docker bị restart, nó sẽ tự động chạy lại. environment:              # Khai báo các biến môi trường cấu hình cho database ngay khi khởi tạo 

MYSQL_ROOT_PASSWORD: rootpassword # Mật khẩu của tài khoản tối cao (root). 

MYSQL_DATABASE: my_database       # Tự động tạo sẵn một database tên là 'my_database'. MYSQL_USER: user                  # Tạo một user thường để app kết nối (an toàn hơn dùng root). MYSQL_PASSWORD: userpassword      # Mật khẩu của user thường đó. ports: - "3306:3306"           # Bản đồ cổng: [Cổng máy thật] : [Cổng trong container]. 

# Giúp bạn có thể dùng các tool như DBeaver, Navicat từ máy thật kết nối thẳng vào DB trong Docker qua cổng 3306. 

volumes: 

- db_data:/var/lib/mysql # Ánh xạ thư mục dữ liệu gốc của MySQL bên trong container ra một phân vùng ổ cứng (db_data) trên máy thật. 

networks: 

- app-network 

# 2. Khởi tạo Backend (NodeJS) backend: build: ./backend          # Chỉ định đường dẫn chứa Dockerfile để Docker tự build thành Image riêng. 

ports: - "5000:5000"           # Mở cổng 5000 ra ngoài máy thật để Frontend hoặc Postman có thể gọi API. environment: DB_HOST: db             # ĐÂY LÀ ĐIỂM CHỐT: Thay vì điền IP, ta điền tên service 'db'. Docker tự hiểu là container MySQL. volumes: # Đồng bộ (Bind mount) thư mục code máy thật vào container để sửa code là container nhận ngay. - /app/node_modules     # Khai báo một Anonymous Volume. Ý nghĩa: Giữ lại thư mục node_modules tạo ra từ lệnh `RUN npm install` 

bên trong container Linux, không cho thư mục node_modules ở máy thật (nếu có) đè lên, tránh lỗi xung đột hệ điều hành (nhất là khi máy thật chạy Windows). depends_on: - db                    # Ra lệnh cho Docker: "Phải dựng container db xong xuôi thì mới được dựng container backend". networks: - app-network 

# 3. Khởi tạo Frontend (ReactJS) frontend: build: ./frontend ports: - "3000:3000"           # Mở cổng 3000 volumes: - /app/node_modules     # Tác dụng tương tự như phần Backend (Tránh xung đột node_modules). environment: - CHOKIDAR_USEPOLLING=true # Cực kỳ quan trọng! Docker chạy trên một máy ảo Linux nền tảng. Đôi khi sự kiện lưu file (Save) từ Windows/MacOS không kích hoạt được tính năng tự tải lại trang của React trong Linux. Câu lệnh này ép React liên tục quét file (polling) để đảm bảo tính năng Hot-reload hoạt động mượt mà 100%. depends_on: 

- backend               # Đảm bảo có server API rồi mới mở giao diện. networks: - app-network 

networks: app-network: driver: bridge 

volumes: db_data: 

 **b) Cấu hình loại trừ mã nguồn (.gitignore)** Plaintext 

node_modules/ 

frontend/node_modules/ 

backend/node_modules/ 

.idea/ .vscode/ 

##  **III. THIẾT LẬP LUỒNG CI (GITHUB ACTIONS)** 

## **1. Cấu hình Credentials bảo mật trên GitHub** 

Truy cập **GitHub Repository** —> Chọn **Settings** —> **Secrets and variables** —> **Actions** và tạo các biến sau: 

- DOCKERHUB_USERNAME: Tên tài khoản Docker Hub. 

- DOCKERHUB_TOKEN: Access Token được tạo từ Docker Hub (hoặc mật khẩu). 

- SONAR_TOKEN: Token được cấp từ máy chủ SonarQube / SonarCloud. 

- SONAR_HOST_URL: Địa chỉ URL của máy chủ SonarQube (hoặc SonarCloud). 

- JENKINS_TOKEN: Token kích hoạt từ xa (Authentication Token) cấu hình trong Jenkins Job. 

- JENKINS_URL: Địa chỉ URL công khai của máy chủ Jenkins Master. 

## **2. Cấu hình quét mã nguồn tĩnh (sonar-project.properties)** 

Tạo tập tin tại thư mục gốc dự án máy Local: 

Properties 

sonar.projectKey=demo-fullstack-cicd sonar.organization=hatuananh0405 

# Cấu hình giữ nguyên sonar.projectName=demo-fullstack-cicd sonar.projectVersion=1.0 sonar.sources=frontend/src, backend/src sonar.exclusions=**/node_modules/**, **/build/**, **/dist/**, **/*.test.js, **/*.spec.js sonar.sourceEncoding=UTF-8 

##  **3. Tập tin định nghĩa Pipeline (.github/workflows/ci.yml)** 

## YAML 

name: DevSecOps CI Pipeline 

on: 

push: 

branches: [ "develop" ] pull_request: branches: [ "develop" ] 

jobs: # ------------------------------------------------------# JOB 1: QUÉT BẢO MẬT MÃ NGUỒN TĨNH (Lint + Secret + SAST) # ------------------------------------------------------security-and-saast: runs-on: ubuntu-latest steps: - name: Checkout Code uses: actions/checkout@v4 with: fetch-depth: 0 # Đọc lịch sử git để SonarCloud tính toán blame code 

# 1.1 Quét lộ thông tin mật (Mật khẩu, Token, Key...) 

- name: Run Gitleaks (Secret Detection) uses: gitleaks/gitleaks-action@v2 env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} 

# 1.2 Quét mã nguồn tĩnh bằng SonarCloud 

- name: SonarCloud Scan 

uses: sonarsource/sonarqube-scan-action@v2 env: SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }} SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }} 

# ------------------------------------------------------- 

# JOB 2: ĐÓNG GÓI VÀ QUÉT BẢO MẬT CONTAINER (Build + Trivy + Push) 

# ------------------------------------------------------build-and-push-registry: 

needs: security-and-saast # Chỉ chạy khi JOB 1 vượt qua an toàn (Pass) 

runs-on: ubuntu-latest 

steps: 

- name: Checkout Code 

uses: actions/checkout@v4 

- name: Set up Docker Buildx 

uses: docker/setup-buildx-action@v3 

- # 2.1 Build thử Image Backend để lưu tạm trên máy ảo Runner 

- name: Build Backend Image Local 

- uses: docker/build-push-action@v5 

with: 

context: ./backend 

load: true 

tags: ${{ secrets.DOCKERHUB_USERNAME }}/lab11-backend:test 

- # 2.2 Quét lỗ hổng bảo mật của Image bằng Trivy Scan 

- name: Run Trivy Scanner (Backend) uses: aquasecurity/trivy-action@master with: 

image-ref: '${{ secrets.DOCKERHUB_USERNAME }}/lab11backend:test' 

format: 'table' 

exit-code: '1' # Ép sập Pipeline nếu phát hiện lỗi bảo mật mức CRITICAL 

ignore-unfixed: true 

vuln-type: 'os,library' 

severity: 'CRITICAL' 

# 2.3 Đăng nhập vào Docker Hub công khai 

- name: Login to Docker Hub 

uses: docker/login-action@v3 

with: 

username: ${{ secrets.DOCKERHUB_USERNAME }} 

password: ${{ secrets.DOCKERHUB_TOKEN }} 

# 2.4 Đẩy chính thức Image lên Registry sau khi đã kiểm duyệt sạch sẽ 

- name: Push Backend Image to Docker Hub 

uses: docker/build-push-action@v5 with: 

context: ./backend 

push: true tags: | 

${{ secrets.DOCKERHUB_USERNAME }}/lab11- 

backend:development-latest 

${{ secrets.DOCKERHUB_USERNAME }}/lab11-backend:$ 

{{ github.sha }} 

# 2.5 BẮN TÍN HIỆU WEBHOOK GỌI JENKINS CD CHẠY LIVE (ĐÃ SỬA LỖI BẢO MẬT) 

- name: Trigger Jenkins CD Pipeline 

env: 

# Giấu chữ admin và token vào các biến môi trường ngầm của máy ảo 

JENKINS_USER: "admin" 

JENKINS_SECRET_TOKEN: ${{ secrets.JENKINS_TOKEN }} JENKINS_TARGET_URL: ${{ secrets.JENKINS_URL }} 

run: | 

curl -X POST -u "$JENKINS_USER:$JENKINS_SECRET_TOKEN" 

"$JENKINS_TARGET_URL/job/pipeline-cd-distributed/build" 

##  **IV. THIẾT LẬP LUỒNG CD (JENKINS MASTER & SLAVES DISTRIBUTED)** 

## **1. Khởi chạy Jenkins Master Server bằng Docker** 

## Bash 

- docker run -d \ 

- --name jenkins_master_server \ 

- -p 8080:8080 -p 50000:50000 \ 

- -v jenkins_home_data:/var/jenkins_home \ 

- --restart always \ 

jenkins/jenkins:lts 

##  **2. Cấu hình Jenkins Build Slave (build-slave)** 

- **Chức năng:** Kéo code từ trên GitHub về nạp các thư viện. Máy này không có quyền điều khiển Docker máy thật, hoàn toàn bị nhốt trong vùng an toàn nhằm phòng chống mã độc phá hoại hệ thống live. 

- **Cách thiết lập:** Tạo Node mới trên giao diện Jenkins Master với nhãn build-slave để lấy chuỗi bí mật (JENKINS_SECRET), sau đó chạy lệnh Docker: 

Bash 

- docker run -d \ 

- --name jenkins_slave_container \ 

- --init \ 

- -v f:/jenkins_workspace:/home/jenkins/agent \ 

- -e JENKINS_URL=http://host.docker.internal:8080/ \ 

- -e JENKINS_SECRET=a1b2c3d4_ĐIỀN_MÃ_SECRET_NODE_1_VÀO_ĐÂY \ 

- -e JENKINS_AGENT_NAME=build-slave \ 

- -e JENKINS_WEB_SOCKET=true \ jenkins/inbound-agent 

##  **3. Cấu hình Jenkins Deploy Slave (deploy-slave)** 

- **Chức năng:** Lấy file cấu hình Docker-Compose.yaml, gõ lệnh down -v để dọn dẹp trạng thái cũ, rồi gõ up -d để dựng cụm Container ứng dụng lên máy thật. Máy này được ban đặc quyền tối cao thông qua cờ --user root và ánh xạ docker.sock. 

- **Cách thiết lập:** Tạo Node mới trên giao diện Jenkins Master với nhãn deploy-slave để lấy chuỗi bí mật (JENKINS_SECRET), sau đó chạy lệnh Docker: 

## Bash 

- docker run -d \ 

- --name jenkins_slave_container_2 \ 

- --init \ 

- --user root \ 

- -v //var/run/docker.sock:/var/run/docker.sock \ 

- -v f:/jenkins_workspace_2:/home/jenkins/agent \ 

- -e JENKINS_URL=http://host.docker.internal:8080/ \ 

- -e JENKINS_SECRET=beccc9e9_ĐIỀN_MÃ_SECRET_NODE_2_VÀO_ĐÂY \ 

- -e JENKINS_AGENT_NAME=deploy-slave \ 

- -e JENKINS_WEB_SOCKET=true \ 

jenkins/inbound-agent 

##  **4. Kịch bản phân tán Jenkins Pipeline (Jenkinsfile)** 

pipeline { agent none stages { 

// STAGE 1: Máy 1 kéo code (Hoàn hảo) stage('1. Checkout Source Code') { agent { label 'build-slave' } steps { 

echo ' [BUILD-SLAVE] Đang đồng bộ mã nguồn mới nhất từ GitHub...' 

checkout scmGit( 

branches: [[name: '*/develop']], userRemoteConfigs: [[url: 

'https://github.com/hatuananh0405/demo-fullstack-cicd.git']] ) } } 

// STAGE 2: Ép Slave 2 tải môi trường 

stage('2. Pull Clean Image') { 

agent { label 'deploy-slave' } steps { 

echo ' [DEPLOY-SLAVE] Đang tự động cấu hình Docker CLI Linux...' 

sh 'curl -sSL 

https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.t gz -o docker.tgz' 

sh 'tar -xvf docker.tgz --strip-components=1 docker/docker' 

sh 'chmod +x docker' 

Docker Hub...' 

backend:development-latest' 

} 

} 

// STAGE 3: Triển khai tự động nạp file init.sql sạch stage('3. Deploy To Live Environment') { agent { label 'deploy-slave' } steps { 

echo ' [DEPLOY-SLAVE] Bước 1: Đồng bộ mã nguồn để lấy file cấu hình và file init.sql...' checkout scmGit( 

userRemoteConfigs: [[url: 'https://github.com/hatuananh0405/demo-fullstack-cicd.git']] ) 

echo '🔄 [DEPLOY-SLAVE] Bước 2: Nạp Plugin Docker Compose...' 

sh 'curl -L "https://github.com/docker/compose/releases/download/v2.29.2/dockercompose-linux-x86_64" -o docker-compose' sh 'chmod +x docker-compose' 

echo ' [DEPLOY-SLAVE] Bước 3: Đập bỏ cụm cũ, XÓA TRẠNG THÁI VOLUME ĐỂ NẠP FILE INIT.SQL...' 

// Thêm cờ -v để xóa sạch phân vùng dữ liệu cũ đang bị trống sh './docker-compose -f Docker-Compose.yaml down -v -- remove-orphans' 

// Khởi chạy cụm mới, ép buộc nạp file init.sql từ thư mục ./database vừa kéo về sh './docker-compose -f Docker-Compose.yaml up -d -- build --force-recreate' 

echo ' HOÀN THÀNH TỰ ĐỘNG HÓA! ' } } } 

}  

