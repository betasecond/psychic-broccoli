package edu.jimei.backend.service;

import edu.jimei.backend.dto.*;
import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.exception.UserNotFoundException;
import edu.jimei.backend.repository.UserRepository;
import edu.jimei.backend.util.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
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
    
    @Mock
    private JwtUtils jwtUtils;
    
    @InjectMocks
    private AuthService authService;
    
    private RegisterRequest validRegisterRequest;
    private LoginRequest validLoginRequest;
    private UpdateProfileRequest validUpdateRequest;
    private ChangePasswordRequest validPasswordRequest;
    private User testUser;
    
    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setUsername("testuser");
        validRegisterRequest.setPassword("password123");
        validRegisterRequest.setConfirmPassword("password123");
        validRegisterRequest.setEmail("test@example.com");
        validRegisterRequest.setRole(UserRole.STUDENT);
        
        validLoginRequest = new LoginRequest();
        validLoginRequest.setUsername("testuser");
        validLoginRequest.setPassword("password123");
        
        validUpdateRequest = new UpdateProfileRequest();
        validUpdateRequest.setEmail("updated@example.com");
        validUpdateRequest.setAvatarUrl("https://example.com/avatar.jpg");
        
        validPasswordRequest = new ChangePasswordRequest();
        validPasswordRequest.setCurrentPassword("oldPassword123");
        validPasswordRequest.setNewPassword("newPassword123");
        validPasswordRequest.setConfirmNewPassword("newPassword123");
        
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setPasswordHash("encodedPassword");
        testUser.setEmail("test@example.com");
        testUser.setRole(UserRole.STUDENT);
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
        RegisterResponse response = authService.register(validRegisterRequest);
        
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
                () -> authService.register(validRegisterRequest)
        );
        
        assertEquals("用户名已存在", exception.getMessage());
        verify(userRepository).existsByUsername("testuser");
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void register_WithMismatchedPasswords_ShouldThrowException() {
        // Arrange
        validRegisterRequest.setConfirmPassword("differentPassword");
        
        // Act & Assert
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(validRegisterRequest)
        );
        
        assertEquals("两次密码输入不一致", exception.getMessage());
        verify(userRepository, never()).existsByUsername(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
    
    @Test
    void register_WithNullRole_ShouldDefaultToStudent() {
        // Arrange
        validRegisterRequest.setRole(null);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        
        User savedUser = new User();
        savedUser.setId(1L);
        savedUser.setUsername("testuser");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // Act
        RegisterResponse response = authService.register(validRegisterRequest);
        
        // Assert
        assertNotNull(response);
        verify(userRepository).save(argThat(user -> user.getRole() == UserRole.STUDENT));
    }
    
    @Test
    void login_WithValidCredentials_ShouldReturnLoginResponse() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
        when(jwtUtils.generateJwtToken(testUser)).thenReturn("jwt-token");
        
        // Act
        LoginResponse response = authService.login(validLoginRequest);
        
        // Assert
        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertNotNull(response.getUser());
        assertEquals("testuser", response.getUser().getUsername());
        
        verify(userRepository).findByUsername("testuser");
        verify(passwordEncoder).matches("password123", "encodedPassword");
        verify(jwtUtils).generateJwtToken(testUser);
    }
    
    @Test
    void login_WithInvalidUsername_ShouldThrowBadCredentialsException() {
        // Arrange
        when(userRepository.findByUsername("nonexistent")).thenReturn(Optional.empty());
        
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");
        
        // Act & Assert
        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.login(request)
        );
        
        assertEquals("用户名或密码错误", exception.getMessage());
        verify(userRepository).findByUsername("nonexistent");
        verify(passwordEncoder, never()).matches(anyString(), anyString());
        verify(jwtUtils, never()).generateJwtToken(any(User.class));
    }
    
    @Test
    void login_WithInvalidPassword_ShouldThrowBadCredentialsException() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", "encodedPassword")).thenReturn(false);
        
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");
        
        // Act & Assert
        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.login(request)
        );
        
        assertEquals("用户名或密码错误", exception.getMessage());
        verify(userRepository).findByUsername("testuser");
        verify(passwordEncoder).matches("wrongpassword", "encodedPassword");
        verify(jwtUtils, never()).generateJwtToken(any(User.class));
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
    void isEmailAvailable_WithAvailableEmail_ShouldReturnTrue() {
        // Arrange
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        
        // Act
        boolean result = authService.isEmailAvailable("new@example.com");
        
        // Assert
        assertTrue(result);
        verify(userRepository).existsByEmail("new@example.com");
    }
    
    @Test
    void isEmailAvailable_WithExistingEmail_ShouldReturnFalse() {
        // Arrange
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);
        
        // Act
        boolean result = authService.isEmailAvailable("existing@example.com");
        
        // Assert
        assertFalse(result);
        verify(userRepository).existsByEmail("existing@example.com");
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
    
    @Test
    void updateProfile_WithValidRequest_ShouldReturnUpdatedUserResponse() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.existsByEmail("updated@example.com")).thenReturn(false);
        
        User updatedUser = new User();
        updatedUser.setId(1L);
        updatedUser.setUsername("testuser");
        updatedUser.setEmail("updated@example.com");
        updatedUser.setAvatarUrl("https://example.com/avatar.jpg");
        updatedUser.setRole(UserRole.STUDENT);
        
        when(userRepository.save(any(User.class))).thenReturn(updatedUser);
        
        // Act
        UserResponse response = authService.updateProfile(1L, validUpdateRequest);
        
        // Assert
        assertNotNull(response);
        assertEquals("updated@example.com", response.getEmail());
        assertEquals("https://example.com/avatar.jpg", response.getAvatarUrl());
        
        verify(userRepository).findById(1L);
        verify(userRepository).existsByEmail("updated@example.com");
        verify(userRepository).save(any(User.class));
    }
    
    @Test
    void changePassword_WithValidRequest_ShouldUpdatePassword() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldPassword123", "encodedPassword")).thenReturn(true);
        when(passwordEncoder.encode("newPassword123")).thenReturn("newEncodedPassword");
        
        // Act
        authService.changePassword(1L, validPasswordRequest);
        
        // Assert
        verify(userRepository).findById(1L);
        verify(passwordEncoder).matches("oldPassword123", "encodedPassword");
        verify(passwordEncoder).encode("newPassword123");
        verify(userRepository).save(argThat(user -> "newEncodedPassword".equals(user.getPasswordHash())));
    }
    
    @Test
    void changePassword_WithWrongCurrentPassword_ShouldThrowBadCredentialsException() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);
        
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrongPassword");
        request.setNewPassword("newPassword123");
        request.setConfirmNewPassword("newPassword123");
        
        // Act & Assert
        BadCredentialsException exception = assertThrows(
                BadCredentialsException.class,
                () -> authService.changePassword(1L, request)
        );
        
        assertEquals("当前密码错误", exception.getMessage());
        verify(userRepository).findById(1L);
        verify(passwordEncoder).matches("wrongPassword", "encodedPassword");
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
}