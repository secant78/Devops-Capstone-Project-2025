#!/bin/bash

# 1. Setup Namespace
echo "Creating Namespace..."
kubectl apply -f k8s/00-namespace.yaml

# 2. Configs & Secrets
echo "Applying Configs and Secrets..."
kubectl apply -f k8s/01-configmaps.yaml
kubectl apply -f k8s/02-secrets.yaml

# 3. Security & Quotas
echo "Applying Network Policies and Quotas..."
kubectl apply -f k8s/03-network-policy.yaml
kubectl apply -f k8s/04-resource-quota.yaml

# 5. Backend Services
echo "Deploying Backends..."
kubectl apply -f k8s/20-backend-a.yaml
kubectl apply -f k8s/21-backend-b.yaml


# 7. Autoscaling
echo "Applying HPA..."
kubectl apply -f k8s/40-hpa.yaml

# 8. Ingress
echo "Setting up Ingress..."
kubectl apply -f k8s/50-ingress.yaml

echo "Deployment Complete! Checking status..."
kubectl get all -n k8s-assessment