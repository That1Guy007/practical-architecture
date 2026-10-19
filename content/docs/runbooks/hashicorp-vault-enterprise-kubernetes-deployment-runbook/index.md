---
title: "HashiCorp Vault Enterprise on Kubernetes: Deployment and Troubleshooting Runbook"
description: "A deployment and troubleshooting runbook for a production-oriented HashiCorp Vault Enterprise cluster on Kubernetes or OpenShift."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "Runbook"
topics:
  - "Identity and Security"
  - "Kubernetes and Containers"
  - "DevOps and Infrastructure"
technologies:
  - "HashiCorp Vault Enterprise"
  - "Kubernetes"
  - "OpenShift"
  - "Helm"
tags:
  - "vault"
  - "kubernetes"
  - "runbook"
  - "raft"
status: "Published"
version: "1.0"
related_docs:
  - "/docs/runbooks/hashicorp-vault-secrets-operator-jwt-runbook"
carbon:
  eyebrow: "Runbook · Vault Enterprise · Kubernetes and OpenShift"
  lead: "A step-by-step path from architecture decisions to a hardened, accepted production cluster, with a layered troubleshooting method for when a deployment does not behave."
  meta:
    - label: "Platform"
      value: "Kubernetes, OpenShift"
    - label: "Storage"
      value: "Integrated Storage (Raft)"
    - label: "Topology"
      value: "3-node HA"
  callout:
    kind: "warning"
    title: "Read this first"
    text: "Do not treat a proof-of-concept configuration as a production standard. One unseal key with a threshold of one, `-tls-skip-verify`, self-signed certificates, broad RBAC, and manually handled root tokens are lab-only patterns."
  button:
    label: "Start with the architecture"
    href: "#architecture-at-a-glance"
---

## Deployment

### Architecture at a Glance

A typical production-oriented Kubernetes deployment consists of:

```flow
{
  "title": "Vault on Kubernetes architecture",
  "desc": "Clients reach a Kubernetes Service, Route or load balancer over HTTPS on port 8200. It fronts three Vault pods: vault-0 active, vault-1 and vault-2 standby. The pods are Raft voters linked on port 8201 and all write to persistent storage.",
  "caption": "Figure 1. Reference topology. Drag to pan, Ctrl or ⌘ + scroll to zoom, or use the buttons.",
  "width": 1040,
  "height": 500,
  "legend": {
    "client": "Client requests · HTTPS :8200",
    "raft": "Raft cluster traffic · :8201",
    "store": "Writes to persistent storage"
  },
  "nodes": [
    {
      "id": "client",
      "x": 20,
      "y": 210,
      "title": "Client / User",
      "sub": "CLI, UI, API, applications",
      "tone": "white",
      "desc": "CLI, UI, API and applications reach Vault over HTTPS on TCP/8200."
    },
    {
      "id": "svc",
      "x": 290,
      "y": 210,
      "title": "K8s Service / Route / LB",
      "sub": "Approved access path",
      "tone": "blue",
      "desc": "the approved access path in front of the Vault pods."
    },
    {
      "id": "v0",
      "x": 590,
      "y": 50,
      "title": "vault-0",
      "sub": "active · Raft voter",
      "tone": "green",
      "mono": true,
      "desc": "active node and Raft voter. Cluster traffic with the other nodes runs on TCP/8201."
    },
    {
      "id": "v1",
      "x": 590,
      "y": 210,
      "title": "vault-1",
      "sub": "standby · Raft voter",
      "tone": "gray",
      "mono": true,
      "desc": "standby node and Raft voter. Cluster traffic with the other nodes runs on TCP/8201."
    },
    {
      "id": "v2",
      "x": 590,
      "y": 370,
      "title": "vault-2",
      "sub": "standby · Raft voter",
      "tone": "gray",
      "mono": true,
      "desc": "standby node and Raft voter. Cluster traffic with the other nodes runs on TCP/8201."
    },
    {
      "id": "st",
      "x": 860,
      "y": 210,
      "w": 160,
      "title": "Persistent Storage",
      "sub": "Integrated Storage",
      "tone": "teal",
      "desc": "persistent volumes hold the Integrated Storage (Raft) data for each pod."
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "svc",
      "kind": "client",
      "label": "HTTPS :8200",
      "dots": 4,
      "dur": 2.4
    },
    {"from": "svc", "to": "v0", "kind": "client"},
    {"from": "svc", "to": "v1", "kind": "client"},
    {"from": "svc", "to": "v2", "kind": "client"},
    {
      "from": "v0",
      "to": "v1",
      "kind": "raft",
      "bidirectional": true,
      "label": ":8201 Raft",
      "dur": 2.2
    },
    {
      "from": "v1",
      "to": "v2",
      "kind": "raft",
      "bidirectional": true,
      "label": ":8201 Raft",
      "dur": 2.2
    },
    {"from": "v0", "to": "st", "kind": "store", "dots": 2},
    {"from": "v1", "to": "st", "kind": "store", "dots": 2},
    {"from": "v2", "to": "st", "kind": "store", "dots": 2}
  ]
}
```

