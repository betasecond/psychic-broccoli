package edu.jimei.backend.dto;

import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;

public class UserResponse {
    
    private Long userId;
    private String username;
    private String email;
    private String avatarUrl;
    private UserRole role;
    
    // Constructors
    public UserResponse() {}
    
    public UserResponse(Long userId, String username, String email, String avatarUrl, UserRole role) {
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.role = role;
    }
    
    // Static factory method to create UserResponse from User entity
    public static UserResponse fromUser(User user) {
        return new UserResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getAvatarUrl(),
            user.getRole()
        );
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
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getAvatarUrl() {
        return avatarUrl;
    }
    
    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
    
    public UserRole getRole() {
        return role;
    }
    
    public void setRole(UserRole role) {
        this.role = role;
    }
    
    @Override
    public String toString() {
        return "UserResponse{" +
                "userId=" + userId +
                ", username='" + username + '\'' +
                ", email='" + email + '\'' +
                ", role=" + role +
                '}';
    }
}