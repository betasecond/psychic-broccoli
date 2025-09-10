package edu.jimei.backend.security;

import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.repository.UserRepository;
import edu.jimei.backend.util.JwtUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private User testUser;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(UserRole.STUDENT);
    }

    @Test
    void doFilterInternal_WithValidJwtToken_ShouldSetAuthentication() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String authHeader = "Bearer " + token;
        
        when(request.getHeader("Authorization")).thenReturn(authHeader);
        when(jwtUtils.validateJwtToken(token)).thenReturn(true);
        when(jwtUtils.getUserIdFromJwtToken(token)).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals("testuser", SecurityContextHolder.getContext().getAuthentication().getName());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils).validateJwtToken(token);
        verify(jwtUtils).getUserIdFromJwtToken(token);
        verify(userRepository).findById(1L);
    }

    @Test
    void doFilterInternal_WithInvalidJwtToken_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        String token = "invalid.jwt.token";
        String authHeader = "Bearer " + token;
        
        when(request.getHeader("Authorization")).thenReturn(authHeader);
        when(jwtUtils.validateJwtToken(token)).thenReturn(false);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils).validateJwtToken(token);
        verify(jwtUtils, never()).getUserIdFromJwtToken(anyString());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void doFilterInternal_WithNoAuthorizationHeader_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn(null);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils, never()).validateJwtToken(anyString());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void doFilterInternal_WithInvalidAuthorizationHeader_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("Invalid header");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils, never()).validateJwtToken(anyString());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void doFilterInternal_WithNonBearerToken_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        when(request.getHeader("Authorization")).thenReturn("Basic dGVzdDp0ZXN0");

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils, never()).validateJwtToken(anyString());
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void doFilterInternal_WithValidTokenButUserNotFound_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String authHeader = "Bearer " + token;
        
        when(request.getHeader("Authorization")).thenReturn(authHeader);
        when(jwtUtils.validateJwtToken(token)).thenReturn(true);
        when(jwtUtils.getUserIdFromJwtToken(token)).thenReturn(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils).validateJwtToken(token);
        verify(jwtUtils).getUserIdFromJwtToken(token);
        verify(userRepository).findById(1L);
    }

    @Test
    void doFilterInternal_WithExceptionDuringTokenValidation_ShouldNotSetAuthentication() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String authHeader = "Bearer " + token;
        
        when(request.getHeader("Authorization")).thenReturn(authHeader);
        when(jwtUtils.validateJwtToken(token)).thenThrow(new RuntimeException("JWT validation error"));

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertNull(SecurityContextHolder.getContext().getAuthentication());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils).validateJwtToken(token);
        verify(userRepository, never()).findById(anyLong());
    }

    @Test
    void doFilterInternal_WithExistingAuthentication_ShouldNotOverrideAuthentication() throws ServletException, IOException {
        // Arrange
        String token = "valid.jwt.token";
        String authHeader = "Bearer " + token;
        
        // Set existing authentication
        UserPrincipal existingPrincipal = new UserPrincipal(2L, "existinguser", "INSTRUCTOR");
        SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        existingPrincipal, null, java.util.Collections.emptyList()));
        
        when(request.getHeader("Authorization")).thenReturn(authHeader);

        // Act
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Assert
        assertEquals("existinguser", SecurityContextHolder.getContext().getAuthentication().getName());
        
        verify(filterChain).doFilter(request, response);
        verify(jwtUtils, never()).validateJwtToken(anyString());
        verify(userRepository, never()).findById(anyLong());
    }
}