The implementation should normally include:

- A supported Kubernetes or OpenShift cluster.
- Three or more Vault server pods for HA.
- Persistent volumes for Integrated Storage.
- TLS for all API and cluster traffic.
- A Vault Enterprise license.
- A documented seal strategy:
  - Shamir for development or controlled environments.
  - Auto-unseal for most production implementations.
- A load balancer, ingress, route, or other approved access path.
- Monitoring, log forwarding, audit devices, backup, and recovery procedures.

---

### Important Production Decisions

Before deploying Vault, make the following decisions with the customer.

| Decision            | Questions to Resolve                                                                    | Required? |
| ------------------- | --------------------------------------------------------------------------------------- | --------- |
| Kubernetes platform | EKS, AKS, GKE, OCP, or other supported Kubernetes?                                      | True      |
| Namespace/project   | What namespace or OpenShift project will host Vault?                                    | True      |
| DNS                 | What internal and external DNS names will clients use?                                  | True      |
| TLS                 | Customer PKI, enterprise CA, cert-manager, OpenShift service CA, or temporary lab CA?   | True      |
| Seal strategy       | Shamir or auto-unseal using AWS KMS, Azure Key Vault, GCP KMS, HSM, or Transit?         | False     |
| Storage             | StorageClass, capacity, IOPS, encryption, retention, backup strategy?                   | False     |
| Network exposure    | Internal load balancer, ingress, OpenShift Route, private endpoint, service mesh?       | False     |
| Authentication      | OIDC, LDAP, SAML, Kubernetes auth, AppRole, cloud auth, etc.?                           | False     |
| Secrets consumers   | Vault Agent, Vault Secrets Operator, CSI provider, direct API, Terraform, applications? | False     |
| Monitoring          | Prometheus, Splunk, Datadog, Dynatrace, cloud-native monitoring, etc.?                  | False     |
| Audit               | File audit device, socket/syslog pipeline, centralized SIEM?                            | False     |
| DR / replication    | Performance Replication, DR Replication, or single cluster initially?                   | False     |
| FIPS                | Is a FIPS-enabled Vault Enterprise image or platform configuration required?            | True      |

> **Do not treat a proof-of-concept configuration as a production standard.** In particular, one unseal key with a threshold of one, `-tls-skip-verify`, self-signed certificates, broad RBAC, and manually handled root tokens should remain lab-only patterns.

---

### Prerequisites

#### Required Tools

Install and validate:

```bash
kubectl version --client
helm version
openssl version
vault version
```

For OpenShift:

```bash
oc version
```

Add the HashiCorp Helm repository:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
helm search repo hashicorp/vault
```

For customer deployments, strongly consider pinning the Helm chart and Vault Enterprise image versions instead of relying on `latest`.

Example:

```bash
export VAULT_NAMESPACE="vault"
export VAULT_RELEASE="vault"
export VAULT_CHART_VERSION="<validated-chart-version>"
export VAULT_IMAGE_TAG="<validated-vault-ent-version>"
```

#### Kubernetes Prerequisites

Validate:

```bash
kubectl get nodes -o wide
kubectl get storageclass
kubectl auth can-i create statefulsets -n "$VAULT_NAMESPACE"
kubectl auth can-i create secrets -n "$VAULT_NAMESPACE"
kubectl auth can-i create services -n "$VAULT_NAMESPACE"
```

Confirm that the cluster has:

- Sufficient CPU and memory.
- A suitable persistent StorageClass.
- DNS functioning between pods.
- Network paths required for:
  - Vault client traffic on TCP/8200.
  - Vault cluster traffic on TCP/8201.
  - Auto-unseal services if used.
  - External identity, PKI, logging, and monitoring integrations.

---

### Create the Namespace or OpenShift Project

Kubernetes:

```bash
kubectl create namespace vault
```

OpenShift:

```bash
oc new-project vault
```

Set the namespace for the current context if desired:

```bash
kubectl config set-context --current --namespace=vault
```

> All namespaced resources in this runbook should be created in the same namespace as the Vault Helm release unless there is a deliberate design reason otherwise.

---

### TLS Certificate Design

#### Certificate Requirements

Vault's certificate must contain every DNS name clients or Vault cluster members use to reach the service.

Common SANs include:

```text
vault
vault.vault
vault.vault.svc
vault.vault.svc.cluster.local

vault-active
vault-active.vault
vault-active.vault.svc
vault-active.vault.svc.cluster.local

vault-0.vault-internal
vault-1.vault-internal
vault-2.vault-internal

