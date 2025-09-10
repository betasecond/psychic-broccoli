package edu.jimei.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.jimei.backend.dto.*;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.security.UserPrincipal;
import edu.jimei.backend.service.AuthService;
import edu.jimei.backend.service.OssService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private OssService ossService;

    @Autowired
    private ObjectMapper objectMapper;

    private RegisterRequest validRegisterRequest;
    private LoginRequest validLoginRequest;
    private UpdateProfileRequest validUpdateRequest;
    private ChangePasswordRequest validPasswordRequest;

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
    }

    @Test
    void register_WithValidRequest_ShouldReturnSuccess() throws Exception {
        // Arrange
        RegisterResponse response = new RegisterResponse();
        response.setUserId(1L);
        response.setUsername("testuser");
        
        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("注册成功"))
                .andExpect(jsonPath("$.data.userId").value(1))
                .andExpect(jsonPath("$.data.username").value("testuser"));

        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    void register_WithInvalidRequest_ShouldReturnBadRequest() throws Exception {
        // Arrange
        validRegisterRequest.setUsername(""); // Invalid username

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(authService, never()).register(any(RegisterRequest.class));
    }

    @Test
    void register_WithExistingUsername_ShouldReturnBadRequest() throws Exception {
        // Arrange
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("用户名已存在"));

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("用户名已存在"));

        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    void login_WithValidCredentials_ShouldReturnSuccess() throws Exception {
        // Arrange
        UserResponse userResponse = new UserResponse();
        userResponse.setUserId(1L);
        userResponse.setUsername("testuser");
        userResponse.setRole(UserRole.STUDENT);

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setAccessToken("jwt-token");
        loginResponse.setTokenType("Bearer");
        loginResponse.setUser(userResponse);

        when(authService.login(any(LoginRequest.class))).thenReturn(loginResponse);

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validLoginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("登录成功，正在跳转到学生仪表板"))
                .andExpect(jsonPath("$.data.accessToken").value("jwt-token"))
                .andExpect(jsonPath("$.data.user.username").value("testuser"));

        verify(authService).login(any(LoginRequest.class));
    }

    @Test
    void login_WithInvalidCredentials_ShouldReturnUnauthorized() throws Exception {
        // Arrange
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        // Act & Assert
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validLoginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("用户名或密码错误"));

        verify(authService).login(any(LoginRequest.class));
    }

    @Test
    void checkUsername_WithAvailableUsername_ShouldReturnTrue() throws Exception {
        // Arrange
        when(authService.isUsernameAvailable("newuser")).thenReturn(true);

        // Act & Assert
        mockMvc.perform(get("/api/v1/auth/check-username")
                .param("username", "newuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("用户名可用"))
                .andExpect(jsonPath("$.data").value(true));

        verify(authService).isUsernameAvailable("newuser");
    }

    @Test
    void checkUsername_WithExistingUsername_ShouldReturnFalse() throws Exception {
        // Arrange
        when(authService.isUsernameAvailable("existinguser")).thenReturn(false);

        // Act & Assert
        mockMvc.perform(get("/api/v1/auth/check-username")
                .param("username", "existinguser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("用户名已存在"))
                .andExpect(jsonPath("$.data").value(false));

        verify(authService).isUsernameAvailable("existinguser");
    }

    @Test
    @WithMockUser
    void getCurrentUser_WithValidAuthentication_ShouldReturnUserInfo() throws Exception {
        // Arrange
        UserResponse userResponse = new UserResponse();
        userResponse.setUserId(1L);
        userResponse.setUsername("testuser");
        userResponse.setEmail("test@example.com");
        userResponse.setRole(UserRole.STUDENT);

        when(authService.getCurrentUser(anyLong())).thenReturn(userResponse);

        // Act & Assert
        mockMvc.perform(get("/api/v1/auth/me")
                .with(authentication(createMockAuthentication())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("testuser"))
                .andExpect(jsonPath("$.data.email").value("test@example.com"));

        verify(authService).getCurrentUser(1L);
    }

    @Test
    @WithMockUser
    void updateProfile_WithValidRequest_ShouldReturnUpdatedUser() throws Exception {
        // Arrange
        UserResponse userResponse = new UserResponse();
        userResponse.setUserId(1L);
        userResponse.setUsername("testuser");
        userResponse.setEmail("updated@example.com");

        when(authService.updateProfile(anyLong(), any(UpdateProfileRequest.class)))
                .thenReturn(userResponse);

        // Act & Assert
        mockMvc.perform(put("/api/v1/auth/profile")
                .with(authentication(createMockAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validUpdateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("个人资料更新成功"))
                .andExpect(jsonPath("$.data.email").value("updated@example.com"));

        verify(authService).updateProfile(eq(1L), any(UpdateProfileRequest.class));
    }

    @Test
    @WithMockUser
    void changePassword_WithValidRequest_ShouldReturnSuccess() throws Exception {
        // Arrange
        doNothing().when(authService).changePassword(anyLong(), any(ChangePasswordRequest.class));

        // Act & Assert
        mockMvc.perform(put("/api/v1/auth/password")
                .with(authentication(createMockAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validPasswordRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("密码修改成功"));

        verify(authService).changePassword(eq(1L), any(ChangePasswordRequest.class));
    }

    @Test
    @WithMockUser
    void changePassword_WithWrongCurrentPassword_ShouldReturnUnauthorized() throws Exception {
        // Arrange
        doThrow(new BadCredentialsException("Current password is incorrect"))
                .when(authService).changePassword(anyLong(), any(ChangePasswordRequest.class));

        // Act & Assert
        mockMvc.perform(put("/api/v1/auth/password")
                .with(authentication(createMockAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validPasswordRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("当前密码错误"));

        verify(authService).changePassword(eq(1L), any(ChangePasswordRequest.class));
    }

    @Test
    @WithMockUser
    void getOssUploadCredentials_WithConfiguredOss_ShouldReturnCredentials() throws Exception {
        // Arrange
        when(ossService.isConfigured()).thenReturn(true);
        
        OssUploadCredentialsResponse credentials = new OssUploadCredentialsResponse();
        credentials.setAccessKeyId("test-access-key");
        credentials.setAccessKeySecret("test-secret");
        credentials.setSecurityToken("test-token");
        credentials.setBucketName("test-bucket");
        credentials.setRegion("oss-cn-hangzhou");
        credentials.setExpiration(System.currentTimeMillis() + 3600000L);
        
        when(ossService.getUploadCredentials(anyLong())).thenReturn(credentials);

        // Act & Assert
        mockMvc.perform(get("/api/v1/auth/oss-credentials")
                .with(authentication(createMockAuthentication())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessKeyId").value("test-access-key"));

        verify(ossService).isConfigured();
        verify(ossService).getUploadCredentials(1L);
    }

    @Test
    @WithMockUser
    void getOssUploadCredentials_WithUnconfiguredOss_ShouldReturnServiceUnavailable() throws Exception {
        // Arrange
        when(ossService.isConfigured()).thenReturn(false);

        // Act & Assert
        mockMvc.perform(get("/api/v1/auth/oss-credentials")
                .with(authentication(createMockAuthentication())))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("文件上传服务暂不可用"));

        verify(ossService).isConfigured();
        verify(ossService, never()).getUploadCredentials(anyLong());
    }

    private org.springframework.security.core.Authentication createMockAuthentication() {
        UserPrincipal userPrincipal = new UserPrincipal(1L, "testuser", "STUDENT");
        return new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                userPrincipal, null, java.util.Collections.emptyList());
    }
}