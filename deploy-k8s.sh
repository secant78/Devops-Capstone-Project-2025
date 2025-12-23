#!/bin/bash

# --- 1. Setup Namespace ---
echo "Creating Namespace..."
kubectl apply -f k8s/00-namespace.yaml

# --- 2. Configs & Secrets ---
echo "Applying Configs and Secrets..."
kubectl apply -f k8s/01-configmaps.yaml
kubectl apply -f k8s/02-secrets.yaml

# --- 3. Security & Quotas ---
echo "Applying Network Policies and Quotas..."
kubectl apply -f k8s/03-network-policy.yaml
kubectl apply -f k8s/04-resource-quota.yaml

# --- 5. Backend Services ---
echo "Deploying Backends..."
kubectl apply -f k8s/20-backend-a.yaml
kubectl apply -f k8s/21-backend-b.yaml

# --- 7. Autoscaling ---
echo "Applying HPA..."
kubectl apply -f k8s/40-hpa.yaml

# --- 8. Ingress ---
echo "Setting up Ingress..."
kubectl apply -f k8s/50-ingress.yaml

echo "Application Deployment Complete! Checking App status..."
kubectl get all -n sean-k8s-assessment

# --- 9. Monitoring and Logging Setup with Helm ---
echo "----------------------------------------------------"
echo "Setting up Monitoring (Prometheus/Grafana) & Logging (Loki)..."
echo "----------------------------------------------------"

# A. Add/Update Helm Repositories
./helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
./helm repo add grafana https://grafana.github.io/helm-charts
./helm repo update

# B. Install/Upgrade Metrics Stack (Prometheus + Grafana)
# - Uses 'upgrade --install' to prevent errors if run multiple times
# - Disables persistence (disk storage) to fix CrashLoopBackOff on Azure
echo "Deploying/Updating Prometheus & Grafana..."
./helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword="admin" \
  --set grafana.persistence.enabled=false \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false

# C. Install/Upgrade Logs Stack (Loki + Promtail)
# - 'isDefault=false' prevents it from conflicting with Prometheus as the default datasource
echo "Deploying/Updating Loki (Logs)..."
./helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set promtail.enabled=true \
  --set loki.isDefault=false

echo "----------------------------------------------------"
echo "Monitoring Deployment Triggered!" 
echo "Wait approx 60 seconds for pods to start, then check with:"
echo "kubectl get pods -n monitoring"