vault-0.vault-internal.vault.svc
vault-1.vault-internal.vault.svc
vault-2.vault-internal.vault.svc

<vault-external-fqdn>
```

If the certificate does not match the address used during Raft join, Vault may fail with an error similar to:

```text
x509: certificate is valid for <name-A>, not <name-B>
```

This is one of the most common bootstrap problems in TLS-enabled Raft deployments.

#### Lab Certificate Example

For customer production deployments, use the customer's enterprise PKI whenever possible.

The following example is suitable for controlled development or demonstration environments.

```bash
mkdir -p certs
```

Create a CA private key:

```bash
openssl genrsa \
  -out ./certs/vault-ca-key.pem \
  3072
```

Create the CA certificate:

```bash
openssl req \
  -new \
  -x509 \
  -key ./certs/vault-ca-key.pem \
  -out ./certs/vault-ca.crt \
  -days 365 \
  -subj "/C=US/O=Example Organization/OU=Platform Engineering/CN=Example Vault CA"
```

Create the Vault server private key:

```bash
openssl genrsa \
  -out ./certs/vault-server-key.pem \
  3072
```

Create the certificate signing request:

```bash
openssl req \
  -new \
  -key ./certs/vault-server-key.pem \
  -out ./certs/vault-server.csr \
  -subj "/C=US/O=Example Organization/OU=Platform Engineering/CN=vault" \
  -addext "subjectAltName=DNS:vault,DNS:vault.vault,DNS:vault.vault.svc,DNS:vault-active,DNS:vault-active.vault.svc,DNS:vault-0.vault-internal,DNS:vault-1.vault-internal,DNS:vault-2.vault-internal"
```

Sign the certificate:

```bash
openssl x509 \
  -req \
  -in ./certs/vault-server.csr \
  -CA ./certs/vault-ca.crt \
  -CAkey ./certs/vault-ca-key.pem \
  -CAcreateserial \
  -out ./certs/vault-server.crt \
  -days 365 \
  -copy_extensions copyall
```

Validate the certificate:

```bash
openssl x509 \
  -in ./certs/vault-server.crt \
  -noout \
  -subject \
  -issuer \
  -dates \
  -ext subjectAltName
```

#### Do Not Put the Private Key in a ConfigMap

A Kubernetes ConfigMap is not intended for private key material.

Use:

- A Kubernetes **Secret** for the Vault server certificate and private key.
- A ConfigMap or Secret for the CA certificate, depending on customer policy.

Create the TLS secret:

```bash
kubectl -n vault create secret generic vault-ha-tls \
  --from-file=tls.crt=./certs/vault-server.crt \
  --from-file=tls.key=./certs/vault-server-key.pem
```

Create the CA ConfigMap:

```bash
kubectl -n vault create configmap vault-ca \
  --from-file=ca.crt=./certs/vault-ca.crt
```

Validate:

```bash
kubectl -n vault get secret vault-ha-tls
kubectl -n vault get configmap vault-ca
```

---

### Create the Vault Enterprise License Secret

Prefer creating the license from a file rather than leaving the license string in shell history.

```bash
kubectl -n vault create secret generic vault-enterprise-license \
  --from-file=license=./vault.hclic
```

If a literal is required:

```bash
kubectl -n vault create secret generic vault-enterprise-license \
  --from-literal=license='<vault-enterprise-license>'
```

Validate only the resource metadata:

```bash
kubectl -n vault get secret vault-enterprise-license
```

Do not print the secret value into logs or troubleshooting transcripts.

---

### Helm Values

The following is a reusable baseline. Adapt it to the customer's platform, storage, security, and operational requirements.

Create `helm-values.yaml`:

```yaml
global:
  tlsDisable: false

  # Set true when deploying to Red Hat OpenShift.
  openshift: false

injector:
  enabled: false

server:
  logLevel: "info"

  image:
    repository: "docker.io/hashicorp/vault-enterprise"
    tag: "<validated-vault-enterprise-version>"
    pullPolicy: IfNotPresent

  enterpriseLicense:
    secretName: "vault-enterprise-license"
    secretKey: "license"

  # Controlled StatefulSet upgrade behavior is useful for Vault.
  updateStrategyType: "OnDelete"

  # The active service gives clients a stable service pointing at the active node.
  activeService: true

  # Set explicit production scheduling controls rather than leaving affinity blank.
  # Example options include podAntiAffinity, topologySpreadConstraints, and
  # dedicated node selectors/tolerations.
  affinity: ""

  extraEnvironmentVars:
    VAULT_CACERT: /vault/userconfig/vault-ca/ca.crt

  ha:
    enabled: true
    replicas: 3

    raft:
      enabled: true
      setNodeId: true

      config: |
        ui = true

        # Vault data is protected by Kubernetes/container isolation.
        # mlock typically requires additional container capabilities and is
        # commonly disabled in Kubernetes deployments.
        disable_mlock = true

        listener "tcp" {
          address         = "[::]:8200"
          cluster_address = "[::]:8201"

          tls_disable   = 0
          tls_cert_file = "/vault/userconfig/vault-ha-tls/tls.crt"
          tls_key_file  = "/vault/userconfig/vault-ha-tls/tls.key"
        }

        storage "raft" {
          path = "/vault/data"
        }

        service_registration "kubernetes" {}

  volumes:
    - name: vault-ha-tls
      secret:
        secretName: vault-ha-tls

    - name: vault-ca
      configMap:
        name: vault-ca

  volumeMounts:
    - name: vault-ha-tls
      mountPath: /vault/userconfig/vault-ha-tls
      readOnly: true

    - name: vault-ca
      mountPath: /vault/userconfig/vault-ca
      readOnly: true

  dataStorage:
    enabled: true
    size: 10Gi
    # storageClass: "<customer-storage-class>"
