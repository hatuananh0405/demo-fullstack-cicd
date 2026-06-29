pipeline {
    agent any // Khai báo chung để Jenkins bắt đầu luồng nhận việc

    stages {
        // -------------------------------------------------------------
        // STAGE 1: Giao cho ông Build Slave kéo code (Nhốt trong vùng an toàn)
        // -------------------------------------------------------------
        stage('1. Checkout Source Code...') {
            agent { label 'build-slave' } // Ép chạy trên con container build-slave
            steps {
                echo '📥 [BUILD-SLAVE] Đang tiến hành kéo mã nguồn mới nhất từ GitHub...'
                // Tự động bốc cấu hình Git mà bạn đã khai báo ở giao diện Web Job Jenkins
                checkout scm
            }
        }

        // -------------------------------------------------------------
        // STAGE 2: Giao cho Deploy Slave chuẩn bị môi trường Docker
        // -------------------------------------------------------------
        stage('2. Pull Clean Image') {
            agent { label 'deploy-slave' } // Ép chuyển sang con container deploy-slave (có quyền Docker)
            steps {
                echo '🚀 [DEPLOY-SLAVE] Đang tự động cấu hình Docker CLI Linux...'
                // Tải công cụ điều khiển Docker thô về lòng container slave
                sh 'curl -sSL https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.tgz -o docker.tgz'
                sh 'tar -xvf docker.tgz --strip-components=1 docker/docker'
                sh 'chmod +x docker'
                
                echo '📥 [DEPLOY-SLAVE] Đang kéo bản Image sạch mới nhất từ Docker Hub về máy Worker...'
                // Đổi hatuananh1006 thành tên tài khoản Docker Hub thật của bạn nếu có thay đổi
                sh './docker pull hatuananh1006/lab11-backend:development-latest'
            }
        }

        // -------------------------------------------------------------
        // STAGE 3: Đập cụm cũ - Dựng cụm mới Live Full-Stack qua Docker Compose
        // -------------------------------------------------------------
        stage('3. Deploy To Live Environment') {
            agent { label 'deploy-slave' }
            steps {
                echo '🔄 [DEPLOY-SLAVE] Bước 3.1: Đồng bộ mã nguồn trên Slave 2 để lấy file thiết kế mới...'
                checkout scm
                
                echo '🔧 [DEPLOY-SLAVE] Bước 3.2: Tải và nạp công cụ Docker Compose...'
                sh 'curl -L "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64" -o docker-compose'
                sh 'chmod +x docker-compose'
                
                echo '💥 [DEPLOY-SLAVE] Bước 3.3: Dọn dẹp cụm cũ, XÓA VOLUME ĐỂ NẠP FILE INIT.SQL SẠCH...'
                // Lệnh -v giúp xóa sạch bộ nhớ đệm database cũ để MySQL nhận file init.sql mới tinh từ thư mục ./database
                sh './docker-compose -f Docker-Compose.yaml down -v --remove-orphans'
                
                echo '🏗️ [DEPLOY-SLAVE] Bước 3.4: Kích hoạt cụm container Live vươn lên hoạt động...'
                sh './docker-compose -f Docker-Compose.yaml up -d --build --force-recreate'
                
                echo '🎉 [SUCCESS] HỆ THỐNG ĐÃ TRIỂN KHAI HOÀN HẢO LÊN MÁY CHỦ WORKER! 🎉'
            }
        }
    }

    // Phần hậu kỳ: Trả kết quả báo cáo ra màn hình Jenkins
    post {
        success {
            echo 'Build và deploy thành công!'
        }
        failure {
            echo '❌ Thất bại!'
        }
    }
}