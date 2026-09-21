pipeline {
    agent any

    environment {
        CONTAINER_NAME = 'autohira'
        PORT_MAPPING = '3023:3000'
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
                sh 'docker-compose build --no-cache'
            }
        }

        stage('Deploy Container') {
            steps {
                sh 'docker-compose down || true'
                sh 'docker-compose up -d'
            }
        }

        stage('Healthcheck') {
            steps {
                sleep 5
                sh 'curl -f http://localhost:3023/api/health || exit 1'
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