```

---
### OpenShift-Specific Settings

For OpenShift set:

```yaml
global:
  tlsDisable: false
  openshift: true
```

HashiCorp's Helm chart adjusts security context and OpenShift-specific resources when `global.openshift` is enabled.

Install into a dedicated project rather than `default`.

If a pod is rejected by admission or SCC enforcement, inspect:

```bash
oc -n vault describe pod vault-0
oc -n vault get events --sort-by=.lastTimestamp
```

Do not immediately solve SCC failures by granting broad or privileged SCC access. Determine which exact capability, UID/GID constraint, volume ownership rule, or filesystem permission is failing first.

---

### Render and Validate Before Installation

Always render the deployment before applying it to a customer cluster.

```bash
helm template vault hashicorp/vault \
  --namespace vault \
  --values helm-values.yaml \
  > rendered-vault.yaml
```

Or:

```bash
helm upgrade --install vault hashicorp/vault \
  --namespace vault \
  --values helm-values.yaml \
  --dry-run
```

Review:

- Image and image tag.
- PVC configuration.
- TLS volume mounts.
- Enterprise license reference.
- Service names.
- StatefulSet update strategy.
- Pod security context.
- Resource requests/limits.
- Scheduling and anti-affinity.
- OpenShift-specific settings when applicable.

---

### Install Vault Enterprise

```bash
helm upgrade --install vault hashicorp/vault \
  --namespace vault \
  --values helm-values.yaml
```

If pinning the chart:

```bash
helm upgrade --install vault hashicorp/vault \
  --namespace vault \
  --version "$VAULT_CHART_VERSION" \
  --values helm-values.yaml
```

Watch the pods:

```bash
kubectl -n vault get pods -w
```

Before initialization, the pods may show a non-ready state because Vault is sealed. That is expected.

Inspect the release:

```bash
helm -n vault status vault
helm -n vault get values vault
helm -n vault get manifest vault > vault-installed-manifest.yaml
```

---

### Initialize Vault

#### Lab Initialization

For a disposable demonstration only:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault operator init \
  -key-shares=1 \
  -key-threshold=1
```

#### Production Initialization

For production, use the customer's approved key custody design.

Example Shamir pattern:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault operator init \
  -key-shares=5 \
  -key-threshold=3
```

Consider PGP-encrypting the unseal shares and initial root token.

For most enterprise deployments, auto-unseal should be evaluated instead of relying on manual Shamir unseal during every Vault restart.

#### Secure the Initialization Output

Immediately:

- Distribute key shares according to customer policy.
- Store them in separate secured locations.
- Protect the initial root token.
- Do not paste unseal keys or root tokens into tickets, Slack, Teams, Git repositories, shell scripts, or implementation documents.
- Revoke the initial root token after administrative bootstrap is complete and normal administrator access is established.

---

### Unseal the Initial Node

If using Shamir:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault operator unseal
```

Repeat until the threshold is met.

Check:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault status
```

Expected state after initialization and unseal:

```text
Initialized    true
Sealed         false
HA Enabled     true
HA Mode        active
```

---

### Form the Raft Cluster

With Integrated Storage used as the Vault storage backend, each additional node should join the initialized Raft cluster and then be unsealed.

#### Join `vault-1`

```bash
kubectl -n vault exec -ti vault-1 -- \
  vault operator raft join \
  -leader-ca-cert=@/vault/userconfig/vault-ca/ca.crt \
  https://vault-0.vault-internal:8200
```

Then unseal it:

```bash
kubectl -n vault exec -ti vault-1 -- \
  vault operator unseal
```

#### Join `vault-2`

```bash
kubectl -n vault exec -ti vault-2 -- \
  vault operator raft join \
  -leader-ca-cert=@/vault/userconfig/vault-ca/ca.crt \
  https://vault-0.vault-internal:8200
