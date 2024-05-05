IMAGE_NAME=retyper-app
CONTAINER_NAME=retyper-app-container
PORT=8082

run-dev:
	node server.js

build:
	docker build -t $(IMAGE_NAME) .

run:  ## Run in container
	docker run --name $(CONTAINER_NAME) -p $(PORT):$(PORT) -d $(IMAGE_NAME)

stop:
	docker stop $(CONTAINER_NAME)
	docker rm $(CONTAINER_NAME)

