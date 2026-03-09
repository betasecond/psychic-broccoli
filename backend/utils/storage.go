package utils

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

// Storage 定义统一的文件存储接口
type Storage interface {
	// Save 保存文件，返回可供前端直接访问的 URL
	Save(ctx context.Context, subdir, filename string, r io.Reader) (url string, err error)
	// Delete 删除指定 URL 对应的文件
	Delete(ctx context.Context, url string) error
	// Exists 检查文件是否存在
	Exists(ctx context.Context, url string) bool
}

var defaultStorage Storage

// InitStorage 根据环境变量初始化存储后端（默认使用本地存储）
func InitStorage() {
	backend := os.Getenv("STORAGE_BACKEND")
	if backend == "s3" {
		defaultStorage = newS3StorageFromEnv()
	} else {
		defaultStorage = &LocalStorage{BaseDir: "."}
	}
}

// GetStorage 返回当前存储实例
func GetStorage() Storage {
	if defaultStorage == nil {
		defaultStorage = &LocalStorage{BaseDir: "."}
	}
	return defaultStorage
}

// ---- Local Storage ----

// LocalStorage 将文件保存到本地 public/ 目录
type LocalStorage struct {
	BaseDir string // 通常为 "."，即可执行文件所在目录
}

func (s *LocalStorage) Save(_ context.Context, subdir, originalName string, r io.Reader) (string, error) {
	dir := filepath.Join(s.BaseDir, "public", subdir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("创建目录失败: %w", err)
	}

	timestamp := time.Now().Format("20060102150405")
	safeFilename := fmt.Sprintf("%s_%s", timestamp, filepath.Base(originalName))
	filePath := filepath.Join(dir, safeFilename)

	dst, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("创建文件失败: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, r); err != nil {
		return "", fmt.Errorf("写入文件失败: %w", err)
	}

	return fmt.Sprintf("/public/%s/%s", subdir, safeFilename), nil
}

func (s *LocalStorage) Delete(_ context.Context, url string) error {
	filePath := filepath.Join(s.BaseDir, url)
	if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("删除文件失败: %w", err)
	}
	return nil
}

func (s *LocalStorage) Exists(_ context.Context, url string) bool {
	filePath := filepath.Join(s.BaseDir, url)
	_, err := os.Stat(filePath)
	return err == nil
}

// ---- S3 Storage stub ----
// S3Storage 使用兼容 S3/MinIO 的对象存储
// 当 STORAGE_BACKEND=s3 时激活；需配置 S3_ENDPOINT / S3_BUCKET / S3_ACCESS_KEY / S3_SECRET_KEY
type S3Storage struct {
	endpoint  string
	bucket    string
	accessKey string
	secretKey string
	useSSL    bool
}

func newS3StorageFromEnv() Storage {
	useSSL := os.Getenv("S3_USE_SSL") == "true"
	return &S3Storage{
		endpoint:  os.Getenv("S3_ENDPOINT"),
		bucket:    os.Getenv("S3_BUCKET"),
		accessKey: os.Getenv("S3_ACCESS_KEY"),
		secretKey: os.Getenv("S3_SECRET_KEY"),
		useSSL:    useSSL,
	}
}

// Save 上传文件到 S3/MinIO（当前为占位实现，接入 minio-go SDK 后替换）
func (s *S3Storage) Save(ctx context.Context, subdir, originalName string, r io.Reader) (string, error) {
	// TODO: 接入 minio-go SDK 实现真正的 S3 上传
	// 示例：
	// client, _ := minio.New(s.endpoint, &minio.Options{...})
	// objectName := fmt.Sprintf("%s/%s_%s", subdir, time.Now().Format("20060102150405"), originalName)
	// client.PutObject(ctx, s.bucket, objectName, r, -1, minio.PutObjectOptions{})
	// return fmt.Sprintf("https://%s/%s/%s", s.endpoint, s.bucket, objectName), nil
	return "", fmt.Errorf("S3 存储后端尚未集成 minio-go SDK，请设置 STORAGE_BACKEND=local 或完成 SDK 集成")
}

func (s *S3Storage) Delete(_ context.Context, url string) error {
	// TODO: 接入 minio-go SDK
	return fmt.Errorf("S3 存储后端尚未集成")
}

func (s *S3Storage) Exists(_ context.Context, url string) bool {
	return false
}
