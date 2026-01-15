

---

# Swiggy Clone CI/CD on AWS (Jenkins + SonarQube + Trivy + DockerHub + EKS + Kubernetes)

**Goal:** On every GitHub push → Jenkins pipeline runs → code analysis → security scans → Docker build/push → deploy to EKS → app accessible via AWS Load Balancer URL.

---

## 0) Architecture Overview (What We Built)

### Components

1. **Terraform**
   Provisions an EC2 instance (Jenkins host) + Security Group with required ports.
2. **EC2 (Ubuntu)**
   Runs:

   * Jenkins
   * Docker
   * SonarQube (as Docker container)
   * Trivy scanner
   * kubectl, awscli, eksctl (for EKS operations)
3. **GitHub Repository**
   Source code + Kubernetes manifests + Jenkinsfile.
4. **DockerHub**
   Stores built images (`nilay2497/swiggy-clone:<build_number>`).
5. **Amazon EKS**
   Kubernetes cluster that runs your app as Deployments/Services.
6. **AWS Load Balancer (from Kubernetes Service type LoadBalancer)**
   Provides public URL for your app.

### Pipeline Flow

GitHub Push → Jenkins Trigger →
Checkout → Node install → Sonar scan → Quality gate → Trivy FS scan →
Docker build/push → Trivy image scan → kubectl apply → EKS creates LB → Access app.

---

## 1) Prerequisites (Before Starting)

### Local machine requirements

* AWS account and IAM user (admin for labs)
* Terraform installed
* Git installed
* Key pair created in AWS (`Linux-VM-Key7` as per your Terraform)
* DockerHub account + Jenkins credential configured later

### AWS requirements

* Region: `ap-south-1` (as you used)
* Sufficient limits for EKS/nodegroup/ELB

---

## 2) Terraform: Provision EC2 Jenkins Host

### Why Terraform?

* Repeatable infrastructure
* One command to create/destroy entire lab
* Easy to recreate if VM breaks

### Files used

#### A) `provider.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1"
}
```

#### B) `main.tf`

Creates:

* EC2 instance
* Security group
* User-data script execution for auto-install

```hcl
resource "aws_instance" "web" {
  ami                    = "ami-0287a05f0ef0e9d9a"  # change for region
  instance_type          = "t2.large"
  key_name               = "Linux-VM-Key7"          # change as per your key
  vpc_security_group_ids = [aws_security_group.Jenkins-VM-SG.id]
  user_data              = templatefile("./install.sh", {})

  tags = {
    Name = "Jenkins-SonarQube"
  }

  root_block_device {
    volume_size = 40
  }
}

resource "aws_security_group" "Jenkins-VM-SG" {
  name        = "Jenkins-VM-SG"
  description = "Allow inbound traffic"

  ingress = [
    for port in [22, 80, 443, 8080, 9000, 3000] : {
      description      = "inbound rules"
      from_port        = port
      to_port          = port
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      security_groups  = []
      self             = false
    }
  ]

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "Jenkins-VM-SG" }
}
```

#### Why these ports?

* **22** SSH
* **8080** Jenkins
* **9000** SonarQube
* **3000** React app (optional / dev)
* **80/443** web access, ELB testing, future nginx

> For production, do NOT keep 0.0.0.0/0 open for everything. Use your IP only.

---

### C) `install.sh` (Auto installs Jenkins + Docker + SonarQube + Trivy)

#### Why user_data?

* Jenkins VM becomes “ready-to-use” automatically
* No manual installation each time

Your script:

```bash
#!/bin/bash
sudo apt update -y

# Install Java (Temurin 17)
wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | tee /etc/apt/keyrings/adoptium.asc
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list
sudo apt update -y
sudo apt install temurin-17-jdk -y
/usr/bin/java --version

# Install Jenkins
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update -y
sudo apt-get install jenkins -y
sudo systemctl start jenkins
sudo systemctl status jenkins

# Install Docker and run SonarQube
sudo apt-get update
sudo apt-get install docker.io -y
sudo usermod -aG docker ubuntu
sudo usermod -aG docker jenkins
newgrp docker
sudo chmod 777 /var/run/docker.sock
docker run -d --name sonar -p 9000:9000 sonarqube:lts-community

