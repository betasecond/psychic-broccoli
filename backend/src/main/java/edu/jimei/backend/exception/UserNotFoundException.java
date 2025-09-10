package edu.jimei.backend.exception;

/**
 * 用户未找到异常
 * 当根据用户ID查找用户但用户不存在时抛出此异常
 */
public class UserNotFoundException extends RuntimeException {
    
    public UserNotFoundException(String message) {
        super(message);
    }
    
    public UserNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public UserNotFoundException(Long userId) {
        super("用户不存在，用户ID: " + userId);
    }
}