```

Then unseal it:

```bash
kubectl -n vault exec -ti vault-2 -- \
  vault operator unseal
```

> Avoid `-tls-skip-verify` in the normal deployment path. If the command only succeeds when TLS verification is disabled, treat that as evidence of an unresolved CA, SAN, DNS, or certificate-chain problem.

#### Verify Peers

Login temporarily on the active node:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault login
```

List Raft peers:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault operator raft list-peers
```

Expected pattern:

```text
Node       Address                         State       Voter
----       -------                         -----       -----
vault-0    vault-0.vault-internal:8201     leader      true
vault-1    vault-1.vault-internal:8201     follower    true
vault-2    vault-2.vault-internal:8201     follower    true
```

---

### Optional: Use `retry_join` to Reduce Manual Bootstrap Work

Manual `raft join` is useful because it makes the bootstrap process explicit and easy to debug.

For repeatable automation, consider adding `retry_join` stanzas:

```hcl
storage "raft" {
  path = "/vault/data"

  retry_join {
    leader_api_addr         = "https://vault-0.vault-internal:8200"
    leader_ca_cert_file     = "/vault/userconfig/vault-ca/ca.crt"
    leader_tls_servername   = "vault-0.vault-internal"
  }

  retry_join {
    leader_api_addr         = "https://vault-1.vault-internal:8200"
    leader_ca_cert_file     = "/vault/userconfig/vault-ca/ca.crt"
    leader_tls_servername   = "vault-1.vault-internal"
  }

  retry_join {
    leader_api_addr         = "https://vault-2.vault-internal:8200"
    leader_ca_cert_file     = "/vault/userconfig/vault-ca/ca.crt"
    leader_tls_servername   = "vault-2.vault-internal"
  }
}
```

This does not remove the need to initialize the cluster or provide the required unseal mechanism, but it can simplify peer discovery and cluster reformation.

---

### Validate Services and Health

List services:

```bash
kubectl -n vault get svc
```

Inspect the active service:

```bash
kubectl -n vault describe svc vault-active
```

Test the health API from the pod:

```bash
kubectl -n vault exec vault-0 -- \
  sh -c 'curl --cacert /vault/userconfig/vault-ca/ca.crt https://127.0.0.1:8200/v1/sys/health'
```

If the certificate does not contain `127.0.0.1`, use a certificate-valid DNS name instead:

```bash
kubectl -n vault exec vault-0 -- \
  sh -c 'curl --cacert /vault/userconfig/vault-ca/ca.crt https://vault-0.vault-internal:8200/v1/sys/health'
```

For a load balancer or readiness check that needs standby nodes to be considered healthy, use the appropriate Vault health parameters, for example:

```text
/v1/sys/health?standbyok=true&perfstandbyok=true
```

Select the exact behavior based on whether the endpoint should target only the active node or any healthy member.

---

## Troubleshooting Guide

### Start With a Layered Troubleshooting Method

When a deployment fails, avoid changing multiple things at once.

Use this order:

```text
1. Kubernetes scheduling
2. Container startup
3. Mounted files and permissions
4. Vault configuration
5. DNS
6. Network connectivity
7. TLS
8. Vault initialization/seal state
9. Raft membership
10. External integrations
```

This keeps infrastructure, Kubernetes, TLS, and Vault application failures from being mixed together.

---

### Pod Is Pending

Check:

```bash
kubectl -n vault get pods
kubectl -n vault describe pod vault-0
kubectl -n vault get events --sort-by=.lastTimestamp
```

Common causes:

- Insufficient CPU or memory.
- PVC is Pending.
- StorageClass does not exist.
- Node selector or affinity cannot be satisfied.
- Taint requires a toleration.
- OpenShift SCC admission failure.

Check PVCs:

```bash
kubectl -n vault get pvc
kubectl -n vault describe pvc data-vault-0
```

Check node capacity:

```bash
kubectl describe nodes
```

---

### Container Starts and Immediately Fails

Inspect logs:

```bash
kubectl -n vault logs vault-0
kubectl -n vault logs vault-0 --previous
kubectl -n vault logs --follow vault-0
```

Inspect the running configuration resources:

```bash
helm -n vault get values vault
helm -n vault get manifest vault
kubectl -n vault get statefulset vault -o yaml
```

Typical causes:

- Invalid HCL.
- TLS files mounted at the wrong paths.
- Certificate or key file missing.
- Private key permission problem.
- Invalid advertised address.
- Storage directory permission issue.
- License secret absent or wrong key name.
- Unsupported Vault image/chart combination.

---

### Validate Mounted Certificates and Files

Open a shell:

```bash
kubectl -n vault exec -ti vault-0 -- sh
```

Then:

```bash
ls -la /vault/userconfig/vault-ha-tls
ls -la /vault/userconfig/vault-ca
```

Inspect the certificate without displaying the private key:

```bash
openssl x509 \
  -in /vault/userconfig/vault-ha-tls/tls.crt \
  -noout \
  -subject \
  -issuer \
  -dates \
  -ext subjectAltName