# Install Trivy
sudo apt-get install wget apt-transport-https gnupg lsb-release -y
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /usr/share/keyrings/trivy.gpg > /dev/null
echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy -y
```

#### Why each tool?

* **Java**: Jenkins runtime + Sonar scanner requirements
* **Jenkins**: CI/CD automation
* **Docker**: build container images + run SonarQube container
* **SonarQube**: code quality + security bugs detection (quality gate)
* **Trivy**: security scan (filesystem + container image)

---

### Terraform Commands

Run inside Terraform folder:

```bash
terraform init
terraform plan
terraform apply -auto-approve
```

After apply:

* Take the EC2 public IP
* Open:

  * Jenkins: `http://<EC2-IP>:8080`
  * SonarQube: `http://<EC2-IP>:9000`

---

## 3) Jenkins Setup (Critical Configuration)

### 3.1 Install Jenkins Plugins (Manage Jenkins → Plugins)

Install:

* Pipeline
* Git
* NodeJS Plugin
* SonarQube Scanner plugin
* Docker Pipeline
* Credentials Binding
* Kubernetes CLI (optional)
* (If using kubeconfig step) “Kubernetes Credentials” / “Kubeconfig” related plugin depending on your Jenkins setup

### 3.2 Configure Global Tools (Most common error area)

Go: **Manage Jenkins → Tools**

1. **JDK**

* Name: `jdk21` (or `jdk17` based on your pipeline)
* Install automatically: Temurin / AdoptOpenJDK

> You hit error: `Tool type "jdk" does not have an install of "JDK21"...`
> Fix was: use correct configured tool name (`jdk21` not `JDK21`).

2. **NodeJS**

* Name: `Node16` (exact string must match Jenkinsfile)
* Node version: 16.x
* Install automatically (NodeJS installer)

> You hit error: `No NodeJSInstallation named Node 16 found`
> Fix: configure tool name exactly, then reference that name in Jenkinsfile.

3. **Sonar Scanner**

* Name: `sonar-scanner` (must match Jenkinsfile `tool 'sonar-scanner'`)

---

## 4) SonarQube Configuration

### Why SonarQube?

* Ensures code meets quality rules
* Prevents deployment when quality gate fails
* Adds strong DevOps value in your resume

### Steps

1. Open SonarQube: `http://<EC2-IP>:9000`
2. Create project:

   * Project Key: `Swiggy-CI`
   * Name: `Swiggy-CI`
3. Create token (Administration → Security → Users/Tokens)

### Add SonarQube in Jenkins

Go: **Manage Jenkins → System → SonarQube servers**

* Name: `SonarQube-Server`
* Server URL: `http://<EC2-private-ip-or-public-ip>:9000` (Jenkins and Sonar are on same host, so you can use `http://localhost:9000` if Jenkins can access it)
* Add token credential

---

## 5) Install kubectl + AWS CLI + eksctl on Jenkins server

### Why needed?

* Jenkins must run `kubectl apply` to deploy manifests to EKS.
* Jenkins must authenticate using AWS CLI (`aws eks get-token` via kubeconfig exec plugin).
* eksctl is easiest for EKS creation.

### Commands (on Jenkins EC2)

#### 5.1 kubectl

```bash
sudo apt update
sudo apt install curl -y
curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
kubectl version --client
```

#### 5.2 AWS CLI

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install unzip -y
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

#### 5.3 eksctl

```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /bin
eksctl version
```

---

## 6) EKS Cluster Setup

### Why EKS?

* Managed Kubernetes (production-grade)
* Perfect DevOps project: CI/CD + containerization + Kubernetes + cloud

### Create cluster

```bash
eksctl create cluster --name virtualtechbox-cluster \
  --region ap-south-1 \
  --node-type t2.small \
  --nodes 3
```

Verify:

```bash
kubectl get nodes
kubectl get svc
```

---

## 7) Kubernetes Manifests (Deployment + Service)

### 7.1 Deployment (your file)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swiggy-app
  labels:
    app: swiggy-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: swiggy-app
  template:
    metadata:
      labels:
        app: swiggy-app
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: swiggy-app
        image: nilay2497/swiggy-clone:latest
        imagePullPolicy: "Always"
        ports:
        - containerPort: 3000
