# OKE Deployment Commands - Singapore Region
## Configuration Summary

- **Tenancy Namespace**: `apacaseanset01`
- **Region**: `ap-singapore-1`
- **Cluster**: `ai-invoice`
- **Cluster OCID**: `ocid1.cluster.oc1.ap-singapore-1.aaaaaaaa3q5o5lbvypsdvmj4dncnil4bmbf6mzuqr4bk35uokcorpba6rlxa`
- **Image**: `ap-singapore-1.ocir.io/apacaseanset01/invoice-app:latest`

---

## Step 1: Create Auth Token

1. Go to https://cloud.oracle.com
2. Profile → User Settings → Auth Tokens
3. Generate Token (Description: "OKE Docker Registry")
4. **Copy the token immediately!**

---

## Step 2: Configure kubectl for OKE Cluster

```bash
# Set up kubectl to access your OKE cluster
oci ce cluster create-kubeconfig \
  --cluster-id ocid1.cluster.oc1.ap-singapore-1.aaaaaaaa3q5o5lbvypsdvmj4dncnil4bmbf6mzuqr4bk35uokcorpba6rlxa \
  --file $HOME/.kube/config \
  --region ap-singapore-1 \
  --token-version 2.0.0 \
  --kube-endpoint PUBLIC_ENDPOINT

# Verify connection
kubectl get nodes
```

---

## Step 3: Login to OCIR (Oracle Container Registry)

```bash
# Docker login to OCIR
docker login ap-singapore-1.ocir.io

# Username: apacaseanset01/jatupong.oboun@oracle.com
# Password: <YOUR_AUTH_TOKEN>
```

---

## Step 4: Build and Push Docker Image

```bash
cd c:\NoSync\OCR-AI\oracle-genai-chat

# Build image
docker build -t invoice-app:latest .

# Tag for OCIR
docker tag invoice-app:latest ap-singapore-1.ocir.io/apacaseanset01/invoice-app:latest

# Push to OCIR
docker push ap-singapore-1.ocir.io/apacaseanset01/invoice-app:latest
```

---

## Step 5: Create Kubernetes Secret for OCIR

```bash
# Create secret for pulling images from OCIR
kubectl create secret docker-registry ocir-secret \
  --docker-server=ap-singapore-1.ocir.io \
  --docker-username='apacaseanset01/jatupong.oboun@oracle.com' \
  --docker-password='<YOUR_AUTH_TOKEN>' \
  --docker-email='jatupong.oboun@oracle.com'
```

---

## Step 6: Create Application Secrets

```bash
# Copy template
cp k8s/secret.yaml.template k8s/secret.yaml

# Edit k8s/secret.yaml with your database credentials
# Use the values from your .env file

# Base64 encode wallet files
cd C:\Users\Mark\Downloads\Wallet_ADBforAIlowerCost

# For PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cwallet.sso")) | Out-File -Encoding ASCII cwallet.b64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ewallet.p12")) | Out-File -Encoding ASCII ewallet.b64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("tnsnames.ora")) | Out-File -Encoding ASCII tnsnames.b64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("sqlnet.ora")) | Out-File -Encoding ASCII sqlnet.b64

# Add these base64 values to k8s/secret.yaml
```

---

## Step 7: Deploy to Kubernetes

```bash
cd c:\NoSync\OCR-AI\oracle-genai-chat

# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Secrets
kubectl apply -f k8s/secret.yaml

# Apply Deployment
kubectl apply -f k8s/deployment.yaml

# Apply Service (Load Balancer)
kubectl apply -f k8s/service.yaml
```

---

## Step 8: Get Public URL

```bash
# Wait for Load Balancer (2-5 minutes)
kubectl get svc invoice-app-service --watch

# Get external IP
kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Example output: 123.45.67.89
# Your app will be at: http://123.45.67.89
```

---

## Step 9: Verify Deployment

```bash
# Check pods are running
kubectl get pods -l app=invoice-app

# Should show 2/2 pods running
# NAME                           READY   STATUS    RESTARTS   AGE
# invoice-app-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
# invoice-app-xxxxxxxxxx-xxxxx   1/1     Running   0          2m

# Check logs
kubectl logs -l app=invoice-app --tail=50

# Test database connection
curl http://<EXTERNAL_IP>/test-db
```

---

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Image pull errors
```bash
# Verify OCIR secret
kubectl get secret ocir-secret -o yaml

# Recreate if needed
kubectl delete secret ocir-secret
# Then run Step 5 again
```

### Database connection issues
```bash
# Check secrets
kubectl get secret invoice-app-secrets -o yaml

# Check wallet files
kubectl exec <pod-name> -- ls -la /app/wallet
```

---

## Quick Deploy Script (After Auth Token Created)

Save this as `deploy-oke.ps1`:

```powershell
# Set variables
$AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"
$REGION = "ap-singapore-1"
$TENANCY_NS = "apacaseanset01"
$EMAIL = "jatupong.oboun@oracle.com"

# Login to OCIR
echo $AUTH_TOKEN | docker login $REGION.ocir.io -u "$TENANCY_NS/$EMAIL" --password-stdin

# Build and push
docker build -t invoice-app:latest .
docker tag invoice-app:latest "$REGION.ocir.io/$TENANCY_NS/invoice-app:latest"
docker push "$REGION.ocir.io/$TENANCY_NS/invoice-app:latest"

# Create OCIR secret
kubectl create secret docker-registry ocir-secret `
  --docker-server="$REGION.ocir.io" `
  --docker-username="$TENANCY_NS/$EMAIL" `
  --docker-password="$AUTH_TOKEN" `
  --docker-email="$EMAIL"

# Deploy
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Wait and get IP
Write-Host "Waiting for Load Balancer..."
Start-Sleep -Seconds 30
kubectl get svc invoice-app-service
```

---

## Next Steps

1. ✅ Create Auth Token
2. ✅ Run Step 2 (configure kubectl)
3. ✅ Run Steps 3-8 (build, push, deploy)
4. ✅ Access your app via public URL!
