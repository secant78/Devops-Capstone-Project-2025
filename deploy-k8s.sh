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

# 9. Monitoring and Logging Setup with Helm
echo "Setting up Monitoring and Logging with Helm..."
# 1. Add the Helm Repositories
./helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
./helm repo add grafana https://grafana.github.io/helm-charts
./helm repo update

# 2. Install Metrics Stack (Prometheus + Grafana)
echo "Installing Prometheus & Grafana..."
./helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword="admin" \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# 3. Install Logs Stack (Loki + Promtail)
echo "Installing Loki (Logs)..."
./helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set promtail.enabled=true