```

### Important improvement (recommended)

Your Jenkins pipeline pushes:
`nilay2497/swiggy-clone:${BUILD_NUMBER}`
But your deployment uses `latest`.

**Best practice:** update deployment image dynamically from Jenkins, or use `${BUILD_NUMBER}` tag in deployment template.

---

### 7.2 Service (Must be LoadBalancer)

If you want public access via ELB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: swiggy-service
spec:
  type: LoadBalancer
  selector:
    app: swiggy-app
  ports:
    - port: 80
      targetPort: 3000
```

Then ELB will be created and you access:
`http://<elb-dns>/`

---

## 8) Jenkins Credentials Setup

### 8.1 DockerHub credential

Jenkins → Manage Credentials:

* ID: `dockerhub`
* Type: Username/Password
* Username: your DockerHub username (example: `nilay2497`)
* Password: DockerHub access token (recommended) or password

> You faced: `unauthorized: access token has insufficient scopes`
> This happens when:

* token is read-only, or
* wrong credential, or
* pushing to different repo than logged-in user.

Fix:

* Create **DockerHub Access Token** with **Read/Write**
* Ensure push target is under your own namespace: `nilay2497/...`

### 8.2 Kubernetes credential (kubeconfig)

You used:
`kubeconfig(credentialsId: 'kubernetes', serverUrl: '')`

So create credential:

* ID: `kubernetes`
* Type: “Secret file” (kubeconfig file) OR “Kubeconfig content” depending on plugin
* Paste your kubeconfig content (you already shared it earlier)

---

## 9) Final Jenkinsfile (Your Working Pipeline, Clean + Correct Indentation)

This is your latest version, with correct indentation and structure:

```groovy
pipeline {
  agent any

  tools {
    jdk 'jdk21'
  }

  environment {
    SCANNER_HOME       = tool 'sonar-scanner'
    SONAR_PROJECT_KEY  = 'Swiggy-CI'
    SONAR_PROJECT_NAME = 'Swiggy-CI'

    AWS_REGION   = 'ap-south-1'
    CLUSTER_NAME = 'virtualtechbox-cluster'
    NAMESPACE    = 'swiggy'

    // build-specific tag so every deployment is unique
    DOCKER_IMAGE = "nilay2497/swiggy-clone:${BUILD_NUMBER}"
  }

  stages {

    stage('Clean Workspace') {
      steps {
        cleanWs()
      }
    }

    stage('Checkout') {
      steps {
        git branch: 'main', url: 'https://github.com/nilay24339/cicd_swiggyclone-.git'
      }
    }

    stage('Node Setup + Install Dependencies') {
      steps {
        script {
          def nodeHome = tool name: 'Node16', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
          env.PATH = "${nodeHome}/bin:${env.PATH}"
        }
        sh '''
          node -v
          npm -v
          npm ci || npm install
        '''
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('SonarQube-Server') {
          sh '''
            ${SCANNER_HOME}/bin/sonar-scanner \
              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
              -Dsonar.projectName=${SONAR_PROJECT_NAME} \
              -Dsonar.sources=. \
              -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/build/**,**/.git/**
          '''
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('TRIVY FS SCAN') {
      steps {
        sh '''
          trivy fs --no-progress --severity HIGH,CRITICAL . | tee trivyfs.txt
        '''
      }
    }

    stage('Docker Build & Push') {
      steps {
        script {
          withDockerRegistry(credentialsId: 'dockerhub') {
            sh '''
              docker build -t swiggy-clone .
              docker tag swiggy-clone ${DOCKER_IMAGE}
              docker push ${DOCKER_IMAGE}
            '''
          }
        }
      }
    }

    stage('TRIVY IMAGE SCAN') {
      steps {
        sh '''
          trivy image --no-progress --severity HIGH,CRITICAL \
          ${DOCKER_IMAGE} | tee trivyimage.txt
        '''
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        script {
          dir('Kubernetes') {
            kubeconfig(credentialsId: 'kubernetes', serverUrl: '') {
              sh 'kubectl delete --all pods'
              sh 'kubectl apply -f deployment.yml'
              sh 'kubectl apply -f service.yml'
            }
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'trivyfs.txt,trivyimage.txt', onlyIfSuccessful: false
    }
  }
}
```