```

Validate that the certificate and key match:

```bash
openssl x509 \
  -noout \
  -modulus \
  -in /vault/userconfig/vault-ha-tls/tls.crt \
  | openssl sha256
```

```bash
openssl rsa \
  -noout \
  -modulus \
  -in /vault/userconfig/vault-ha-tls/tls.key \
  | openssl sha256
```

The hashes should match.

---

### DNS Troubleshooting

Run a temporary debugging pod:

```bash
kubectl -n vault run dns-test \
  --rm -it \
  --image=busybox:1.36 \
  -- sh
```

Inside:

```sh
nslookup vault
nslookup vault-active
nslookup vault-0.vault-internal
nslookup vault-1.vault-internal
nslookup vault-2.vault-internal
```

If DNS does not resolve:

```bash
kubectl -n vault get svc
kubectl -n vault get endpoints
kubectl -n vault get endpointslices
```

Also check cluster DNS health outside Vault.

---

### Network Troubleshooting

Start a curl pod:

```bash
kubectl -n vault run curl-test \
  --rm -it \
  --image=curlimages/curl \
  -- sh
```

Test the service:

```sh
curl -vk https://vault-0.vault-internal:8200/v1/sys/health
```

Use `-k` only as a diagnostic step.

Interpretation:

- **Connection refused**: address/port is not listening, service is targeting the wrong endpoint, or Vault has not started.
- **Timeout**: network policy, firewall, route, or connectivity problem.
- **TLS certificate error**: CA trust or SAN mismatch.
- **HTTP 429**: Vault may be a standby.
- **HTTP 472/473**: DR/performance standby behavior may be involved.
- **HTTP 501/503**: sealed or uninitialized states are likely.

Inspect listeners in the pod:

```bash
kubectl -n vault exec vault-0 -- \
  sh -c 'ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true'
```

---

### TLS Troubleshooting

#### View the Presented Certificate

From a workstation with network access:

```bash
openssl s_client \
  -connect <vault-fqdn>:8200 \
  -servername <vault-fqdn> \
  -showcerts
```

Inside the cluster:

```bash
kubectl -n vault run tls-test \
  --rm -it \
  --image=alpine/openssl \
  -- sh
```

Then:

```sh
openssl s_client \
  -connect vault-0.vault-internal:8200 \
  -servername vault-0.vault-internal \
  -showcerts
```

Check:

- Is the expected certificate presented?
- Does the SAN include the exact hostname?
- Is the issuer expected?
- Has the certificate expired?
- Is the complete chain available?

#### `x509: certificate is valid for ..., not ...`

Cause:

The hostname in the URL does not appear in the certificate SAN.

Fix:

- Reissue the certificate with the missing SAN, or
- Use a DNS name that is already covered by the certificate.

Do not make `-tls-skip-verify` the permanent fix.

#### `certificate signed by unknown authority`

Cause:

The Vault client or joining pod does not trust the issuing CA.

Validate:

```bash
kubectl -n vault exec vault-1 -- \
  cat /vault/userconfig/vault-ca/ca.crt
```

Ensure `VAULT_CACERT` points to the correct CA file.

---

### Raft Join Troubleshooting

Check Vault state on each pod:

```bash
for pod in vault-0 vault-1 vault-2; do
  echo "===== $pod ====="
  kubectl -n vault exec "$pod" -- vault status || true
done
```

List peers from the active node:

```bash
kubectl -n vault exec vault-0 -- \
  vault operator raft list-peers
```

Common problems:

#### Wrong join order

When Raft is used as the primary `storage` backend:

```text
Initialize vault-0
Unseal vault-0
Join vault-1
Unseal vault-1
Join vault-2
Unseal vault-2
```

#### Node was initialized independently

A follower must not be independently initialized as a separate Vault cluster.

If a disposable lab node was accidentally initialized independently, delete its data/PVC only after confirming there is no needed data and the customer approves destructive recovery.

#### Duplicate node IDs

Ensure every node has a unique Raft node ID. Do not hardcode the same `node_id` for all replicas.

#### Join works only with `-tls-skip-verify`

This almost always means TLS trust or hostname validation is incomplete. Fix the certificate or CA path.

---

### Vault CLI Fails but Server Looks Healthy

Check environment:

```bash
env | grep '^VAULT_'
```

Typical values:

```bash
export VAULT_ADDR="https://<vault-fqdn>:8200"
export VAULT_CACERT="/path/to/vault-ca.crt"
```

Do not leave:

```bash
VAULT_SKIP_VERIFY=true
```

configured in production shells.

Check server:

```bash
vault status
```

If the CLI cannot connect but curl can, compare:

- Hostname.
- Port.
- Proxy settings.
- CA path.
- `VAULT_NAMESPACE` if using Vault namespaces.
- Client certificate settings if mutual TLS is intentionally configured.

---

### Kubernetes Readiness Probe Problems

A Vault node can be healthy but not active.

If the readiness probe treats standby nodes as unhealthy, a pod may remain unready even though it is functioning as a legitimate Vault standby.

For HA deployments, consider a health path such as:

```text
/v1/sys/health?standbyok=true&perfstandbyok=true
```

Use the exact parameters that align with the customer's traffic model.

Do not blindly alter readiness behavior to make pods green. Confirm whether the Service should:

- Send client traffic only to the active node.
- Send traffic to active and standby nodes.
- Include performance standbys.

---

### OpenShift Troubleshooting

Set:

```yaml
global:
  openshift: true
