package edu.jimei.backend.dto;

public class LoginResponse {
    
    private String accessToken;
    private String tokenType;
    private UserResponse user;
    
    // Constructors
    public LoginResponse() {}
    
    public LoginResponse(String accessToken, String tokenType, UserResponse user) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.user = user;
    }
    
    // Static factory method for creating login response
    public static LoginResponse create(String accessToken, UserResponse user) {
        return new LoginResponse(accessToken, "Bearer", user);
    }
    
    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }
    
    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }
    
    public String getTokenType() {
        return tokenType;
    }
    
    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }
    
    public UserResponse getUser() {
        return user;
    }
    
    public void setUser(UserResponse user) {
        this.user = user;
    }
    
    @Override
    public String toString() {
        return "LoginResponse{" +
                "tokenType='" + tokenType + '\'' +
                ", user=" + user +
                '}';
    }
}