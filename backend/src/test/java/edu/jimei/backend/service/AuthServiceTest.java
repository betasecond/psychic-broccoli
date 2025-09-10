package edu.jimei.backend.service;

import edu.jimei.backend.dto.RegisterRequest;
import edu.jimei.backend.dto.RegisterResponse;
import edu.jimei.backend.dto.UserResponse;
import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.exception.UserNotFoundException;
import edu.jimei.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @InjectMocks
    private AuthService authService;
    
    private RegisterRequest validRequest;
    
    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest();
        validRequest.setUsername("testuser");
        validRequest.setPassword("password123");
        validRequest.setConfirmPassword("password123");
        validRequest.setEmail("test@example.com");
        validRequest.setRole(UserRole.STUDENT);
    }
    
    @Test
    void register_WithValidRequest_ShouldReturnSuccessResponse() {
        // Arrange
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        
        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setUsername("testuser");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // Act
        RegisterResponse response = authService.register(validRequest);
        
        // Assert
        assertNotNull(response);
        assertEquals(1L, response.getUserId());
        assertEquals("testuser", response.getUsername());
        
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository).existsByEmail("test@example.com");
        verify(passwordEncoder).encode("password123");
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    void register_WithExistingUsername_ShouldThrowException() {
        // Arrange
        when(userRepository.existsByUsername(anyString())).thenReturn(true);
        
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(validRequest)
        );
        
        assertEquals("用户名已存在", exception.getMessage());
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void register_WithMismatchedPasswords_ShouldThrowException() {
        // Arrange
        validRequest.setConfirmPassword("differentPassword");
        
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(validRequest)
        );
        
        assertEquals("两次密码输入不一致", exception.getMessage());
        verify(userRepository, never()).existsByUsername(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void register_WithNullRole_ShouldDefaultToStudent() {
        // Arrange
        validRequest.setRole(null);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        
        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setUsername("testuser");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // Act
        RegisterResponse response = authService.register(validRequest);
        
        // Assert
        assertNotNull(response);
        verify(userRepository).save(argThat(user -> user.getRole() == UserRole.STUDENT));
    }
    
    @Test
    void isUsernameAvailable_WithAvailableUsername_ShouldReturnTrue() {
        // Arrange
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        
        // Act
        boolean result = authService.isUsernameAvailable("newuser");
        
        // Assert
        assertTrue(result);
        verify(userRepository).existsByUsername("newuser");
    }
    
    @Test
    void isUsernameAvailable_WithExistingUsername_ShouldReturnFalse() {
        // Arrange
        when(userRepository.existsByUsername("existinguser")).thenReturn(true);
        
        // Act
        boolean result = authService.isUsernameAvailable("existinguser");
        
        // Assert
        assertFalse(result);
        verify(userRepository).existsByUsername("existinguser");
    }
    
    @Test
    void getCurrentUser_WithValidUserId_ShouldReturnUserResponse() {
        // Arrange
        Long userId = 1L;
        User user = new User();
        user.setId(userId);
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setRole(UserRole.STUDENT);
        user.setAvatarUrl("http://example.com/avatar.jpg");
        
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        
        // Act
        UserResponse response = authService.getCurrentUser(userId);
        
        // Assert
        assertNotNull(response);
        assertEquals(userId, response.getUserId());
        assertEquals("testuser", response.getUsername());
        assertEquals("test@example.com", response.getEmail());
        assertEquals(UserRole.STUDENT, response.getRole());
        assertEquals("http://example.com/avatar.jpg", response.getAvatarUrl());
        
        verify(userRepository).findById(userId);
    }
    
    @Test
    void getCurrentUser_WithInvalidUserId_ShouldThrowUserNotFoundException() {
        // Arrange
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        
        // Act & Assert
        UserNotFoundException exception = assertThrows(
                UserNotFoundException.class,
                () -> authService.getCurrentUser(userId)
        );
        
        assertEquals("用户不存在，用户ID: " + userId, exception.getMessage());
        verify(userRepository).findById(userId);
    }
}