```

Then inspect:

```bash
oc -n vault get pods
oc -n vault describe pod vault-0
oc -n vault get events --sort-by=.lastTimestamp
```

Common issues:

- Assigned UID cannot write to mounted filesystem.
- PVC permissions.
- SCC restrictions.
- Route termination does not match Vault TLS strategy.
- Enterprise proxy prevents image pull.
- Internal CA bundle differs from standard Kubernetes assumptions.

Useful checks:

```bash
oc -n vault get route
oc -n vault get svc
oc -n vault get pvc
oc -n vault adm policy who-can use scc/restricted-v2
```

When using an OpenShift Route, clearly decide where TLS terminates:

```text
Client -> Route -> Vault
```

Possible models:

- Passthrough: Vault terminates TLS.
- Re-encrypt: Route terminates client TLS and establishes TLS to Vault.
- Edge: Route terminates TLS and talks HTTP to the backend.

For Vault, passthrough or re-encrypt is commonly easier to reason about when end-to-end encryption is required.

---

### Helm Upgrade Troubleshooting

Preview first:

```bash
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --values helm-values.yaml \
  --dry-run
```

Apply:

```bash
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --values helm-values.yaml
```

Inspect history:

```bash
helm -n vault history vault
```

Diff the values:

```bash
helm -n vault get values vault > current-values.yaml
```

Because Vault is stateful infrastructure, avoid treating a Helm upgrade like a stateless application deployment.

Before an upgrade:

- Take and verify a Raft snapshot.
- Confirm cluster health.
- Confirm all expected Raft peers.
- Read the Vault upgrade documentation and release notes.
- Validate version compatibility.
- Test the upgrade in a representative lower environment.
- Upgrade standby nodes before the active node where applicable.
- Confirm rollback and restore procedures.

---

### Emergency Pod Scaling

Scale down:

```bash
kubectl -n vault scale statefulset vault --replicas=0
```

Scale back:

```bash
kubectl -n vault scale statefulset vault --replicas=3
```

> **Caution:** With Shamir seal, restarted pods return sealed and require unseal operations. With auto-unseal, validate that the external seal mechanism is available before restarting the cluster.

Do not scale a production Vault cluster casually as a generic troubleshooting step. First determine whether doing so risks losing quorum, availability, or access to the seal mechanism.

---

### Raft Snapshot and Recovery Checks

Before significant changes, take a snapshot:

```bash
kubectl -n vault exec -ti vault-0 -- \
  vault operator raft snapshot save /tmp/vault.snap
