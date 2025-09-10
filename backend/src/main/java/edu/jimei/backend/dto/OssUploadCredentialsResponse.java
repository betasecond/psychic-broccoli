package edu.jimei.backend.dto;

public class OssUploadCredentialsResponse {
    
    private String accessKeyId;
    private String accessKeySecret;
    private String securityToken;
    private String bucketName;
    private String endpoint;
    private String region;
    private String uploadPath;
    private Long expiration;
    
    // Constructors
    public OssUploadCredentialsResponse() {}
    
    public OssUploadCredentialsResponse(String accessKeyId, String accessKeySecret, String securityToken, 
                                      String bucketName, String endpoint, String region, 
                                      String uploadPath, Long expiration) {
        this.accessKeyId = accessKeyId;
        this.accessKeySecret = accessKeySecret;
        this.securityToken = securityToken;
        this.bucketName = bucketName;
        this.endpoint = endpoint;
        this.region = region;
        this.uploadPath = uploadPath;
        this.expiration = expiration;
    }
    
    // Getters and Setters
    public String getAccessKeyId() {
        return accessKeyId;
    }
    
    public void setAccessKeyId(String accessKeyId) {
        this.accessKeyId = accessKeyId;
    }
    
    public String getAccessKeySecret() {
        return accessKeySecret;
    }
    
    public void setAccessKeySecret(String accessKeySecret) {
        this.accessKeySecret = accessKeySecret;
    }
    
    public String getSecurityToken() {
        return securityToken;
    }
    
    public void setSecurityToken(String securityToken) {
        this.securityToken = securityToken;
    }
    
    public String getBucketName() {
        return bucketName;
    }
    
    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }
    
    public String getEndpoint() {
        return endpoint;
    }
    
    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }
    
    public String getRegion() {
        return region;
    }
    
    public void setRegion(String region) {
        this.region = region;
    }
    
    public String getUploadPath() {
        return uploadPath;
    }
    
    public void setUploadPath(String uploadPath) {
        this.uploadPath = uploadPath;
    }
    
    public Long getExpiration() {
        return expiration;
    }
    
    public void setExpiration(Long expiration) {
        this.expiration = expiration;
    }
    
    @Override
    public String toString() {
        return "OssUploadCredentialsResponse{" +
                "accessKeyId='" + accessKeyId + '\'' +
                ", bucketName='" + bucketName + '\'' +
                ", endpoint='" + endpoint + '\'' +
                ", region='" + region + '\'' +
                ", uploadPath='" + uploadPath + '\'' +
                ", expiration=" + expiration +
                '}';
    }
}