---

## 10) GitHub Webhook Trigger + Polling (How to Configure)

### Option A: Webhook (Recommended)

1. Jenkins job → **Configure**
2. Check: **GitHub hook trigger for GITScm polling**
3. GitHub Repo → **Settings → Webhooks → Add webhook**

   * Payload URL: `http://<Jenkins-Public-IP>:8080/github-webhook/`
   * Content type: `application/json`
   * Just push events
4. Make sure Jenkins port 8080 is open (your SG allows it).

### Option B: SCM Polling (Not recommended for production)

* Jenkins job → Build Triggers → Poll SCM
  Example: `H/2 * * * *` (every 2 minutes)

---

# 11) Troubleshooting (Most Important Section)

## A) Jenkins Build number circling / no options

Cause: UI stuck or permissions/session issue.
Fix:

* Hard refresh (Ctrl+F5)
* Try “Console Output” directly
* Restart Jenkins service:

  ```bash
  sudo systemctl restart jenkins
  ```

---

## B) JDK Tool Error

Error:
`Tool type "jdk" does not have an install of "JDK21"...`
Fix:

* Manage Jenkins → Tools → JDK name must match exactly
* Change Jenkinsfile to the exact name (example: `jdk21`)

---

## C) NodeJS Tool Missing

Error:
`No NodeJSInstallation named Node 16 found`
Fix:

* Manage Jenkins → Tools → NodeJS
* Create NodeJS installation with name **Node16**
* Jenkinsfile must reference same name.

---

## D) Docker Push Unauthorized / Insufficient Scopes

Error:
`unauthorized: access token has insufficient scopes`
Fix:

* Use DockerHub **Access Token** with Read/Write
* Ensure image repo is in your namespace:

  * `nilay2497/swiggy-clone:tag`
* Confirm credential ID matches: `dockerhub`

---

## E) SonarQube Quality Gate Failed (Pipeline aborted)

Error:
`Pipeline aborted due to quality gate failure: ERROR`
Meaning:

* Your code has issues breaking the gate threshold (bugs/vulnerabilities/coverage rules).

Fix options:

1. Fix code issues reported in SonarQube dashboard.
2. Change pipeline behavior:

   * `abortPipeline: false` (allows pipeline to continue)
   * But not recommended for real CI/CD.

---

## F) React Build Failed due to Footer.jsx Syntax

Error:
`Syntax error: Identifier directly after number (11:55)`
Cause:

* Your Footer.jsx had broken/unfinished HTML/JSX line:
  Example you had:
  `src="https://media-assets...fl_>` (URL got cut)
  and also:
  `<i class>` incomplete tag

Fix:

* Ensure image `src="....png"` is complete
* Ensure `<i className="..."></i>` is valid JSX
* No incomplete tags.

---

## G) App URL Not Opening (ELB DNS not working)

Common causes:

1. Service is not `LoadBalancer`
2. Wrong `targetPort`
3. Pod not running
4. Security group rules for NodeGroup/ELB

Quick checks:

```bash
kubectl get svc -n swiggy -o wide
kubectl get pods -n swiggy -o wide
kubectl describe svc -n swiggy swiggy-service
```

Best service mapping for React:

* port **80**
* targetPort **3000**

---

## H) Deployment always uses old image

Cause:

* Deployment YAML uses `latest` but Jenkins pushes `${BUILD_NUMBER}`
  Fix:
* Use `kubectl set image` in pipeline:

  ```bash
  kubectl set image deployment/swiggy-app swiggy-app=${DOCKER_IMAGE} -n swiggy
  kubectl rollout status deployment/swiggy-app -n swiggy
  ```

---

# 12) Cleanup (Cost Control)

### Delete EKS (important, costs money)

```bash
eksctl delete cluster --name=virtualtechbox-cluster --region=ap-south-1
```

### Destroy Terraform EC2

```bash
terraform destroy
```

---


-------------------------------------------------------------------------Explantion of DevOps Tools------------------------------------------------------------------------------------------------------------------------------

# Tools & Technologies Explanation (What & Why)

This project uses multiple DevOps and cloud tools. Each tool has a **specific responsibility** in the end-to-end CI/CD lifecycle. Together, they automate build, test, security, deployment, and infrastructure.