```

Copy it out:

```bash
kubectl -n vault cp vault-0:/tmp/vault.snap ./vault.snap
```

Store snapshots in the customer's approved encrypted backup system.

Test the restore procedure periodically. A backup that has never been restored is not a validated recovery capability.

---

### Useful Command Reference

#### Kubernetes

```bash
kubectl -n vault get all
kubectl -n vault get pods -o wide
kubectl -n vault get pvc
kubectl -n vault get svc
kubectl -n vault get endpoints
kubectl -n vault get events --sort-by=.lastTimestamp
kubectl -n vault describe pod vault-0
kubectl -n vault logs vault-0
kubectl -n vault logs --follow vault-0
kubectl -n vault exec -ti vault-0 -- sh
```

#### Helm

```bash
helm -n vault status vault
helm -n vault history vault
helm -n vault get values vault
helm -n vault get manifest vault
helm upgrade vault hashicorp/vault --namespace vault --values helm-values.yaml
```

#### Vault

```bash
vault status
vault operator init
vault operator unseal
vault operator raft join
vault operator raft list-peers
vault operator raft snapshot save
vault audit list
vault auth list
vault secrets list
```

#### TLS

```bash
openssl x509 -in vault-server.crt -noout -text
openssl x509 -in vault-server.crt -noout -ext subjectAltName
openssl s_client -connect <host>:8200 -servername <host> -showcerts
```

---

## Production Hardening Checklist

### Before Customer Acceptance

Confirm the following.

#### Platform

- [ ] Vault Enterprise image version is pinned.
- [ ] Vault Helm chart version is pinned.
- [ ] Three or more Vault nodes are running.
- [ ] Pods are distributed across suitable failure domains.
- [ ] PVCs use approved encrypted storage.
- [ ] Resource requests and limits are documented.
- [ ] PodDisruptionBudget and maintenance behavior are documented.
- [ ] NetworkPolicies are documented and tested.

#### TLS

- [ ] TLS is enabled.
- [ ] Certificates come from an approved customer PKI.
- [ ] SANs cover internal Vault node names and client-facing names.
- [ ] Private keys are stored as Kubernetes Secrets, not ConfigMaps.
- [ ] `-tls-skip-verify` is not required for normal operation.
- [ ] Certificate renewal is documented and tested.

#### Seal

- [ ] Production seal strategy is approved.
- [ ] Auto-unseal dependency is protected against accidental deletion.
- [ ] Shamir key custody, if used, is formally documented.
- [ ] Recovery/unseal drill has been performed.

#### Raft

- [ ] All expected peers appear in `vault operator raft list-peers`.
- [ ] No duplicate node IDs exist.
- [ ] Quorum and failure behavior are understood.
- [ ] Raft snapshot backup is enabled.
- [ ] Snapshot restore has been tested.

#### Vault Security

- [ ] Initial root token is no longer used for routine administration.
- [ ] Normal administrative authentication is configured.
- [ ] Policies follow least privilege.
- [ ] Audit devices are enabled.
- [ ] Audit logs are forwarded to approved storage/SIEM.
- [ ] Root token generation procedure is documented.
- [ ] Break-glass procedure is documented.

#### Operations

- [ ] Monitoring is enabled.
- [ ] Alerting covers sealed nodes, unavailable nodes, storage, CPU/memory, certificate expiry, and Raft health.
- [ ] Runbooks exist for:
  - [ ] Node restart.
  - [ ] Certificate renewal.
  - [ ] Helm upgrade.
  - [ ] Vault upgrade.
  - [ ] Raft snapshot.
  - [ ] Raft restore.
  - [ ] Lost quorum.
  - [ ] Seal failure.
  - [ ] Break-glass access.
- [ ] Customer operators have completed knowledge transfer.

---

## Common Lessons Learned

### Patterns That Prevent Rework

#### Design DNS and Certificates Before Installing Vault

Many apparent "Raft problems" are actually certificate SAN or DNS problems.

Decide first:

```text
What hostname will:
- clients use?
- each Vault pod use?
- the active service use?
- the load balancer or route use?
- Raft join use?
```

Then issue the certificate.

#### Distinguish Bind Addresses From Advertised Addresses

This is valid:

```hcl
listener "tcp" {
  address         = "[::]:8200"
  cluster_address = "[::]:8201"
}
```

This is a bind configuration.

This is conceptually different:

```hcl
api_addr     = "https://vault.example.com:8200"
cluster_addr = "https://vault-0.vault-internal:8201"
```

These addresses are advertised to other components and must be reachable and meaningful.

#### Do Not Solve TLS Problems With Permanent Verification Bypasses

`-tls-skip-verify` and `curl -k` are useful to answer one troubleshooting question:

> "Does the connection work if certificate verification is removed from the equation?"

If yes, the next task is to fix trust, SANs, or the certificate chain.

#### Use Secrets for Sensitive Files

Private keys and licenses should not live in ConfigMaps.

Prefer:

```text
Kubernetes Secret:
- TLS private key
- Enterprise license
- Other sensitive bootstrap material

ConfigMap:
- Public CA bundle
- Non-sensitive configuration
```

#### Do Not Hardcode One Raft Node ID Across the Cluster

Every Raft peer must be unique.

Use the Helm chart's pod-aware node ID mechanism or another deterministic unique node identity.

#### Debug From Inside the Cluster

A workstation can prove that an external endpoint works, but it does not prove that:

```text
vault-1 -> vault-0.vault-internal:8200
```

works.

Use ephemeral debug pods and `kubectl exec` to test the exact same network path Vault uses.

#### Separate Platform Failure From Vault Failure

Before changing Vault configuration, determine whether Kubernetes itself is healthy.

A Vault pod cannot solve:

- Unschedulable nodes.
- Missing PVCs.
- Broken CoreDNS.
- Blocked network policy.
- Invalid SCC.
- Missing image pull access.

#### Always Inspect the Rendered Helm Output

The `values.yaml` file expresses intent.

The rendered StatefulSet, Services, Secrets references, volume mounts, probes, and environment variables show what Kubernetes will actually run.

Use:

```bash
helm template ...
helm get manifest ...
kubectl get statefulset vault -o yaml
```
