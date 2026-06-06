package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/user"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	r.POST("/auth/login", h.Login)
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string            `json:"token"`
	User  user.UserResponse `json:"user"`
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	var u user.User
	if err := h.db.First(&u, "username = ?", req.Username).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Invalid credentials"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	if !u.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Invalid credentials"))
		return
	}

	token, err := GenerateToken(u)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to generate token"))
		return
	}

	c.JSON(http.StatusOK, api.Success(LoginResponse{
		Token: token,
		User:  u.ToResponse(),
	}))
}
