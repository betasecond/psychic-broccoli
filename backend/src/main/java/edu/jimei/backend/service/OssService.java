package edu.jimei.backend.service;

import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.IAcsClient;
import com.aliyuncs.auth.sts.AssumeRoleRequest;
import com.aliyuncs.auth.sts.AssumeRoleResponse;
import com.aliyuncs.profile.DefaultProfile;
import edu.jimei.backend.dto.OssUploadCredentialsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class OssService {
    
    private static final Logger logger = LoggerFactory.getLogger(OssService.class);
    
    @Value("${aliyun.oss.access-key-id:}")
    private String accessKeyId;
    
    @Value("${aliyun.oss.access-key-secret:}")
    private String accessKeySecret;
    
    @Value("${aliyun.oss.bucket-name:}")
    private String bucketName;
    
    @Value("${aliyun.oss.endpoint:}")
    private String endpoint;
    
    @Value("${aliyun.oss.region:cn-hangzhou}")
    private String region;
    
    @Value("${aliyun.oss.role-arn:}")
    private String roleArn;
    
    @Value("${aliyun.oss.upload-path:avatars/}")
    private String uploadPath;
    
    /**
     * 获取OSS上传临时凭证
     * @param userId 用户ID
     * @return OSS上传凭证响应
     */
    public OssUploadCredentialsResponse getUploadCredentials(Long userId) {
        try {
            // 如果没有配置STS角色，返回直接上传凭证（仅用于开发环境）
            if (roleArn == null || roleArn.trim().isEmpty()) {
                logger.warn("未配置STS角色，返回直接上传凭证（仅用于开发环境）");
                return createDirectUploadCredentials(userId);
            }
            
            // 创建STS客户端
            DefaultProfile profile = DefaultProfile.getProfile(region, accessKeyId, accessKeySecret);
            IAcsClient client = new DefaultAcsClient(profile);
            
            // 创建AssumeRole请求
            AssumeRoleRequest request = new AssumeRoleRequest();
            request.setRoleArn(roleArn);
            request.setRoleSessionName("user-avatar-upload-" + userId);
            request.setDurationSeconds(3600L); // 1小时有效期
            
            // 设置权限策略，只允许上传到指定路径
            String policy = String.format("""
                {
                    "Version": "1",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": [
                                "oss:PutObject",
                                "oss:PutObjectAcl"
                            ],
                            "Resource": "acs:oss:*:*:%s/%s*"
                        }
                    ]
                }
                """, bucketName, uploadPath);
            request.setPolicy(policy);
            
            // 执行请求
            AssumeRoleResponse response = client.getAcsResponse(request);
            AssumeRoleResponse.Credentials credentials = response.getCredentials();
            
            // 生成唯一的上传路径
            String userUploadPath = uploadPath + userId + "/" + UUID.randomUUID().toString() + "/";
            
            return new OssUploadCredentialsResponse(
                credentials.getAccessKeyId(),
                credentials.getAccessKeySecret(),
                credentials.getSecurityToken(),
                bucketName,
                endpoint,
                region,
                userUploadPath,
                Instant.parse(credentials.getExpiration()).toEpochMilli()
            );
            
        } catch (Exception e) {
            logger.error("获取OSS上传凭证失败", e);
            throw new RuntimeException("获取OSS上传凭证失败: " + e.getMessage());
        }
    }
    
    /**
     * 创建直接上传凭证（用于开发环境）
     */
    private OssUploadCredentialsResponse createDirectUploadCredentials(Long userId) {
        String userUploadPath = uploadPath + userId + "/" + UUID.randomUUID().toString() + "/";
        long expiration = System.currentTimeMillis() + 3600 * 1000; // 1小时后过期
        
        return new OssUploadCredentialsResponse(
            accessKeyId,
            accessKeySecret,
            null, // 直接上传不需要临时token
            bucketName,
            endpoint,
            region,
            userUploadPath,
            expiration
        );
    }
    
    /**
     * 验证OSS配置是否完整
     */
    public boolean isConfigured() {
        return accessKeyId != null && !accessKeyId.trim().isEmpty() &&
               accessKeySecret != null && !accessKeySecret.trim().isEmpty() &&
               bucketName != null && !bucketName.trim().isEmpty() &&
               endpoint != null && !endpoint.trim().isEmpty();
    }
}