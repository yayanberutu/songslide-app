.PHONY: help check-structure

help:
	@printf '%s\n' 'SongSlide monorepo helper targets:'
	@printf '%s\n' '  make check-structure  Verify the MVP scaffold directories and root config files exist'

check-structure:
	@test -d frontend
	@test -d backend
	@test -d export-service
	@test -d ocr-service
	@test -d docker
	@test -f .editorconfig
	@test -f .env.example
	@test -f .gitignore
	@test -f frontend/README.md
	@test -f backend/README.md
	@test -f export-service/README.md
	@test -f ocr-service/README.md
	@test -f docker/README.md
	@printf '%s\n' 'Monorepo scaffold structure is present.'