---

## 1. Terraform

### What is Terraform?

Terraform is an **Infrastructure as Code (IaC)** tool by HashiCorp. It allows you to define cloud infrastructure (servers, networks, security groups, etc.) using declarative configuration files.

### Why we use Terraform?

* To **automatically create AWS resources** instead of manual clicks
* To ensure **consistency and repeatability**
* To easily **destroy and recreate** infrastructure when needed
* To manage infrastructure like application code

### How Terraform is used in this project?

* Creates an **EC2 instance** for Jenkins
* Creates a **Security Group** with required ports
* Uses `user_data` to automatically install:

  * Jenkins
  * Java
  * Docker
  * SonarQube
  * Trivy

### Key Benefit

> One command (`terraform apply`) creates the entire Jenkins + SonarQube environment.

---

## 2. AWS EC2 (Elastic Compute Cloud)

### What is EC2?

EC2 is a **virtual server** in AWS where we can run applications and services.

### Why we use EC2?

* Jenkins requires a **persistent server**
* Full control over OS, tools, and configurations
* Ideal for learning CI/CD setup

### How EC2 is used?

* Hosts **Jenkins**
* Runs **Docker**
* Runs **SonarQube container**
* Executes **kubectl**, **awscli**, **eksctl**

### Key Benefit

> Central control node for CI/CD operations.

---

## 3. Jenkins

### What is Jenkins?

Jenkins is an **automation server** used for Continuous Integration and Continuous Deployment (CI/CD).

### Why we use Jenkins?

* To automate the entire pipeline
* To run tasks on every GitHub push
* To integrate multiple tools in one workflow

### What Jenkins does in this project?

* Pulls code from GitHub
* Installs dependencies
* Runs SonarQube analysis
* Enforces quality gate
* Runs Trivy scans
* Builds Docker image
* Pushes image to DockerHub
* Deploys app to Kubernetes (EKS)

### Key Feature Used

* **Declarative Pipeline (Jenkinsfile)**

### Key Benefit

> Jenkins is the **orchestrator** that connects all tools together.

---

## 4. Git & GitHub

### What is Git?

Git is a **distributed version control system**.

### What is GitHub?

GitHub is a **remote repository hosting platform** for Git.

### Why we use GitHub?

* Central code repository
* Collaboration
* Webhook integration with Jenkins

### How GitHub is used?

* Stores:

  * React application code
  * Dockerfile
  * Kubernetes manifests
  * Jenkinsfile
* Triggers Jenkins pipeline using **GitHub Webhook**

### Key Benefit

> Any code push automatically starts the CI/CD pipeline.

---

## 5. Node.js & npm

### What is Node.js?

Node.js is a **JavaScript runtime environment**.

### What is npm?

npm (Node Package Manager) manages JavaScript dependencies.

### Why we use Node.js?

* React application requires Node.js to build
* npm installs project dependencies

### How used in pipeline?

* Jenkins installs Node 16
* Runs:

  ```bash
  npm ci || npm install
  npm run build
  ```

### Key Benefit

> Converts source code into production-ready build.

---

## 6. Docker

### What is Docker?

Docker is a **containerization platform** that packages applications with all dependencies.

### Why we use Docker?

* Ensures consistent runtime across environments
* Eliminates “works on my machine” issues
* Required for Kubernetes deployment

### How Docker is used?

* Builds image using Dockerfile
* Tags image with Jenkins build number
* Pushes image to DockerHub

### Example:

```bash
docker build -t swiggy-clone .
docker tag swiggy-clone nilay2497/swiggy-clone:17
docker push nilay2497/swiggy-clone:17
```

### Key Benefit

> Application becomes **portable, scalable, and deployable**.

---

## 7. DockerHub

### What is DockerHub?

DockerHub is a **container image registry**.

### Why we use DockerHub?

* To store Docker images
* To allow Kubernetes to pull images
* Acts as a bridge between Jenkins and EKS

### How DockerHub is used?

* Jenkins pushes images
* Kubernetes pulls images during deployment

### Security Practice

* Jenkins uses **credentials** (username + token)

### Key Benefit

> Central image repository accessible from anywhere.

---

## 8. SonarQube

### What is SonarQube?

