package edu.jimei.backend.util;

import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilsTest {

    private JwtUtils jwtUtils;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        
        // Set test values using reflection
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", "testSecretKeyThatIsLongEnoughForHMACAlgorithm");
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 86400000L); // 24 hours

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(UserRole.STUDENT);
    }

    @Test
    void generateJwtToken_WithValidUser_ShouldReturnValidToken() {
        // Act
        String token = jwtUtils.generateJwtToken(testUser);

        // Assert
        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.contains("."));
        assertTrue(jwtUtils.validateJwtToken(token));
    }

    @Test
    void getUserIdFromJwtToken_WithValidToken_ShouldReturnCorrectUserId() {
        // Arrange
        String token = jwtUtils.generateJwtToken(testUser);

        // Act
        Long userId = jwtUtils.getUserIdFromJwtToken(token);

        // Assert
        assertEquals(testUser.getId(), userId);
    }

    @Test
    void getUsernameFromJwtToken_WithValidToken_ShouldReturnCorrectUsername() {
        // Arrange
        String token = jwtUtils.generateJwtToken(testUser);

        // Act
        String username = jwtUtils.getUsernameFromJwtToken(token);

        // Assert
        assertEquals(testUser.getUsername(), username);
    }

    @Test
    void getRoleFromJwtToken_WithValidToken_ShouldReturnCorrectRole() {
        // Arrange
        String token = jwtUtils.generateJwtToken(testUser);

        // Act
        String role = jwtUtils.getRoleFromJwtToken(token);

        // Assert
        assertEquals(testUser.getRole().name(), role);
    }

    @Test
    void validateJwtToken_WithValidToken_ShouldReturnTrue() {
        // Arrange
        String token = jwtUtils.generateJwtToken(testUser);

        // Act
        boolean isValid = jwtUtils.validateJwtToken(token);

        // Assert
        assertTrue(isValid);
    }

    @Test
    void validateJwtToken_WithInvalidToken_ShouldReturnFalse() {
        // Act
        boolean isValid = jwtUtils.validateJwtToken("invalid.jwt.token");

        // Assert
        assertFalse(isValid);
    }

    @Test
    void validateJwtToken_WithMalformedToken_ShouldReturnFalse() {
        // Act
        boolean isValid = jwtUtils.validateJwtToken("malformed-token");

        // Assert
        assertFalse(isValid);
    }

    @Test
    void validateJwtToken_WithExpiredToken_ShouldReturnFalse() {
        // Arrange - Create JWT utils with very short expiration
        JwtUtils shortExpirationJwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(shortExpirationJwtUtils, "jwtSecret", "testSecretKeyThatIsLongEnoughForHMACAlgorithm");
        ReflectionTestUtils.setField(shortExpirationJwtUtils, "jwtExpirationMs", 1L); // 1 millisecond

        String token = shortExpirationJwtUtils.generateJwtToken(testUser);
        
        // Wait for token to expire
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Act
        boolean isValid = jwtUtils.validateJwtToken(token);

        // Assert
        assertFalse(isValid);
    }

    @Test
    void validateJwtToken_WithNullToken_ShouldReturnFalse() {
        // Act
        boolean isValid = jwtUtils.validateJwtToken(null);

        // Assert
        assertFalse(isValid);
    }

    @Test
    void validateJwtToken_WithEmptyToken_ShouldReturnFalse() {
        // Act
        boolean isValid = jwtUtils.validateJwtToken("");

        // Assert
        assertFalse(isValid);
    }

    @Test
    void isTokenExpiringSoon_WithFreshToken_ShouldReturnFalse() {
        // Arrange
        String token = jwtUtils.generateJwtToken(testUser);

        // Act
        boolean isExpiringSoon = jwtUtils.isTokenExpiringSoon(token);

        // Assert
        assertFalse(isExpiringSoon);
    }

    @Test
    void isTokenExpiringSoon_WithSoonToExpireToken_ShouldReturnTrue() {
        // Arrange - Create JWT utils with short expiration (30 minutes)
        JwtUtils shortExpirationJwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(shortExpirationJwtUtils, "jwtSecret", "testSecretKeyThatIsLongEnoughForHMACAlgorithm");
        ReflectionTestUtils.setField(shortExpirationJwtUtils, "jwtExpirationMs", 1800000L); // 30 minutes

        String token = shortExpirationJwtUtils.generateJwtToken(testUser);

        // Act
        boolean isExpiringSoon = jwtUtils.isTokenExpiringSoon(token);

        // Assert
        assertTrue(isExpiringSoon);
    }

    @Test
    void isTokenExpiringSoon_WithInvalidToken_ShouldReturnTrue() {
        // Act
        boolean isExpiringSoon = jwtUtils.isTokenExpiringSoon("invalid.token");

        // Assert
        assertTrue(isExpiringSoon);
    }

    @Test
    void getUserIdFromJwtToken_WithInvalidToken_ShouldThrowException() {
        // Act & Assert
        assertThrows(Exception.class, () -> {
            jwtUtils.getUserIdFromJwtToken("invalid.token");
        });
    }

    @Test
    void getUsernameFromJwtToken_WithInvalidToken_ShouldThrowException() {
        // Act & Assert
        assertThrows(Exception.class, () -> {
            jwtUtils.getUsernameFromJwtToken("invalid.token");
        });
    }

    @Test
    void getRoleFromJwtToken_WithInvalidToken_ShouldThrowException() {
        // Act & Assert
        assertThrows(Exception.class, () -> {
            jwtUtils.getRoleFromJwtToken("invalid.token");
        });
    }

    @Test
    void generateJwtToken_WithDifferentRoles_ShouldGenerateValidTokens() {
        // Test with INSTRUCTOR role
        testUser.setRole(UserRole.INSTRUCTOR);
        String instructorToken = jwtUtils.generateJwtToken(testUser);
        assertTrue(jwtUtils.validateJwtToken(instructorToken));
        assertEquals("INSTRUCTOR", jwtUtils.getRoleFromJwtToken(instructorToken));

        // Test with ADMIN role
        testUser.setRole(UserRole.ADMIN);
        String adminToken = jwtUtils.generateJwtToken(testUser);
        assertTrue(jwtUtils.validateJwtToken(adminToken));
        assertEquals("ADMIN", jwtUtils.getRoleFromJwtToken(adminToken));
    }
}