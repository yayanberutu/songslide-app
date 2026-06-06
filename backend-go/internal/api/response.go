package api

type ApiStatus string

const (
	StatusSuccess ApiStatus = "SUCCESS"
	StatusFailed  ApiStatus = "FAILED"
)

type ApiResponse[T any] struct {
	Data         T         `json:"data"`
	Status       ApiStatus `json:"status"`
	Code         int       `json:"code"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
}

func Success[T any](data T) ApiResponse[T] {
	return ApiResponse[T]{
		Data:   data,
		Status: StatusSuccess,
		Code:   200,
	}
}

func Failed(code int, errorMessage string) ApiResponse[any] {
	return ApiResponse[any]{
		Data:         nil,
		Status:       StatusFailed,
		Code:         code,
		ErrorMessage: errorMessage,
	}
}

type PaginatedData[T any] struct {
	Items      []T   `json:"items"`
	TotalCount int64 `json:"totalCount"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
}
