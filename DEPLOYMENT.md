# Oracle AI Invoice Extractor - OKE Deployment Guide

## Prerequisites

- [OCI CLI](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm) installed and configured
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- [Docker](https://www.docker.com/get-started) installed
- Access to an OKE cluster (or create one)
- Oracle Container Image Registry (OCIR) access

---

## Quick Start

### 1. Build Docker Image Locally

```bash
cd c:\NoSync\OCR-AI\oracle-genai-chat
docker build -t invoice-app:latest .
```

### 2. Test Locally with Docker

```bash
# Using docker-compose
docker-compose up

# Or run directly
docker run -p 3000:3000 --env-file .env invoice-app:latest
```

Access: http://localhost:3000

---

## Deploy to OKE

### Step 1: Setup OCIR Authentication

```bash
# Login to OCIR
docker login <region>.ocir.io
# Username: <tenancy-namespace>/<oci-username>
# Password: <auth-token>
```

### Step 2: Tag and Push Image

```bash
# Replace with your values
export REGION=us-chicago-1
export TENANCY_NAMESPACE=<your-tenancy-namespace>

# Tag image
docker tag invoice-app:latest ${REGION}.ocir.io/${TENANCY_NAMESPACE}/invoice-app:latest

# Push to OCIR
docker push ${REGION}.ocir.io/${TENANCY_NAMESPACE}/invoice-app:latest
```

### Step 3: Create Kubernetes Secret for OCIR

```bash
kubectl create secret docker-registry ocir-secret \
  --docker-server=${REGION}.ocir.io \
  --docker-username='<tenancy-namespace>/<oci-username>' \
  --docker-password='<auth-token>' \
  --docker-email='<your-email>'
```

### Step 4: Create Application Secrets

```bash
# Copy template
cp k8s/secret.yaml.template k8s/secret.yaml

# Edit k8s/secret.yaml with your actual values
# IMPORTANT: Do not commit this file!

# Encode wallet files
cd Wallet_ADBforAIlowerCost
cat cwallet.sso | base64 -w 0 > cwallet.b64
cat ewallet.p12 | base64 -w 0 > ewallet.b64
cat tnsnames.ora | base64 -w 0 > tnsnames.b64
cat sqlnet.ora | base64 -w 0 > sqlnet.b64

# Add these base64 values to k8s/secret.yaml
```

### Step 5: Update Deployment Image

Edit `k8s/deployment.yaml` and replace:
```yaml
image: <REGION>.ocir.io/<TENANCY_NAMESPACE>/invoice-app:latest
```

With your actual values:
```yaml
image: us-chicago-1.ocir.io/your-tenancy/invoice-app:latest
```

### Step 6: Deploy to Kubernetes

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Secrets
kubectl apply -f k8s/secret.yaml

# Apply Deployment
kubectl apply -f k8s/deployment.yaml

# Apply Service
kubectl apply -f k8s/service.yaml
```

### Step 7: Get Public IP

```bash
# Wait for Load Balancer to provision (2-5 minutes)
kubectl get svc invoice-app-service --watch

# Get external IP
kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Step 8: Access Application

```bash
# Get the external IP
export EXTERNAL_IP=$(kubectl get svc invoice-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Application URL: http://${EXTERNAL_IP}"
```

---

## Verify Deployment

```bash
# Check pods
kubectl get pods -l app=invoice-app

# Check logs
kubectl logs -l app=invoice-app --tail=50

# Check service
kubectl get svc invoice-app-service

# Test database connection
curl http://${EXTERNAL_IP}/test-db
```

---

## Update Deployment

```bash
# Build new image
docker build -t invoice-app:v2 .

# Tag and push
docker tag invoice-app:v2 ${REGION}.ocir.io/${TENANCY_NAMESPACE}/invoice-app:v2
docker push ${REGION}.ocir.io/${TENANCY_NAMESPACE}/invoice-app:v2

# Update deployment
kubectl set image deployment/invoice-app invoice-app=${REGION}.ocir.io/${TENANCY_NAMESPACE}/invoice-app:v2

# Or apply updated manifest
kubectl apply -f k8s/deployment.yaml
```

---

## Scaling

```bash
# Scale to 3 replicas
kubectl scale deployment invoice-app --replicas=3

# Auto-scaling (optional)
kubectl autoscale deployment invoice-app --min=2 --max=5 --cpu-percent=70
```

---

## Monitoring

```bash
# Watch pods
kubectl get pods -l app=invoice-app --watch

# View logs (all pods)
kubectl logs -l app=invoice-app --tail=100 -f

# View logs (specific pod)
kubectl logs <pod-name> --tail=100 -f

# Describe pod
kubectl describe pod <pod-name>

# Get events
kubectl get events --sort-by='.lastTimestamp'
```

---

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Common issues:
# - Image pull errors: Check OCIR credentials
# - CrashLoopBackOff: Check application logs
# - Secrets not found: Verify secret.yaml applied
```

### Database connection issues

```bash
# Verify secrets
kubectl get secret invoice-app-secrets -o yaml

# Check wallet files mounted
kubectl exec <pod-name> -- ls -la /app/wallet

# Test connection
kubectl exec <pod-name> -- node -e "console.log(process.env.DB_CONNECT_STRING)"
```

### Load Balancer not getting IP

```bash
# Check service
kubectl describe svc invoice-app-service

# Check OCI Load Balancer in console
# May take 2-5 minutes to provision
```

---

## Clean Up

```bash
# Delete all resources
kubectl delete -f k8s/

# Delete OCIR secret
kubectl delete secret ocir-secret

# Delete from OCIR (optional)
# Use OCI Console or CLI
```

---

## Security Best Practices

1. **Never commit** `k8s/secret.yaml` to Git
2. **Use OCI Vault** for production secrets
3. **Enable HTTPS** with cert-manager + Let's Encrypt
4. **Add authentication** for public access
5. **Use Network Policies** to restrict traffic
6. **Regular updates** of base images and dependencies

---

## Next Steps

- [ ] Configure custom domain name
- [ ] Setup HTTPS with SSL certificate
- [ ] Implement authentication (OAuth, API keys)
- [ ] Setup monitoring (Prometheus + Grafana)
- [ ] Configure CI/CD pipeline
- [ ] Implement backup strategy

---

## Support

For issues or questions:
- Check logs: `kubectl logs -l app=invoice-app`
- OKE Documentation: https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm
- OCI Support: https://support.oracle.com
