package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/yayanberutu/songslide/backend-go/internal/config"
)

var safeSegmentPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

type FileSystemStorage struct {
	root string
}

func NewFileSystemStorage() (*FileSystemStorage, error) {
	rootPath, err := filepath.Abs(config.AppConfig.StorageRoot)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(rootPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage root: %w", err)
	}
	return &FileSystemStorage{root: rootPath}, nil
}

func (s *FileSystemStorage) Save(storageKey string, content []byte) error {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	return os.WriteFile(path, content, 0644)
}

func (s *FileSystemStorage) SaveReader(storageKey string, r io.Reader) error {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, r)
	return err
}

func (s *FileSystemStorage) Read(storageKey string) ([]byte, error) {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(path)
}

func (s *FileSystemStorage) ReadStream(storageKey string) (io.ReadCloser, error) {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

func (s *FileSystemStorage) Delete(storageKey string) error {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (s *FileSystemStorage) Exists(storageKey string) bool {
	path, err := s.resolveStorageKey(storageKey)
	if err != nil {
		return false
	}
	_, err = os.Stat(path)
	return err == nil
}

func (s *FileSystemStorage) ResolveStorageKeyForDownload(storageKey string) (string, error) {
	return s.resolveStorageKey(storageKey)
}

func (s *FileSystemStorage) resolveStorageKey(storageKey string) (string, error) {
	if storageKey == "" {
		return "", fmt.Errorf("storageKey is required")
	}
	if len(storageKey) > 512 {
		return "", fmt.Errorf("storageKey must be 512 characters or fewer")
	}
	if strings.HasPrefix(storageKey, "/") || strings.HasPrefix(storageKey, "\\") {
		return "", fmt.Errorf("storageKey must be relative")
	}
	if strings.Contains(storageKey, "\\") || strings.Contains(storageKey, ":") {
		return "", fmt.Errorf("storageKey contains unsupported path characters")
	}

	segments := strings.Split(storageKey, "/")
	if len(segments) < 3 {
		return "", fmt.Errorf("storageKey must include namespace, owner, and file name segments")
	}

	for _, seg := range segments {
		if !safeSegmentPattern.MatchString(seg) {
			return "", fmt.Errorf("storageKey contains unsupported path segments: %s", seg)
		}
	}

	ns := segments[0]
	fileName := segments[len(segments)-1]
	extIdx := strings.LastIndex(fileName, ".")
	if extIdx <= 0 || extIdx == len(fileName)-1 {
		return "", fmt.Errorf("storageKey file name must include a supported extension")
	}
	ext := strings.ToLower(fileName[extIdx+1:])

	supported := false
	if ns == "source-images" {
		switch ext {
		case "jpg", "jpeg", "png", "webp":
			supported = true
		}
	} else if ns == "exports" {
		switch ext {
		case "png", "pptx", "zip":
			supported = true
		}
	}

	if !supported {
		return "", fmt.Errorf("storageKey namespace or file extension is not supported")
	}

	path := filepath.Join(s.root, filepath.Join(segments...))
	return path, nil
}
