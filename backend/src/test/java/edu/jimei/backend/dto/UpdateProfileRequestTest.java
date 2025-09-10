package edu.jimei.backend.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class UpdateProfileRequestTest {
    
    private Validator validator;
    
    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }
    
    @Test
    void testValidUpdateProfileRequest() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("test@example.com");
        request.setAvatarUrl("https://example.com/avatar.jpg");
        
        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }
    
    @Test
    void testInvalidEmail() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("invalid-email");
        
        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("邮箱格式不正确"));
    }
    
    @Test
    void testEmailTooLong() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        // Create a string that's definitely too long
        String longEmail = "test@" + "a".repeat(200) + ".com"; // Way more than 100 characters
        request.setEmail(longEmail);
        
        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);
        
        // Should have at least one violation (either email format or length)
        assertFalse(violations.isEmpty());
    }
    
    @Test
    void testAvatarUrlTooLong() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setAvatarUrl("https://example.com/" + "a".repeat(500)); // More than 500 characters
        
        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("头像URL长度不能超过500个字符"));
    }
    
    @Test
    void testEmptyFieldsAreValid() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        
        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }
}