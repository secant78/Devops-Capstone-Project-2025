#!/bin/bash


echo "Building Backend A..."
docker build -t backend-a:latest ./backend-a

echo "Building Backend B..."
docker build -t backend-b:latest ./backend-b

echo "Verifying images..."
docker images | grep -E 'backend'