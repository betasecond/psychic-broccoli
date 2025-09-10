package edu.jimei.backend.service;

import edu.jimei.backend.dto.LoginRequest;
import edu.jimei.backend.dto.LoginResponse;
import edu.jimei.backend.dto.RegisterRequest;
import edu.jimei.backend.dto.RegisterResponse;
import edu.jimei.backend.dto.UserResponse;
import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.exception.UserNotFoundException;
import edu.jimei.backend.repository.UserRepository;
import edu.jimei.backend.util.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    
    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }
    
    /**
     * 用户注册
     * @param request 注册请求
     * @return 注册响应
     * @throws IllegalArgumentException 当用户名已存在或密码不匹配时抛出
     */
    public RegisterResponse register(RegisterRequest request) {
        // 验证密码是否匹配
        if (!request.isPasswordMatching()) {
            throw new IllegalArgumentException("两次密码输入不一致");
        }
        
        // 检查用户名是否已存在
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("用户名已存在");
        }
        
        // 检查邮箱是否已存在（如果提供了邮箱）
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("邮箱已被使用");
            }
        }
        
        // 创建新用户
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        
        // 设置用户角色，如果未指定则默认为学生
        UserRole role = request.getRole() != null ? request.getRole() : UserRole.STUDENT;
        user.setRole(role);
        
        // 保存用户到数据库
        User savedUser = userRepository.save(user);
        
        // 返回注册响应
        return new RegisterResponse(savedUser.getId(), savedUser.getUsername());
    }
    
    /**
     * 用户登录
     * @param request 登录请求
     * @return 登录响应，包含JWT令牌和用户信息
     * @throws BadCredentialsException 当用户名或密码错误时抛出
     */
    public LoginResponse login(LoginRequest request) {
        // 根据用户名查找用户
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("用户名或密码错误"));
        
        // 验证密码
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("用户名或密码错误");
        }
        
        // 生成JWT令牌
        String accessToken = jwtUtils.generateJwtToken(user);
        
        // 创建用户响应对象
        UserResponse userResponse = UserResponse.fromUser(user);
        
        // 返回登录响应
        return LoginResponse.create(accessToken, userResponse);
    }
    
    /**
     * 检查用户名是否可用
     * @param username 用户名
     * @return true如果用户名可用，false如果已存在
     */
    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }
    
    /**
     * 检查邮箱是否可用
     * @param email 邮箱
     * @return true如果邮箱可用，false如果已存在
     */
    public boolean isEmailAvailable(String email) {
        if (email == null || email.trim().isEmpty()) {
            return true;
        }
        return !userRepository.existsByEmail(email);
    }
    
    /**
     * 根据用户ID获取当前用户信息
     * @param userId 用户ID
     * @return 用户响应对象，不包含敏感信息
     * @throws UserNotFoundException 当用户不存在时抛出
     */
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        
        return UserResponse.fromUser(user);
    }
}