package user

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(r *gin.RouterGroup) {
	users := r.Group("/users")
	{
		users.GET("", h.ListUsers)
		users.POST("", h.CreateUser)
		users.PUT("/:id/role", h.UpdateRole)
		users.DELETE("/:id", h.DeleteUser)
	}
}

func (h *Handler) ListUsers(c *gin.Context) {
	var users []User
	if err := h.db.Order("created_at desc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	responses := make([]UserResponse, len(users))
	for i, u := range users {
		responses[i] = u.ToResponse()
	}

	c.JSON(http.StatusOK, api.Success(responses))
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	role := Role(req.Role)
	if role != RoleAdmin && role != RoleMultimedia && role != RolePadus {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid role"))
		return
	}

	var existing User
	if err := h.db.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, api.Failed(http.StatusConflict, "Username already exists"))
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, "Failed to hash password"))
		return
	}

	user := User{
		Username:     req.Username,
		PasswordHash: hash,
		Role:         role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusCreated, api.Success(user.ToResponse()))
}

type UpdateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

func (h *Handler) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid user ID"))
		return
	}

	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, err.Error()))
		return
	}

	role := Role(req.Role)
	if role != RoleAdmin && role != RoleMultimedia && role != RolePadus {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid role"))
		return
	}

	var user User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "User not found"))
			return
		}
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	// Cannot change own role
	currentUserId, _ := c.Get("userId")
	if currentUserId.(uuid.UUID).String() == user.ID.String() {
		c.JSON(http.StatusForbidden, api.Failed(http.StatusForbidden, "Cannot change your own role"))
		return
	}

	user.Role = role
	if err := h.db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(user.ToResponse()))
}

func (h *Handler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, api.Failed(http.StatusBadRequest, "Invalid user ID"))
		return
	}

	var user User
	if err := h.db.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, api.Failed(http.StatusNotFound, "User not found"))
		return
	}

	currentUserId, _ := c.Get("userId")
	if currentUserId.(uuid.UUID).String() == user.ID.String() {
		c.JSON(http.StatusForbidden, api.Failed(http.StatusForbidden, "Cannot delete yourself"))
		return
	}

	if err := h.db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, api.Failed(http.StatusInternalServerError, err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.Success(map[string]bool{"deleted": true}))
}
