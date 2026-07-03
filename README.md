<div align="center">
  <img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" />
  <img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" />
  <img src="https://img.shields.io/badge/Terraform-844FBA?style=for-the-badge&logo=terraform&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" />

  <h1>🚀 LinguistAI - Full-Stack DevOps & Cloud Infrastructure</h1>
  <p><strong>A complete journey of taking a web application from local development to a highly scalable, automated AWS production environment!</strong></p>
</div>

<br />

## 📖 Introduction (For Beginners)

Hello! 👋 If you are a recruiter, interviewer, or a fresher looking to understand how real-world applications are hosted in the cloud, you are in the right place.

**LinguistAI** is a language translation and chat application. But the **real magic** of this repository is not just the app itself—it's **how the app is hosted and delivered**. 

In the real world, you can't just run an app on your laptop. You need to package it, put it on powerful servers, make sure it never crashes, and automate how new updates are launched. This project demonstrates exactly how to do that using modern **DevOps** tools.

We took a standard web app and gave it "superpowers":
1. **Containerization (Docker):** We put the app in isolated boxes so it can run anywhere.
2. **Infrastructure as Code (Terraform):** Instead of clicking around the AWS website to buy servers, we wrote code to automatically build our entire cloud datacenter.
3. **Orchestration (Kubernetes/EKS):** We used an AI-like manager to automatically restart the app if it crashes and scale it up if millions of users visit.
4. **Automation (GitHub Actions):** Whenever a developer pushes new code, a robot automatically tests it and deploys it to live servers without human touch.

---

## 🎨 Colorful Architecture Diagram

Here is exactly how a user's request travels through the internet and into our AWS infrastructure.

```mermaid
graph TD
    %% Custom Colors for the Diagram
    classDef user fill:#8c52ff,stroke:#fff,stroke-width:2px,color:white;
    classDef aws fill:#FF9900,stroke:#232F3E,stroke-width:2px,color:black;
    classDef k8s fill:#326CE5,stroke:#fff,stroke-width:2px,color:white;
    classDef db fill:#47A248,stroke:#fff,stroke-width:2px,color:white;
    classDef cicd fill:#2088FF,stroke:#fff,stroke-width:2px,color:white;
    classDef internet fill:#00d2ff,stroke:#fff,stroke-width:2px,color:black;

    User([👤 You / End User]):::user -->|Types URL in Browser| Internet((🌐 Internet)):::internet
    Internet -->|Routes Traffic| ALB[⚖️ AWS Application Load Balancer]:::aws
    
    subgraph AWS_Cloud [☁️ AWS Cloud Environment]
        ALB -->|Distributes Traffic| EKS_Nodes
        
        subgraph EKS [☸️ Amazon EKS (Kubernetes Cluster)]
            EKS_Control[🧠 EKS Control Plane<br/>The Master Brain]:::k8s
            
            subgraph EKS_Nodes [🖥️ EC2 Auto Scaling Group (Worker Nodes)]
                Node1[Node 1: t3.small]:::aws
                Node2[Node 2: t3.small]:::aws
                
                subgraph Pods [📦 Kubernetes Pods]
                    Client[🎨 Frontend React Pod<br/>(Nginx)]:::k8s
                    Server[⚙️ Backend Node.js Pod<br/>(Express)]:::k8s
                end
            end
            
            EKS_Control -.->|Manages Health| EKS_Nodes
        end
        
        Client -->|API Requests| Server
        Server -->|Saves Data| MongoDB[(🍃 MongoDB Atlas)]:::db
        Server -->|AI Translations| Gemini[🤖 Google Gemini API]
    end
    
    subgraph Automation [⚙️ CI/CD Pipeline]
        Git[🐙 Push to GitHub]:::cicd --> Action[⚡ GitHub Actions]:::cicd
        Action -->|Builds| Docker[🐳 DockerHub]:::cicd
        Action -->|Deploys New Version| EKS_Control
    end
```

---

## 🔍 How Everything Works (In Simple Terms)

