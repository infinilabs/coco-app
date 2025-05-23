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
	RUST_BACKTRACE=1 pnpm tauri dev

# Build desktop application for MacOS
build-mac-app: 
	@echo "Building the desktop application..."
	pnpm tauri build --bundles app

# Build DMG package for MacOS
build-mac-dmg: 
	@echo "Building the desktop dmg package..."
	pnpm tauri build --bundles dmg

# Build universal DMG package for MacOS
build-mac-universal-dmg:
	@echo "Building the desktop dmg package..."
	pnpm tauri build --target universal-apple-darwin --bundles dmg
        #pnpm tauri build --target x86_64-apple-darwin --bundles dmg

# Build nsis package for Windows
build-win-nsis: install-dependencies
	@echo "Building the desktop nsis package..."
	pnpm tauri build --bundles nsis

# Build msi package for Windows
build-win-msi: install-dependencies
	@echo "Building the desktop msi package..."
	pnpm tauri build --bundles msi

# Build deb package for Linux
build-linux-deb: install-dependencies
	@echo "Building the desktop deb package..."
	pnpm tauri build --bundles deb

# Build rpm package for Linux
build-linux-rpm: install-dependencies
	@echo "Building the desktop rpm package..."
	pnpm tauri build --bundles rpm

# Build appimage package for Linux
build-linux-appimage: install-dependencies
	@echo "Building the desktop appimage package..."
	pnpm tauri build --bundles appimage

# Combined: Install dependencies, start dev, and build app
dev-build: install-dependencies start-dev
	@echo "Development and build process completed."

# Clean up node_modules and rebuild
clean-rebuild:
	@echo "Cleaning up and rebuilding..."
	rm -rf node_modules
	$(MAKE) dev-build

add-dep-pizza-engine:
	cd src-tauri && cargo add --git ssh://git@github.com/infinilabs/pizza.git pizza-engine --features query_string_parser,persistence

dev-build-with-pizza: add-dep-pizza-engine
	@echo "Starting desktop development with Pizza Engine pulled in..."
	RUST_BACKTRACE=1 pnpm tauri dev --features use_pizza_engine