SonarQube is a **code quality and security analysis tool**.

### Why we use SonarQube?

* Detects:

  * Bugs
  * Code smells
  * Security vulnerabilities
* Enforces **quality gate**
* Prevents bad code from reaching production

### How SonarQube is used?

* Jenkins runs sonar-scanner
* Code is analyzed
* Quality gate result decides pipeline continuation

### Example:

```bash
sonar-scanner \
-Dsonar.projectKey=Swiggy-CI \
-Dsonar.sources=.
```

### Quality Gate

* If **FAILED** → pipeline stops
* If **PASSED** → pipeline continues

### Key Benefit

> Improves **code quality and security before deployment**.

---

## 9. Trivy

### What is Trivy?

Trivy is a **security vulnerability scanner** by Aqua Security.

### Why we use Trivy?

* Identify known vulnerabilities (CVEs)
* Scan both source code dependencies and Docker images

### Two types of scans used:

#### 1️⃣ Filesystem Scan

```bash
trivy fs .
```

Scans:

* package.json
* package-lock.json
* OS dependencies

#### 2️⃣ Image Scan

```bash
trivy image nilay2497/swiggy-clone:17
```

Scans:

* OS libraries inside image
* Node.js packages
* Known CVEs

### Key Benefit

> Adds **DevSecOps** practices to the pipeline.

---

## 10. AWS EKS (Elastic Kubernetes Service)

### What is EKS?

EKS is a **managed Kubernetes service** by AWS.

### Why we use EKS?

* Production-grade Kubernetes
* High availability and scalability
* No need to manage control plane manually

### How EKS is used?

* Hosts the Swiggy application
* Runs containers created by Jenkins
* Exposes app via AWS Load Balancer

### Created using:

```bash
eksctl create cluster
```

### Key Benefit

> Reliable and scalable container orchestration.

---

## 11. eksctl

### What is eksctl?

eksctl is a **CLI tool** to create and manage EKS clusters.

### Why use eksctl?

* Simplifies EKS creation
* Avoids complex CloudFormation templates

### Used for:

* Creating cluster
* Deleting cluster

### Key Benefit

> One-command Kubernetes cluster creation.

---

## 12. kubectl

### What is kubectl?

kubectl is the **command-line tool for Kubernetes**.

### Why we use kubectl?

* Deploy applications
* Manage pods, services, deployments
* Roll out updates

### How used in pipeline?

```bash
kubectl apply -f deployment.yml
kubectl apply -f service.yml
```

### Key Benefit

> Direct control over Kubernetes resources.

---

## 13. Kubernetes (Deployment & Service)

### Deployment

* Defines how many replicas
* Which Docker image to run
* Ensures self-healing

### Service

* Exposes pods
* LoadBalancer creates AWS ELB
* Provides public URL

### Key Benefit

> Ensures **high availability and external access**.

---

## 14. AWS Load Balancer (via Kubernetes Service)

### What is it?

Automatically created by Kubernetes when Service type is `LoadBalancer`.

### Why needed?

* Provides public endpoint
* Routes traffic to pods

### Final Output

You accessed the app using:

```
http://ab6689d8ec2dd487bb9983b3ee98f3ea-1372702944.ap-south-1.elb.amazonaws.com/
```

---

## 15. GitHub Webhooks

### What is a webhook?

A webhook sends an HTTP request when an event occurs.

### Why we use webhook?

* Trigger Jenkins automatically on code push
* Avoid manual builds
* Enables real CI/CD

### Key Benefit

> Fully automated pipeline.

---

# Summary (One-Line Purpose of Each Tool)

| Tool         | Purpose                           |
| ------------ | --------------------------------- |
| Terraform    | Automates infrastructure creation |
| EC2          | Hosts Jenkins & tools             |
| Jenkins      | CI/CD orchestrator                |
| GitHub       | Source code & trigger             |
| Node.js      | Build React app                   |
| Docker       | Package app                       |
| DockerHub    | Store images                      |
| SonarQube    | Code quality gate                 |
| Trivy        | Security scanning                 |
| EKS          | Kubernetes platform               |
| eksctl       | Easy EKS creation                 |
| kubectl      | Deploy to Kubernetes              |
| LoadBalancer | Public access                     |

---








