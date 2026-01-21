#!/bin/bash

# Oracle AI Invoice Extractor - OKE Deployment Script
# This script automates the deployment to Oracle Kubernetes Engine

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="${OCI_REGION:-us-chicago-1}"
TENANCY_NAMESPACE="${OCI_TENANCY_NAMESPACE}"
IMAGE_NAME="invoice-app"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || { print_error "Docker is not installed"; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { print_error "kubectl is not installed"; exit 1; }
    command -v oci >/dev/null 2>&1 || { print_error "OCI CLI is not installed"; exit 1; }
    
    print_info "All prerequisites met"
}

build_image() {
    print_info "Building Docker image..."
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
    print_info "Image built successfully"
}

tag_and_push() {
    if [ -z "$TENANCY_NAMESPACE" ]; then
        print_error "OCI_TENANCY_NAMESPACE environment variable not set"
        exit 1
    fi
    
    FULL_IMAGE_NAME="${REGION}.ocir.io/${TENANCY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    print_info "Tagging image as ${FULL_IMAGE_NAME}"
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE_NAME}
    
    print_info "Pushing to OCIR..."
    docker push ${FULL_IMAGE_NAME}
    
    print_info "Image pushed successfully"
}

update_deployment() {
    print_info "Updating deployment.yaml with image name..."
    
    FULL_IMAGE_NAME="${REGION}.ocir.io/${TENANCY_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    # Update deployment.yaml
    sed -i "s|image: .*ocir.io.*|image: ${FULL_IMAGE_NAME}|g" k8s/deployment.yaml
    
    print_info "Deployment manifest updated"
}

deploy_to_k8s() {
    print_info "Deploying to Kubernetes..."
    
    # Apply ConfigMap
    kubectl apply -f k8s/configmap.yaml
    
    # Check if secret exists
    if [ ! -f "k8s/secret.yaml" ]; then
        print_warn "k8s/secret.yaml not found. Please create it from secret.yaml.template"
        print_warn "Skipping secret deployment"
    else
        kubectl apply -f k8s/secret.yaml
    fi
    
    # Apply Deployment
    kubectl apply -f k8s/deployment.yaml
    
    # Apply Service
    kubectl apply -f k8s/service.yaml
    
    print_info "Deployment complete"
}

wait_for_loadbalancer() {
    print_info "Waiting for Load Balancer to get external IP..."
    
    for i in {1..60}; do
        EXTERNAL_IP=$(kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
        
        if [ -n "$EXTERNAL_IP" ]; then
            print_info "Load Balancer ready!"
            print_info "External IP: ${EXTERNAL_IP}"
            print_info "Application URL: http://${EXTERNAL_IP}"
            return 0
        fi
        
        echo -n "."
        sleep 5
    done
    
    print_warn "Timeout waiting for Load Balancer. Check manually with: kubectl get svc invoice-app-service"
}

show_status() {
    print_info "Deployment Status:"
    echo ""
    kubectl get pods -l app=invoice-app
    echo ""
    kubectl get svc invoice-app-service
}

# Main execution
main() {
    print_info "Starting OKE deployment..."
    
    check_prerequisites
    build_image
    tag_and_push
    update_deployment
    deploy_to_k8s
    wait_for_loadbalancer
    show_status
    
    print_info "Deployment script completed successfully!"
}

# Run main function
main "$@"