### 1. ⚖️ The AWS Application Load Balancer (ALB)
Imagine a busy restaurant with 10 chefs (servers). If all customers yell their orders at one chef, that chef will crash. The **Load Balancer** is the head waiter. It takes traffic from the internet and evenly distributes it across our EC2 servers so no single server gets overwhelmed. 

### 2. 🖥️ AWS EC2 Auto Scaling Group
These are the physical virtual computers (t3.small servers) rented from AWS. If one server catches fire or crashes, the **Auto Scaling Group** instantly buys a new one and boots it up automatically to replace it.

### 3. ☸️ Amazon EKS (Kubernetes)
Kubernetes is the intelligent manager inside our EC2 servers. It makes sure our application (Frontend and Backend) is always running.
- If the Backend crashes, Kubernetes restarts it in **under 3 seconds**.
- We separated the app into **Pods** (small containers). The Frontend runs on Nginx, and the Backend runs on Node.js.

### 4. ⚡ GitHub Actions (CI/CD)
CI/CD stands for Continuous Integration & Continuous Deployment. 
Whenever I finish writing new code and push it to GitHub, GitHub Actions acts like an invisible robot. It packages my new code into a Docker image, uploads it to the internet, and tells Kubernetes to swap the old app out for the new one—with **zero downtime** for the users.

---

## 🛠 Complete Technology Stack

| Category | Tool Used | Why we used it? |
| :--- | :--- | :--- |
| **Cloud Provider** | AWS (Amazon Web Services) | The most powerful and reliable cloud in the world. |
| **Infrastructure** | Terraform | To create AWS servers using code instead of manual clicks. |
| **Containers** | Docker & DockerHub | To package the app so it works exactly the same on any computer. |
| **Orchestration** | Kubernetes & EKS | To keep the app alive 24/7 and manage traffic. |
| **Automation** | GitHub Actions | To deploy code updates automatically. |
| **Frontend App** | React, Vite, Nginx | Fast, modern user interface. |
| **Backend App** | Node.js, Express.js | To handle API requests and business logic. |
| **Database** | MongoDB Atlas | To safely store user data in the cloud. |

---

## 🚀 How to Run This Project Yourself

If you want to create this exact cloud infrastructure on your own AWS account, follow these steps!

### Prerequisites
1. Create an AWS Account and install the [AWS CLI](https://aws.amazon.com/cli/).
2. Install [Terraform](https://www.terraform.io/downloads).
3. Install [kubectl](https://kubernetes.io/docs/tasks/tools/).

### Step 1: Clone the Code
```bash
git clone https://github.com/shubham-gayke/linguistai-devops.git
cd linguistai-devops
```

### Step 2: Build the AWS Infrastructure
This will tell Terraform to go to AWS and build your VPC, Subnets, and EKS Cluster automatically.
```bash
cd terraform
terraform init
terraform plan
terraform apply --auto-approve
```
*(Grab a coffee! Building a Kubernetes cluster takes about 15 minutes).*

### Step 3: Connect your Terminal to the Cluster
```bash
aws eks update-kubeconfig --name linguistai-cluster-dev --region ap-south-1
```

### Step 4: Add your Passwords (Secrets)
Never put passwords in code! We inject them directly into Kubernetes.
```bash
kubectl create namespace linguistai
kubectl create secret generic linguistai-secrets \
  --from-literal=MONGODB_URI="your_mongodb_uri" \
  --from-literal=GEMINI_API_KEY="your_api_key" \
  --namespace=linguistai
```

### Step 5: Deploy the App
```bash
kubectl apply -k kubernetes/base
```

### Step 6: Get your Live URL
```bash
kubectl get svc linguistai-client -n linguistai
```
Find the `EXTERNAL-IP` (it looks like a long AWS link) and paste it into your browser to see the live app!

---

## 👨‍💻 About the Author

**Shubham Gayke**  
*Passionate about Cloud, Automation, and making things scale.*  
**Skills:** Linux | AWS | Kubernetes | Terraform | Docker | CI/CD

⭐ *Thank you for checking out my project!*