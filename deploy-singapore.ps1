# OKE Deployment Script for Singapore Region
# Run this after creating Auth Token

param(
    [Parameter(Mandatory=$true)]
    [string]$AuthToken
)

# Configuration
$REGION = "ap-singapore-1"
$TENANCY_NS = "apacaseanset01"
$EMAIL = "jatupong.oboun@oracle.com"
$IMAGE_NAME = "invoice-app"
$CLUSTER_OCID = "ocid1.cluster.oc1.ap-singapore-1.aaaaaaaa3q5o5lbvypsdvmj4dncnil4bmbf6mzuqr4bk35uokcorpba6rlxa"

Write-Host "=== OKE Deployment to Singapore Region ===" -ForegroundColor Green
Write-Host ""

# Step 1: Configure kubectl
Write-Host "[1/7] Configuring kubectl for OKE cluster..." -ForegroundColor Cyan
try {
    oci ce cluster create-kubeconfig `
        --cluster-id $CLUSTER_OCID `
        --file "$env:USERPROFILE\.kube\config" `
        --region $REGION `
        --token-version 2.0.0 `
        --kube-endpoint PUBLIC_ENDPOINT
    
    Write-Host "✓ kubectl configured" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to configure kubectl: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Login to OCIR
Write-Host "[2/7] Logging into OCIR..." -ForegroundColor Cyan
try {
    $AuthToken | docker login "$REGION.ocir.io" -u "$TENANCY_NS/$EMAIL" --password-stdin
    Write-Host "✓ Logged into OCIR" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to login to OCIR: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Build Docker image
Write-Host "[3/7] Building Docker image..." -ForegroundColor Cyan
try {
    docker build -t "${IMAGE_NAME}:latest" .
    Write-Host "✓ Docker image built" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to build image: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Tag and push to OCIR
Write-Host "[4/7] Pushing image to OCIR..." -ForegroundColor Cyan
try {
    $FULL_IMAGE = "$REGION.ocir.io/$TENANCY_NS/${IMAGE_NAME}:latest"
    docker tag "${IMAGE_NAME}:latest" $FULL_IMAGE
    docker push $FULL_IMAGE
    Write-Host "✓ Image pushed to OCIR" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to push image: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Create OCIR secret
Write-Host "[5/7] Creating Kubernetes OCIR secret..." -ForegroundColor Cyan
try {
    kubectl delete secret ocir-secret --ignore-not-found=true
    kubectl create secret docker-registry ocir-secret `
        --docker-server="$REGION.ocir.io" `
        --docker-username="$TENANCY_NS/$EMAIL" `
        --docker-password="$AuthToken" `
        --docker-email="$EMAIL"
    Write-Host "✓ OCIR secret created" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create OCIR secret: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Deploy to Kubernetes
Write-Host "[6/7] Deploying to Kubernetes..." -ForegroundColor Cyan
try {
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secret.yaml
    kubectl apply -f k8s/deployment.yaml
    kubectl apply -f k8s/service.yaml
    Write-Host "✓ Deployed to Kubernetes" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to deploy: $_" -ForegroundColor Red
    exit 1
}

# Step 7: Wait for Load Balancer
Write-Host "[7/7] Waiting for Load Balancer IP..." -ForegroundColor Cyan
Write-Host "This may take 2-5 minutes..." -ForegroundColor Yellow

$maxAttempts = 60
$attempt = 0
$externalIP = $null

while ($attempt -lt $maxAttempts) {
    $attempt++
    try {
        $externalIP = kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if ($externalIP) {
            break
        }
    } catch {
        # Continue waiting
    }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 5
}

Write-Host ""

if ($externalIP) {
    Write-Host "✓ Load Balancer ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Deployment Complete ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Application URL: http://$externalIP" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test database connection:" -ForegroundColor Yellow
    Write-Host "  curl http://$externalIP/test-db" -ForegroundColor White
    Write-Host ""
    Write-Host "View pods:" -ForegroundColor Yellow
    Write-Host "  kubectl get pods -l app=invoice-app" -ForegroundColor White
    Write-Host ""
    Write-Host "View logs:" -ForegroundColor Yellow
    Write-Host "  kubectl logs -l app=invoice-app --tail=50" -ForegroundColor White
} else {
    Write-Host "⚠ Timeout waiting for Load Balancer" -ForegroundColor Yellow
    Write-Host "Check status manually:" -ForegroundColor Yellow
    Write-Host "  kubectl get svc invoice-app-service" -ForegroundColor White
}
