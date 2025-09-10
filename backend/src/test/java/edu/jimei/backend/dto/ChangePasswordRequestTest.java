package edu.jimei.backend.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class ChangePasswordRequestTest {
    
    private Validator validator;
    
    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }
    
    @Test
    void testValidChangePasswordRequest() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("newPassword123");
        request.setConfirmNewPassword("newPassword123");
        
        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
        assertTrue(request.isNewPasswordMatching());
    }
    
    @Test
    void testCurrentPasswordRequired() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setNewPassword("newPassword123");
        request.setConfirmNewPassword("newPassword123");
        
        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("当前密码不能为空"));
    }
    
    @Test
    void testNewPasswordRequired() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setConfirmNewPassword("newPassword123");
        
        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("新密码不能为空"));
    }
    
    @Test
    void testConfirmNewPasswordRequired() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("newPassword123");
        
        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("确认新密码不能为空"));
    }
    
    @Test
    void testNewPasswordTooShort() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("123");
        request.setConfirmNewPassword("123");
        
        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size());
        assertTrue(violations.iterator().next().getMessage().contains("新密码长度不能少于6位"));
    }
    
    @Test
    void testPasswordsDoNotMatch() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("newPassword123");
        request.setConfirmNewPassword("differentPassword123");
        
        assertFalse(request.isNewPasswordMatching());
    }
    
    @Test
    void testPasswordsMatch() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("newPassword123");
        request.setConfirmNewPassword("newPassword123");
        
        assertTrue(request.isNewPasswordMatching());
    }
}