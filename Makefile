bin := s-word
download-server := ./scripts/download-server.sh
spy := ./scripts/spy.js

SERVER_VERSION := v4.20.16
SERVER_BUILD := desktop

clean-server:
	@rm -rf server.js

download-server: clean-server
	@VERSION=$(SERVER_VERSION) BUILD=$(SERVER_BUILD) $(download-server)

clean:
	@rm -rf bin/

$(bin): clean
	@mkdir -p bin/
	@go build -o bin/$(bin) main.go

run:
	@go run main.go

spy: download-server
	@node -r $(spy) server.js
