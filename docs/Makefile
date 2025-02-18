SHELL=/bin/bash

# Basic info
PRODUCT?= $(shell basename "$(shell cd .. && pwd)")
BRANCH?= main
VERSION?= $(shell [[ "$(BRANCH)" == "main" ]] && echo "main" || echo "$(BRANCH)")
CURRENT_VERSION?= $(VERSION)
VERSIONS?= "main"
OUTPUT?= "/tmp/docs"
THEME_FOLDER?= "themes/book"
THEME_REPO?= "https://github.com/infinilabs/docs-theme.git"
THEME_BRANCH?= "main"

.PHONY: docs-build

default: docs-build

docs-init:
	@if [ ! -d $(THEME_FOLDER) ]; then echo "theme does not exist";(git clone -b $(THEME_BRANCH) $(THEME_REPO) $(THEME_FOLDER) ) fi

docs-env:
	@echo "Debugging Variables:"
	@echo "PRODUCT: $(PRODUCT)"
	@echo "BRANCH: $(BRANCH)"
	@echo "VERSION: $(VERSION)"
	@echo "CURRENT_VERSION: $(CURRENT_VERSION)"
	@echo "VERSIONS: $(VERSIONS)"
	@echo "OUTPUT: $(OUTPUT)"

docs-config: docs-init
	cp config.yaml config.bak
	# Detect OS and apply the appropriate sed command
	@if [ "$$(uname)" = "Darwin" ]; then \
		echo "Running on macOS"; \
		sed -i '' "s/BRANCH/$(VERSION)/g" config.yaml; \
	else \
		echo "Running on Linux"; \
		sed -i 's/BRANCH/$(VERSION)/g' config.yaml; \
	fi

docs-build: docs-config
	hugo --minify --theme book --destination="$(OUTPUT)/$(PRODUCT)/$(VERSION)" \
        --baseURL="/$(PRODUCT)/$(VERSION)"
	@$(MAKE) docs-restore-generated-file

docs-serve: docs-config
	hugo serve
	@$(MAKE) docs-restore-generated-file

docs-place-redirect:
	echo "<!DOCTYPE html> <html> <head> <meta http-equiv=refresh content=0;url=main /> </head> <body> <p><a href=main />REDIRECT TO THE LATEST_VERSION</a>.</p> </body> </html>" > $(OUTPUT)/$(PRODUCT)/index.html

docs-restore-generated-file:
	mv config.bak config.yaml
