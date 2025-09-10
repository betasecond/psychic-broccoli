package edu.jimei.backend.service;

import edu.jimei.backend.dto.RegisterRequest;
import edu.jimei.backend.dto.RegisterResponse;
import edu.jimei.backend.entity.User;
import edu.jimei.backend.entity.UserRole;
import edu.jimei.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Autowired
    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
}