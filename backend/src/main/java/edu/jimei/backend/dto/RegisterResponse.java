package edu.jimei.backend.dto;

public class RegisterResponse {
    
    private Long userId;
    private String username;
    private String message;
    
    // Constructors
    public RegisterResponse() {}
    
    public RegisterResponse(Long userId, String username) {
        this.userId = userId;
        this.username = username;
        this.message = "用户注册成功";
    }
    
    public RegisterResponse(Long userId, String username, String message) {
        this.userId = userId;
        this.username = username;
        this.message = message;
    }
    
    // Getters and Setters
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    @Override
    public String toString() {
        return "RegisterResponse{" +
                "userId=" + userId +
                ", username='" + username + '\'' +
                ", message='" + message + '\'' +
                '}';
    }
}