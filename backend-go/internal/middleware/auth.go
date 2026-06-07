package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yayanberutu/songslide/backend-go/internal/api"
	"github.com/yayanberutu/songslide/backend-go/internal/auth"
	"github.com/yayanberutu/songslide/backend-go/internal/user"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Missing Authorization header"))
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Invalid Authorization header format"))
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Invalid or expired token"))
			c.Abort()
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)

		c.Next()
	}
}

func RequireRole(roles ...user.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoleStr, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Unauthorized"))
			c.Abort()
			return
		}

		role := user.Role(userRoleStr.(string))
		hasRole := false
		for _, r := range roles {
			if role == r {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, api.Failed(http.StatusForbidden, "Forbidden: insufficient permissions"))
			c.Abort()
			return
		}

		c.Next()
	}
}

func ReadOnlyForMultimedia() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoleStr, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, api.Failed(http.StatusUnauthorized, "Unauthorized"))
			c.Abort()
			return
		}

		role := user.Role(userRoleStr.(string))
		method := c.Request.Method

		// If admin, allow all
		if role == user.RoleAdmin {
			c.Next()
			return
		}

		// If multimedia, only allow GET, HEAD, OPTIONS
		if role == user.RoleMultimedia {
			if method == http.MethodGet || method == http.MethodHead || method == http.MethodOptions {
				c.Next()
				return
			}

			// Explicitly allow exports POST endpoints for multimedia
			path := c.Request.URL.Path
			if strings.Contains(path, "exports") {
				c.Next()
				return
			}

			c.JSON(http.StatusForbidden, api.Failed(http.StatusForbidden, "Forbidden: multimedia users can only read data and export"))
			c.Abort()
			return
		}

		c.JSON(http.StatusForbidden, api.Failed(http.StatusForbidden, "Forbidden"))
		c.Abort()
	}
}
