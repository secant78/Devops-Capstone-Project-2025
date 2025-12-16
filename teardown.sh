#!/bin/bash

echo "Deleting Namespace (this removes all resources inside it)..."
kubectl delete namespace k8s-assessment

echo "Teardown complete."