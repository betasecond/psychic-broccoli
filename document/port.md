# **Nginx 代理配置约定**

版本: 1.0  
目标: 为在线教育平台配置 Nginx 作为反向代理，统一入口，并分发请求至前端和后端服务。

## **1\. 端口与服务约定**

根据您的要求，我们约定以下端口和服务地址：

* **Nginx (代理服务器):**  
  * **监听端口:** 35000  
  * **职责:** 作为应用的唯一入口，接收所有外部 HTTP/WebSocket 请求。  
* **后端服务 (Spring Boot):**  
  * **运行地址:** http://localhost:35001  
  * **职责:** 处理所有业务逻辑、API 请求 (/api/) 和实时通信 (/ws)。  
* **前端服务 (React Vite Dev Server):**  
  * **运行地址:** http://localhost:35002  
  * **职责:** 提供前端静态资源和页面路由。

## **2\. 路由规则**

Nginx 将根据请求的 URL 路径将流量转发到相应的服务：

1. **API 请求:** 所有以 /api/ 开头的请求，都将被转发到 **后端服务** (http://localhost:35001)。  
2. **WebSocket 请求:** 所有路径为 /ws 的请求，将被特殊处理并升级为 WebSocket 连接，然后转发到 **后端服务** (http://localhost:35001)。  
3. **其他所有请求:** 所有不匹配以上规则的请求（例如页面访问、静态资源加载等），都将被转发到 **前端服务** (http://localhost:35002)。

## **3\. Nginx 配置文件示例 (nginx.conf)**

以下是一个完整的 Nginx 配置示例，您可以直接使用或根据实际情况进行微调。

\# 定义上游服务，方便管理和扩展  
\# 后端 Spring Boot 服务  
upstream backend\_servers {  
    \# ip\_hash; \# 如果后端是集群，可以使用 ip\_hash 策略保持 session  
    server 127.0.0.1:35001;  
}

\# 前端 React 开发服务  
upstream frontend\_servers {  
    server 127.0.0.1:35002;  
}

\# 主服务器配置  
server {  
    \# 1\. 监听端口  
    listen 35000;  
    server\_name localhost; \# 您可以替换为您的域名

    \# 2\. API 接口代理配置  
    \# 所有 /api/ 开头的请求都转发到后端  
    location /api/ {  
        proxy\_pass http://backend\_servers;

        \# 设置请求头，以便后端能获取到真实的客户端信息  
        proxy\_set\_header Host $host;  
        proxy\_set\_header X-Real-IP $remote\_addr;  
        proxy\_set\_header X-Forwarded-For $proxy\_add\_x\_forwarded\_for;  
        proxy\_set\_header X-Forwarded-Proto $scheme;  
        proxy\_set\_header Upgrade $http\_upgrade;  
        proxy\_set\_header Connection "upgrade";  
    }

    \# 3\. WebSocket 代理配置  
    \# 专门为 /ws 路径配置，以支持 STOMP over WebSocket  
    location /ws {  
        proxy\_pass http://backend\_servers;  
          
        \# 升级 HTTP 连接为 WebSocket 连接的必要头信息  
        proxy\_http\_version 1.1;  
        proxy\_set\_header Upgrade $http\_upgrade;  
        proxy\_set\_header Connection "Upgrade";  
        proxy\_set\_header Host $host;

        \# 增加超时时间  
        proxy\_read\_timeout 86400s;  
        proxy\_send\_timeout 86400s;  
    }

    \# 4\. 前端应用代理配置  
    \# 根路径 / 匹配所有其他请求  
    location / {  
        proxy\_pass http://frontend\_servers;  
          
        \# 设置请求头  
        proxy\_set\_header Host $host;  
        proxy\_set\_header X-Real-IP $remote\_addr;  
        proxy\_set\_header X-Forwarded-For $proxy\_add\_x\_forwarded\_for;  
        proxy\_set\_header X-Forwarded-Proto $scheme;

        \# 同样需要为 Vite 开发服务器的 HMR (热模块替换) 配置 WebSocket  
        proxy\_set\_header Upgrade $http\_upgrade;  
        proxy\_set\_header Connection "upgrade";  
    }

    \# (可选) 其他通用配置  
    \# 设置允许客户端上传文件的最大尺寸  
    client\_max\_body\_size 100M;   
}

### **如何使用:**

1. 将上述配置内容保存为 nginx.conf 文件。  
2. 将其放置在 Nginx 的配置目录中（例如 /etc/nginx/conf.d/ 或 /usr/local/etc/nginx/servers/，具体路径取决于您的安装方式）。  
3. 启动或重新加载 Nginx 服务: nginx \-s reload。  
4. 确保您的后端和前端服务分别在 35001 和 35002 端口上运行。  
5. 现在，通过访问 http://localhost:35000 即可访问您的整个应用。