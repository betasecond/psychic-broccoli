package edu.jimei.backend.controller;

import edu.jimei.backend.dto.ApiResponse;
import edu.jimei.backend.dto.RegisterRequest;
import edu.jimei.backend.dto.RegisterResponse;
import edu.jimei.backend.service.AuthService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private final AuthService authService;
    
    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }
    
    /**
     * 用户注册端点
     * @param request 注册请求
     * @param bindingResult 验证结果
     * @return 注册响应
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            BindingResult bindingResult) {
        
        logger.info("收到用户注册请求: {}", request.getUsername());
        
        try {
            // 检查请求参数验证结果
            if (bindingResult.hasErrors()) {
                String errorMessage = bindingResult.getFieldErrors().stream()
                        .map(error -> error.getDefaultMessage())
                        .findFirst()
                        .orElse("请求参数验证失败");
                
                logger.warn("注册请求参数验证失败: {}", errorMessage);
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(400, errorMessage));
            }
            
            // 调用服务层进行注册
            RegisterResponse response = authService.register(request);
            
            logger.info("用户注册成功: {}", response.getUsername());
            return ResponseEntity.ok(ApiResponse.success("注册成功", response));
            
        } catch (IllegalArgumentException e) {
            logger.warn("用户注册失败: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, e.getMessage()));
            
        } catch (Exception e) {
            logger.error("用户注册时发生未知错误", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "服务器内部错误，请稍后重试"));
        }
    }
    
    /**
     * 检查用户名是否可用
     * @param username 用户名
     * @return 可用性检查结果
     */
    @GetMapping("/check-username")
    public ResponseEntity<ApiResponse<Boolean>> checkUsername(@RequestParam String username) {
        try {
            boolean available = authService.isUsernameAvailable(username);
            String message = available ? "用户名可用" : "用户名已存在";
            
            return ResponseEntity.ok(ApiResponse.success(message, available));
            
        } catch (Exception e) {
            logger.error("检查用户名可用性时发生错误", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "服务器内部错误"));
        }
    }
    
    /**
     * 检查邮箱是否可用
     * @param email 邮箱
     * @return 可用性检查结果
     */
    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<Boolean>> checkEmail(@RequestParam String email) {
        try {
            boolean available = authService.isEmailAvailable(email);
            String message = available ? "邮箱可用" : "邮箱已被使用";
            
            return ResponseEntity.ok(ApiResponse.success(message, available));
            
        } catch (Exception e) {
            logger.error("检查邮箱可用性时发生错误", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "服务器内部错误"));
        }
    }
}