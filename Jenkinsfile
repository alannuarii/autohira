pipeline {
    agent any

    environment {
        CONTAINER_NAME = 'autohira-app'
        IMAGE_NAME     = 'autohira:latest'
        PORT_MAPPING   = '3023:3000'
        NETWORK_NAME   = 'postgres-net'
    }

    stages {
        stage('Checkout SCM') {
            steps {
                checkout scm
            }
        }

        stage('Inject Environment Secrets') {
            steps {
                // Mengambil file secret credential dari Jenkins
                withCredentials([file(credentialsId: 'autohira-env', variable: 'SECRET_ENV')]) {
                    sh 'cp $SECRET_ENV .env'
                    sh 'chmod 600 .env'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME} .'
            }
        }

        stage('Deploy Container') {
            steps {
                sh 'docker rm -f ${CONTAINER_NAME} || true'
                sh 'docker run -d --name ${CONTAINER_NAME} --restart always -p ${PORT_MAPPING} --env-file .env --add-host host.docker.internal:host-gateway --network ${NETWORK_NAME} ${IMAGE_NAME}'
            }
        }

        stage('Healthcheck') {
            steps {
                script {
                    echo "Checking container status and health endpoint..."
                    sh '''
                        SUCCESS=false
                        for i in $(seq 1 10); do
                            # Pastikan container berstatus running
                            STATUS=$(docker inspect -f '{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "not_found")
                            if [ "$STATUS" != "running" ]; then
                                echo "Container tidak dalam status running! Status: $STATUS"
                                echo "=== CONTAINER LOGS ==="
                                docker logs ${CONTAINER_NAME} || true
                                exit 1
                            fi

                            # Cek endpoint health via docker exec (internal port 3000)
                            if docker exec ${CONTAINER_NAME} curl -s -f http://localhost:3000/api/health > /dev/null 2>&1 || \
                               docker exec ${CONTAINER_NAME} wget -qO- http://localhost:3000/api/health > /dev/null 2>&1; then
                                echo "Healthcheck berhasil! Aplikasi aktif dan merespons."
                                SUCCESS=true
                                break
                            fi

                            echo "Menunggu aplikasi siap ($i/10)..."
                            sleep 3
                        done

                        if [ "$SUCCESS" != "true" ]; then
                            echo "Healthcheck timeout! Menampilkan log container:"
                            docker logs ${CONTAINER_NAME}
                            exit 1
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            // Bersihkan file .env di workspace demi keamanan
            sh 'rm -f .env'
        }
    }
}
