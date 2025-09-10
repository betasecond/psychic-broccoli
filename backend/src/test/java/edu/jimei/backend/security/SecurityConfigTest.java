package edu.jimei.backend.security;

import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.repository.UserRepository;
import edu.jimei.backend.util.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureWebMvc
@TestPropertySource(properties = {
    "jwt.secret=testSecretKeyThatIsLongEnoughForHMACAlgorithm",
    "jwt.expiration=86400000"
})
class SecurityConfigTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @MockBean
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private User testUser;
    private String validJwtToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(UserRole.STUDENT);

        validJwtToken = jwtUtils.generateJwtToken(testUser);
    }

    @Test
    void publicEndpoints_ShouldBeAccessibleWithoutAuthentication() throws Exception {
        // Test login endpoint
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"test\",\"password\":\"test\"}"))
                .andExpect(status().isBadRequest()); // Bad request due to invalid credentials, but not unauthorized

        // Test register endpoint
        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"test\",\"password\":\"test\"}"))
                .andExpect(status().isBadRequest()); // Bad request due to validation, but not unauthorized

        // Test username check endpoint
        mockMvc.perform(get("/api/v1/auth/check-username")
                .param("username", "testuser"))
                .andExpect(status().isOk());

        // Test email check endpoint
        mockMvc.perform(get("/api/v1/auth/check-email")
                .param("email", "test@example.com"))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpoints_ShouldRequireAuthentication() throws Exception {
        // Test protected endpoint without token
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());

        // Test profile update without token
        mockMvc.perform(post("/api/v1/auth/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());

        // Test password change without token
        mockMvc.perform(post("/api/v1/auth/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoints_WithValidJwtToken_ShouldAllowAccess() throws Exception {
        // Mock user repository to return test user
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Test protected endpoint with valid token
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + validJwtToken))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpoints_WithInvalidJwtToken_ShouldDenyAccess() throws Exception {
        // Test protected endpoint with invalid token
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoints_WithExpiredJwtToken_ShouldDenyAccess() throws Exception {
        // Create a JWT utils with very short expiration for testing
        JwtUtils shortExpirationJwtUtils = new JwtUtils();
        org.springframework.test.util.ReflectionTestUtils.setField(
                shortExpirationJwtUtils, "jwtSecret", "testSecretKeyThatIsLongEnoughForHMACAlgorithm");
        org.springframework.test.util.ReflectionTestUtils.setField(
                shortExpirationJwtUtils, "jwtExpirationMs", 1L); // 1 millisecond

        String expiredToken = shortExpirationJwtUtils.generateJwtToken(testUser);
        
        // Wait for token to expire
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Test protected endpoint with expired token
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void corsConfiguration_ShouldAllowCrossOriginRequests() throws Exception {
        // Test CORS preflight request
        mockMvc.perform(get("/api/v1/auth/check-username")
                .header("Origin", "http://localhost:3000")
                .param("username", "testuser"))
                .andExpect(status().isOk());
    }

    @Test
    void roleBasedAccess_ShouldWorkCorrectly() throws Exception {
        // Create users with different roles
        User studentUser = new User();
        studentUser.setId(1L);
        studentUser.setUsername("student");
        studentUser.setRole(UserRole.STUDENT);

        User instructorUser = new User();
        instructorUser.setId(2L);
        instructorUser.setUsername("instructor");
        instructorUser.setRole(UserRole.INSTRUCTOR);

        User adminUser = new User();
        adminUser.setId(3L);
        adminUser.setUsername("admin");
        adminUser.setRole(UserRole.ADMIN);

        String studentToken = jwtUtils.generateJwtToken(studentUser);
        String instructorToken = jwtUtils.generateJwtToken(instructorUser);
        String adminToken = jwtUtils.generateJwtToken(adminUser);

        // Mock repository responses
        when(userRepository.findById(1L)).thenReturn(Optional.of(studentUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(instructorUser));
        when(userRepository.findById(3L)).thenReturn(Optional.of(adminUser));

        // All roles should be able to access basic auth endpoints
        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + instructorToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/auth/me")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}