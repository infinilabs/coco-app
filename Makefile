# Variables
NODE_VERSION_MIN = 18.12


.PHONY: dev-build 

default: dev-build

# Ensure Node.js version meets the minimum requirement
check-node-version:
	@echo "Checking Node.js version..."
	@node_version=$$(node -v | sed 's/v//'); \
	if [ "$$node_version" \< "$(NODE_VERSION_MIN)" ]; then \
		echo "Error: Node.js version must be at least $(NODE_VERSION_MIN)"; \
		exit 1; \
	fi
	@echo "Node.js version is adequate."

# Install dependencies
install-dependencies: check-node-version
	@echo "Installing dependencies..."
	npm install -g pnpm && pnpm install

# Start desktop development
start-dev: install-dependencies
	@echo "Starting desktop development..."
	pnpm tauri dev

# Build desktop application for MacOS
build-mac-app: install-dependencies
	@echo "Building the desktop application..."
	pnpm tauri build --bundles app

# Build DMG package for MacOS
build-mac-dmg: install-dependencies
	@echo "Building the desktop dmg package..."
	pnpm tauri build --bundles dmg

# Combined: Install dependencies, start dev, and build app
dev-build: install-dependencies start-dev build-app
	@echo "Development and build process completed."

# Clean up node_modules and rebuild
clean-rebuild:
	@echo "Cleaning up and rebuilding..."
	rm -rf node_modules
	$(MAKE) dev-build
