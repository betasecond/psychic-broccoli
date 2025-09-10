# **Docker & Docker Compose 配置约定**

版本: 1.0  
目标: 为在线教育平台项目定义一套标准的容器化构建、部署和管理流程。

## **1\. 概述**

本文档旨在统一项目团队在使用 Docker 和 Docker Compose 时的配置、命令和最佳实践。通过容器化，我们可以实现：

* **环境一致性:** 消除“在我电脑上能跑”的问题。  
* **快速部署:** 通过一条命令即可启动整个应用栈。  
* **服务隔离:** 各个服务（前端、后端、数据库）在独立的环境中运行，互不干扰。  
* **平滑扩展:** 便于未来对单个服务进行水平扩展。

## **2\. 推荐项目目录结构**

一个清晰的目录结构是高效协作的基础。

online-education-platform/  
├── backend/                  \# 后端 Spring Boot 项目  
│   ├── src/  
│   ├── pom.xml  
│   └── Dockerfile            \# 后端 Dockerfile  
│  
├── frontend/                 \# 前端 React 项目  
│   ├── src/  
│   ├── package.json  
│   └── Dockerfile            \# 前端 Dockerfile  
│  
├── .env                      \# 环境变量文件 (不提交到 Git)  
├── docker-compose.yml        \# Docker Compose 编排文件  
└── nginx.conf                \# Nginx 配置文件 (与 docker-compose.yml 同级)

## **3\. Dockerfile 最佳实践**

为了构建体积小、安全性高且高效的镜像，我们采用多阶段构建（Multi-stage builds）。

### **3.1. 后端 Dockerfile (backend/Dockerfile)**

此文件用于将 Spring Boot 应用打包成一个优化的 Docker 镜像。

\# \--- Stage 1: Build a JAR file \---  
\# 使用一个包含 Maven 和 JDK 的基础镜像  
FROM maven:3.8.5-openjdk-17 AS builder

\# 设置工作目录  
WORKDIR /app

\# 复制 pom.xml 并下载依赖, 充分利用 Docker 缓存  
COPY pom.xml .  
RUN mvn dependency:go-offline

\# 复制源代码并构建应用  
COPY src ./src  
RUN mvn package \-DskipTests

\# \--- Stage 2: Create a slim final image \---  
\# 使用一个仅包含 JRE 的轻量级镜像  
FROM eclipse-temurin:17-jre-focal

\# 设置工作目录  
WORKDIR /app

\# 从 builder 阶段复制构建好的 JAR 文件  
COPY \--from=builder /app/target/\*.jar app.jar

\# 暴露后端服务端口  
EXPOSE 35001

\# 容器启动时运行 JAR 文件  
ENTRYPOINT \["java", "-jar", "app.jar"\]

### **3.2. 前端 Dockerfile (frontend/Dockerfile)**

此文件用于构建前端 React 应用的静态文件，并使用 Nginx 来提供服务，这是生产环境的最佳实践。

\# \--- Stage 1: Build static assets \---  
\# 使用一个 Node.js 镜像来构建项目  
FROM node:18-alpine AS builder

\# 设置工作目录  
WORKDIR /app

\# 复制 package.json 和 lock 文件  
COPY package\*.json ./

\# 安装依赖  
RUN npm install

\# 复制源代码  
COPY . .

\# 构建生产环境的静态文件  
RUN npm run build

\# \--- Stage 2: Serve with Nginx \---  
\# 使用一个轻量级的 Nginx 镜像  
FROM nginx:1.23-alpine

\# 从 builder 阶段复制构建好的静态文件到 Nginx 的默认 Web 根目录  
COPY \--from=builder /app/build /usr/share/nginx/html

\# (可选) 如果你的 React Router 使用了 BrowserRouter, 你需要一个 Nginx 配置来处理前端路由  
\# COPY nginx.conf /etc/nginx/conf.d/default.conf  
\# 这个 nginx.conf 是专门为前端服务准备的，不是项目根目录下的那个  
\# 它的作用是将所有非静态文件的请求都指向 index.html  
\#  
\# 示例 \`frontend/nginx.conf\`:  
\# server {  
\#   listen 80;  
\#   location / {  
\#     root   /usr/share/nginx/html;  
\#     index  index.html index.htm;  
\#     try\_files $uri $uri/ /index.html;  
\#   }  
\# }

