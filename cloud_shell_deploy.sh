#!/bin/bash

# Configuration
REGION="ap-singapore-1"
CLUSTER_ID="ocid1.cluster.oc1.ap-singapore-1.aaaaaaaa3q5o5lbvypsdvmj4dncnil4bmbf6mzuqr4bk35uokcorpba6rlxa"
TENANCY_NS="apacaseanset01"
EMAIL="jatupong.oboun@oracle.com"
IMAGE_NAME="invoice-app"
AUTH_TOKEN="N7yn;w+dcJH]L(M0C(55"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Oracle AI Invoice App - Cloud Shell Deployment ===${NC}"

# 1. Access OKE Cluster
echo "Configuring kubectl..."
oci ce cluster create-kubeconfig \
    --cluster-id $CLUSTER_ID \
    --file $HOME/.kube/config \
    --region $REGION \
    --token-version 2.0.0 \
    --kube-endpoint PUBLIC_ENDPOINT

# 2. Login to Registry
echo "Logging into OCIR..."
echo $AUTH_TOKEN | docker login $REGION.ocir.io -u "$TENANCY_NS/$EMAIL" --password-stdin

# 3. Build Image
echo "Building Docker image..."
docker build -t $IMAGE_NAME:latest .

# 4. Push Image
echo "Pushing to OCIR..."
FULL_IMAGE="$REGION.ocir.io/$TENANCY_NS/$IMAGE_NAME:latest"
docker tag $IMAGE_NAME:latest $FULL_IMAGE
docker push $FULL_IMAGE

# 5. Create Secrets
echo "Creating Kubernetes secrets..."
kubectl delete secret ocir-secret --ignore-not-found=true
kubectl create secret docker-registry ocir-secret \
    --docker-server="$REGION.ocir.io" \
    --docker-username="$TENANCY_NS/$EMAIL" \
    --docker-password="$AUTH_TOKEN" \
    --docker-email="$EMAIL"

# Create dummy DB secret if not exists (User needs to fill real values later)
if ! kubectl get secret invoice-app-secrets >/dev/null 2>&1; then
    cp k8s/secret.yaml.template k8s/secret.yaml
    # Update with some values if available or leave as template
    # Here we apply the template to get things running, keys will need update
    kubectl apply -f k8s/secret.yaml.template
fi

# 6. Deploy
echo "Deploying to OKE..."
# Ensure configmap has right region
sed -i "s/us-chicago-1/$REGION/g" k8s/configmap.yaml
# Ensure deployment has right image
sed -i "s|image: .*|image: $FULL_IMAGE|g" k8s/deployment.yaml

kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 7. Wait for IP
echo "Waiting for Load Balancer IP (this takes 1-2 mins)..."
while [ -z "$IP" ]; do
    IP=$(kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    [ -z "$IP" ] && sleep 5 && echo -n "."
done

echo -e "\n${GREEN}Deployment Complete!${NC}"
echo -e "Access your app at: http://$IP"
