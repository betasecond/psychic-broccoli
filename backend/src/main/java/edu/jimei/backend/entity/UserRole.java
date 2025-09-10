package edu.jimei.backend.entity;

public enum UserRole {
    STUDENT("学生"),
    INSTRUCTOR("教师"),
    ADMIN("管理员");
    
    private final String displayName;
    
    UserRole(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}