\# 暴露端口  
EXPOSE 80

\# 启动 Nginx  
CMD \["nginx", "-g", "daemon off;"\]

**注意:** 此 Dockerfile 用于生产部署。在开发阶段，前端服务通常是在本地通过 npm run dev 运行，并利用 docker-compose.yml 的 volumes 挂载代码以实现热更新。

## **4\. Docker Compose 配置详解 (docker-compose.yml)**

此文件是整个容器化应用的“总指挥”，定义和关联所有服务。

\# Docker Compose 文件版本  
version: '3.8'

\# 定义所有服务 (容器)  
services:  
  \# 后端 Spring Boot 服务  
  backend:  
    container\_name: online-edu-backend  
    build:  
      context: ./backend \# 指定 Dockerfile 所在目录  
    restart: always  
    environment:  
      \# 通过 .env 文件注入数据库连接信息  
      \- SPRING\_DATASOURCE\_URL=jdbc:postgresql://postgres:5432/${POSTGRES\_DB}  
      \- SPRING\_DATASOURCE\_USERNAME=${POSTGRES\_USER}  
      \- SPRING\_DATASOURCE\_PASSWORD=${POSTGRES\_PASSWORD}  
    networks:  
      \- app-network  
    depends\_on:  
      \- postgres \# 确保后端在数据库启动之后再启动

  \# 前端 React 服务 (生产模式)  
  frontend:  
    container\_name: online-edu-frontend  
    build:  
      context: ./frontend  
    restart: always  
    networks:  
      \- app-network

  \# PostgreSQL 数据库服务  
  postgres:  
    container\_name: online-edu-db  
    image: postgres:14-alpine  
    restart: always  
    environment:  
      \# 从 .env 文件读取数据库的用户名、密码和库名  
      \- POSTGRES\_USER=${POSTGRES\_USER}  
      \- POSTGRES\_PASSWORD=${POSTGRES\_PASSWORD}  
      \- POSTGRES\_DB=${POSTGRES\_DB}  
    volumes:  
      \# 将数据库数据持久化到宿主机，防止容器删除后数据丢失  
      \- postgres\_data:/var/lib/postgresql/data  
    networks:  
      \- app-network  
    ports:  
      \# (可选) 暴露 5432 端口到宿主机，方便使用数据库工具连接  
      \- "5432:5432"

  \# Nginx 反向代理服务  
  nginx:  
    container\_name: online-edu-nginx  
    image: nginx:latest  
    restart: always  
    ports:  
      \# 应用的唯一入口  
      \- "35000:35000"  
    volumes:  
      \# 将宿主机的 nginx.conf 文件挂载到容器中  
      \- ./nginx.conf:/etc/nginx/conf.d/default.conf  
    networks:  
      \- app-network  
    depends\_on:  
      \- backend  
      \- frontend

\# 定义 Docker 网络  
networks:  
  app-network:  
    driver: bridge

\# 定义数据卷  
volumes:  
  postgres\_data:

## **5\. 环境变量管理 (.env 文件)**

在项目根目录创建一个 .env 文件来存储敏感信息和配置。**此文件不应提交到版本控制系统 (Git)**。

\# .env file

\# PostgreSQL Database Configuration  
POSTGRES\_USER=myuser  
POSTGRES\_PASSWORD=mypassword  
POSTGRES\_DB=online\_edu\_db

\# JWT Secret Key (Example)  
JWT\_SECRET=your-super-secret-key-that-is-long-and-random

## **6\. 运行与管理**

* **首次启动或重建镜像:**  
  docker-compose up \--build \-d

  (-d 表示在后台运行)  
* **启动已构建的应用:**  
  docker-compose up \-d

* **停止应用:**  
  docker-compose down

* **查看所有服务的日志:**  
  docker-compose logs \-f

* **查看特定服务的日志:**  
  docker-compose logs \-f backend  