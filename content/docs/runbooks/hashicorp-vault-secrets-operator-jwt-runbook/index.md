---
title: "HashiCorp Vault Secrets Operator: JWT Authentication and Secret Synchronization Runbook"
description: "An implementation and troubleshooting runbook for Vault Secrets Operator authentication and Kubernetes secret synchronization using JWT."
date: 2026-10-18
lastmod: 2026-10-18
draft: true
document_type: "Runbook"
topics:
  - "Identity and Security"
  - "Kubernetes and Containers"
  - "DevOps and Infrastructure"
technologies:
  - "HashiCorp Vault"
  - "Vault Secrets Operator"
  - "Kubernetes"
  - "OpenShift"
  - "JWT"
tags:
  - "vault"
  - "vso"
  - "jwt"
  - "runbook"
status: "Published"
version: "1.0"
related_docs:
  - "/docs/runbooks/hashicorp-vault-enterprise-kubernetes-deployment-runbook"
carbon:
  eyebrow: "Runbook · Vault Secrets Operator · Kubernetes and OpenShift"
  lead: "A reusable implementation guide for deploying and configuring Vault Secrets Operator with the Vault JWT authentication method and Kubernetes ServiceAccount tokens, with a layered method for troubleshooting authentication, networking, claims, and secret synchronization."
  meta:
    - label: "Auth method"
      value: "Vault JWT"
    - label: "Identity"
      value: "Kubernetes ServiceAccount tokens"
    - label: "Platform"
      value: "Kubernetes, OpenShift"
  callout:
    kind: "warning"
    title: "Read this first"
    text: "VSO synchronizes Vault secret values into Kubernetes Secrets. Before implementing, confirm that Kubernetes Secret storage is acceptable, that etcd encryption at rest is enabled where required, and that RBAC limits access to destination Secrets. Do not use `-tls-skip-verify` as part of the implementation procedure."
  button:
    label: "Start with the architecture"
    href: "#architecture-overview"
---

## Architecture and Design

### About This Runbook

**Purpose.** A reusable client-facing implementation guide for deploying and configuring HashiCorp Vault Secrets Operator (VSO) with HashiCorp Vault using the Vault JWT authentication method and Kubernetes ServiceAccount tokens.

**Audience.** HashiCorp consultants, solution architects, platform engineers, Kubernetes/OpenShift engineers, and customer operators responsible for integrating workloads with Vault.

**Scope.** This runbook focuses on:

- VSO installation.
- JWT authentication between Kubernetes/OpenShift and Vault.
- Kubernetes ServiceAccount token use.
- JWKS/OIDC discovery.
- Vault policies and JWT roles.
- `VaultConnection`, `VaultAuth`, and `VaultStaticSecret`.
- Cross-namespace patterns.
- TLS validation.
- Troubleshooting authentication, networking, claims, and secret synchronization.

This runbook should be used alongside the companion **HashiCorp Vault Enterprise Kubernetes Deployment and Troubleshooting Runbook**.

---

### Architecture Overview

Vault Secrets Operator allows Kubernetes workloads to consume Vault-managed secrets through Kubernetes-native resources.

A typical architecture looks like this:

```flow
{
  "title": "VSO JWT authentication and secret synchronization",
  "desc": "VSO custom resources configure the Vault Secrets Operator. The operator requests a short-lived ServiceAccount JWT from the Kubernetes API, sends it to the Vault JWT auth mount, and Vault validates the signature against the cluster JWKS endpoint. The operator then writes the authorized secret into a Kubernetes Secret that the application pod consumes.",
  "caption": "Figure 1. VSO JWT authentication and secret synchronization. Drag to pan, Ctrl or ⌘ + scroll to zoom, or use the buttons.",
  "width": 1040,
  "height": 500,
  "legend": {
    "client": "VSO and application traffic",
    "raft": "Vault validates JWT signature via JWKS",
    "store": "Policy-scoped secret access"
  },
  "nodes": [
    {"id": "resources", "x": 20, "y": 210, "title": "VSO custom resources", "sub": "Connection, Auth, Secret", "tone": "white", "desc": "VaultConnection, VaultAuth and VaultStaticSecret describe how VSO reaches Vault, authenticates, and which secret to synchronize."},
    {"id": "operator", "x": 290, "y": 210, "title": "Vault Secrets Operator", "sub": "Runs in the cluster", "tone": "blue", "desc": "the operator that requests ServiceAccount tokens, logs in to Vault and synchronizes secrets."},
    {"id": "kubernetes", "x": 580, "y": 40, "title": "Kubernetes API / OIDC", "sub": "Issuer + JWKS endpoint", "tone": "gray", "desc": "signs the short-lived ServiceAccount JWT and publishes the public verification keys through the JWKS endpoint."},
    {"id": "vault-auth", "x": 580, "y": 210, "title": "Vault JWT auth mount", "sub": "Role + policy", "tone": "green", "desc": "verifies the JWT signature, checks audience, subject and claims, then applies the Vault role and policy."},
    {"id": "secret-engine", "x": 860, "y": 210, "w": 160, "title": "Vault secret engine", "sub": "KV, database, PKI", "tone": "teal", "desc": "the secret engine that holds the secret VSO is authorized to read."},
    {"id": "kubernetes-secret", "x": 580, "y": 370, "title": "Kubernetes Secret", "sub": "Destination Secret", "tone": "yellow", "desc": "the synchronized copy of the Vault value. It exists as a Kubernetes Secret and is stored in etcd."},
    {"id": "application", "x": 860, "y": 370, "w": 160, "title": "Application Pod", "sub": "Consumes the Secret", "tone": "white", "desc": "the workload that consumes the Kubernetes Secret normally."}
  ],
  "edges": [
    {"from": "resources", "to": "operator", "kind": "client", "label": "configures"},
    {"from": "operator", "to": "kubernetes", "kind": "client", "label": "token request"},
    {"from": "operator", "to": "vault-auth", "kind": "client", "label": "JWT login"},
    {"from": "vault-auth", "to": "kubernetes", "kind": "raft", "label": "JWKS"},
    {"from": "vault-auth", "to": "secret-engine", "kind": "store", "label": "policy"},
    {"from": "operator", "to": "kubernetes-secret", "kind": "client", "label": "writes"},
    {"from": "kubernetes-secret", "to": "application", "kind": "client"}
  ]
}
```

The authentication flow is:

```steps
1. VSO requests a short-lived ServiceAccount token.
2. Kubernetes signs the JWT.
3. VSO sends the JWT to the configured Vault JWT auth mount.
4. Vault validates the token signature, the issuer or public signing key, the audience, and the bound claims or subject.
5. Vault issues a Vault token with the policy attached to the JWT role.
6. VSO reads the authorized Vault secret.
7. VSO synchronizes the value into the destination Kubernetes Secret.
8. Applications consume the Kubernetes Secret normally.
```

---

### Important Security Model

Traditional VSO synchronizes Vault secret values into Kubernetes Secrets.

That means:

```text
Vault
  |
  v
Vault Secrets Operator
  |
  v
Kubernetes Secret
  |
  v
etcd / application pod
```

Vault remains the source of truth, but the synchronized value exists as a Kubernetes Secret.

Before implementing VSO, confirm with the customer that:

- Kubernetes Secret storage is acceptable for the workload.
- Kubernetes `etcd` encryption at rest is enabled where required.
- Kubernetes RBAC limits access to destination Secrets.
- Secret visibility through deployment tooling and GitOps is understood.
- Operators cannot casually retrieve destination Secret values.
- Audit requirements cover both Vault access and Kubernetes access.

For environments where secrets must **not** be persisted as Kubernetes Secrets, evaluate the Vault Secrets Operator CSI driver or another direct-secret-consumption pattern.

---

### Design Decisions Before Deployment

Document these decisions before configuring Vault or VSO.

| Decision | Questions |
|---|---|
| Vault location | Same Kubernetes cluster, separate cluster, VM, HCP Vault, or external platform? |
| VSO cluster | EKS, AKS, GKE, OCP, or other supported Kubernetes? |
| Vault auth method | JWT or Kubernetes auth? This runbook uses JWT. |
| Auth mount model | One JWT auth mount per Kubernetes cluster? |
| ServiceAccount model | Dedicated ServiceAccount per application/namespace or shared? |
| Audience | What explicit Vault audience will tokens use? |
| Subject restrictions | Which namespace and ServiceAccount may authenticate? |
| Vault identity alias | Which JWT claim should become the Vault entity alias? |
| JWKS validation | JWKS URL, OIDC discovery URL, or locally configured public keys? |
| Network | Can Vault reach the cluster's JWKS/OIDC endpoint? |
| TLS | What CA signs the Vault endpoint and Kubernetes/OIDC endpoint? |
| Namespace model | VSO resources local to applications or centrally managed? |
| Secret type | KV, database credentials, PKI, cloud credentials, etc.? |
| Refresh strategy | Polling interval, Vault leases, or Enterprise instant updates? |
| Application reload | Does the workload dynamically reload secrets or need rollout restart? |

A common reusable model is:

```text
One JWT auth mount per Kubernetes cluster
        |
        +-- multiple Vault roles
              |
              +-- one role per namespace/workload security boundary
```

This gives each Kubernetes cluster its own JWT trust configuration while allowing roles to enforce application-level authorization.

---

### Prerequisites

#### Required Tools

Validate:

```bash
kubectl version --client
helm version
vault version
curl --version
openssl version
jq --version
```

For OpenShift:

```bash
oc version
```

#### Required Access

The implementation engineer typically needs:

##### Kubernetes

- Ability to create namespaces.
- Ability to install CRDs or coordinate with the cluster administrator.
- Ability to create ServiceAccounts.
- Ability to create VSO custom resources.
- Ability to inspect events and operator logs.
- Cluster-level access if modifying OIDC discovery permissions.

##### Vault

- Ability to enable an auth method.
- Ability to configure the JWT auth mount.
- Ability to create Vault policies.
- Ability to create JWT roles.
- Ability to configure or read the target secrets engine.

---

## Vault JWT Authentication Setup

### Identify the Kubernetes OIDC Issuer and JWKS Endpoint

Kubernetes ServiceAccount tokens are JWTs signed by the cluster's ServiceAccount issuer.

Vault must be able to validate their signature.

Query the cluster's OpenID configuration:

```bash
kubectl get --raw /.well-known/openid-configuration | jq .
```

OpenShift:

```bash
oc get --raw /.well-known/openid-configuration | jq .
```

Typical output contains:

```json
{
  "issuer": "https://<issuer>",
  "jwks_uri": "https://<issuer>/openid/v1/jwks"
}
```

Extract only the values:

```bash
kubectl get --raw /.well-known/openid-configuration \
  | jq -r '.issuer'
```

```bash
kubectl get --raw /.well-known/openid-configuration \
  | jq -r '.jwks_uri'
```

Record:

```text
Cluster:
Issuer:
JWKS URI:
Externally routable JWKS URI:
CA chain:
```

---

### Confirm Vault Can Reach the JWKS Endpoint

This is an important distinction:

```text
Engineer laptop -> JWKS
```

working does **not** prove:

```text
Vault server -> JWKS
```

works.

The Vault servers must be able to reach the configured `jwks_url` when Vault is performing remote key validation.

From a network location representative of Vault:

```bash
curl -v https://<jwks-host>/openid/v1/jwks
```

With the trusted CA explicitly:

```bash
curl \
  --cacert /path/to/kubernetes-api-ca.pem \
  https://<jwks-host>/openid/v1/jwks
```

A valid JWKS response resembles:

```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "RSA",
      "kid": "...",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

The contents are public signing keys used for JWT signature validation.

---

### When the JWKS Endpoint Is Not Publicly Accessible

Some Kubernetes/OpenShift environments restrict unauthenticated access to ServiceAccount issuer discovery.

Check:

```bash
curl -v https://<issuer>/openid/v1/jwks
```

If authorization is the problem, one possible Kubernetes configuration is:

```bash
kubectl create clusterrolebinding oidc-public-discovery \
  --clusterrole=system:service-account-issuer-discovery \
  --group=system:unauthenticated
```

OpenShift:

```bash
oc create clusterrolebinding oidc-public-discovery \
  --clusterrole=system:service-account-issuer-discovery \
  --group=system:unauthenticated
```

Equivalent YAML:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-public-discovery
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:service-account-issuer-discovery
subjects:
  - kind: Group
    name: system:unauthenticated
    apiGroup: rbac.authorization.k8s.io
```

> **Security note:** The JWKS endpoint contains public verification keys, not private signing keys. However, granting unauthenticated discovery is still a cluster-level security decision. Do not apply this binding automatically in a client environment. Confirm the customer's security policy and determine whether an alternate pattern is preferred.

---

### Private Cluster Alternative: Configure JWT Validation Public Keys

If Vault cannot reach the Kubernetes API/OIDC endpoint, Vault can validate ServiceAccount JWTs using the cluster's public signing keys directly.

Export JWKS:

```bash
oc get --raw /openid/v1/jwks \
  | jq . \
  > ocp-jwks.json
```

or:

```bash
kubectl get --raw /openid/v1/jwks \
  | jq . \
  > kubernetes-jwks.json
```

The public keys can be converted to PEM.

Example Python helper:

```python
import json
import base64

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


def b64url_to_int(value):
    padded = value + "=" * (-len(value) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(padded), "big")


with open("kubernetes-jwks.json") as f:
    jwks = json.load(f)

for i, jwk in enumerate(jwks["keys"], start=1):
    if jwk.get("kty") != "RSA":
        continue

    n = b64url_to_int(jwk["n"])
    e = b64url_to_int(jwk["e"])

    public_key = rsa.RSAPublicNumbers(e, n).public_key()

    pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    filename = f"kubernetes-jwt-public-key-{i}.pem"

    with open(filename, "wb") as output:
        output.write(pem)

    print(f"Wrote {filename}, kid={jwk.get('kid')}")
```

Vault can then be configured using the public key material rather than requiring continuous network access to the JWKS URL.

This can be preferable when:

- The Kubernetes API is private.
- Vault is outside the Kubernetes network.
- Security teams do not permit public OIDC discovery.
- Network architecture prevents Vault from reaching the Kubernetes issuer.

The tradeoff is that signing-key rotation must be operationally accounted for.

---

### Create a Dedicated ServiceAccount

Do not use the `default` ServiceAccount as the production baseline.

Create a dedicated identity for each workload or security boundary.

Example namespace:

```bash
kubectl create namespace app1
```

Create the ServiceAccount:

```bash
kubectl -n app1 create serviceaccount app1-vso
```

Validate:

```bash
kubectl -n app1 get serviceaccount app1-vso
```

The resulting JWT subject will normally resemble:

```text
system:serviceaccount:app1:app1-vso
```

This subject is extremely useful as an authorization boundary in the Vault JWT role.

---

### Create the Vault Secret and Policy

For a simple KV-v2 demonstration:

```bash
vault secrets enable -path=apps kv-v2
```

Write a test secret:

```bash
vault kv put apps/app1/config \
  username="example-user" \
  password="example-password"
```

Create a least-privilege policy:

```hcl
path "apps/data/app1/config" {
  capabilities = ["read"]
}

path "apps/metadata/app1/config" {
  capabilities = ["read"]
}
```

Save as:

```text
app1-vso-policy.hcl
```

Write it:

```bash
vault policy write app1-vso app1-vso-policy.hcl
```

Review:

```bash
vault policy read app1-vso
```

Avoid broad policies such as:

```hcl
path "*" {
  capabilities = ["read"]
}
```

VSO should receive only the paths required by the workload.

---

### Enable a Vault JWT Auth Mount

A useful enterprise pattern is one auth mount per Kubernetes cluster.

Example:

```bash
vault auth enable \
  -path=jwt-cluster-a \
  jwt
```

Validate:

```bash
vault auth list
```

Example:

```text
Path             Type
----             ----
jwt-cluster-a/   jwt
```

The mount name should represent the trust boundary, for example:

```text
jwt-prod-ocp
jwt-nonprod-ocp
jwt-eastus2-aks
jwt-shared-eks
```

---

### Configure the JWT Auth Mount

#### JWKS URL

```bash
vault write auth/jwt-cluster-a/config \
  jwks_url="https://<cluster-issuer>/openid/v1/jwks"
```

#### OIDC Discovery URL

If using discovery:

```bash
vault write auth/jwt-cluster-a/config \
  oidc_discovery_url="https://<cluster-issuer>"
```

For JWT validation using OIDC discovery, a client ID and secret are not required unless using the full OIDC authorization-code flow.

Validate:

```bash
vault read auth/jwt-cluster-a/config
```

> Avoid making `-tls-skip-verify` part of the implementation procedure. If Vault cannot validate the Kubernetes issuer's TLS certificate, configure the appropriate trust chain or use an architecture-approved alternative.

---

### Understand the JWT Claims Before Creating the Vault Role

Create a token for the exact ServiceAccount VSO will use:

```bash
kubectl -n app1 create token app1-vso \
  --audience=vault \
  --duration=10m
```

Store temporarily:

```bash
TOKEN="$(kubectl -n app1 create token app1-vso --audience=vault --duration=10m)"
```

Decode the payload locally:

```bash
echo "$TOKEN" \
  | cut -d '.' -f2 \
  | tr '_-' '/+' \
  | base64 -d 2>/dev/null \
  | jq .
```

A typical payload might contain:

```json
{
  "aud": [
    "vault"
  ],
  "exp": 1770095262,
  "iat": 1770091662,
  "iss": "https://example-kubernetes-issuer/",
  "kubernetes.io": {
    "namespace": "app1",
    "serviceaccount": {
      "name": "app1-vso",
      "uid": "..."
    }
  },
  "nbf": 1770091662,
  "sub": "system:serviceaccount:app1:app1-vso"
}
```

The most important fields are typically:

```text
iss
aud
sub
kubernetes.io.namespace
kubernetes.io.serviceaccount.name
```

---

### Audience Design

Use a Vault-specific audience rather than simply accepting the Kubernetes API's default audience when practical.

Example:

```text
vault
```

or:

```text
vault-prod
```

or:

```text
vault-app1
```

VSO requests a token containing this audience:

```yaml
jwt:
  audiences:
    - vault
```

The Vault JWT role must contain a matching audience:

```json
"bound_audiences": ["vault"]
```

Modern Vault versions require at least one configured `bound_audiences` value to exactly match a token audience when the token contains an `aud` claim.

A mismatched audience commonly results in Vault authentication failure even when:

- The JWT signature is valid.
- The ServiceAccount is correct.
- The Vault policy is correct.

---

### Create the Vault JWT Role

A strongly scoped example:

```bash
vault write auth/jwt-cluster-a/role/app1-vso -<<'EOF'
{
  "role_type": "jwt",
  "user_claim": "sub",
  "bound_audiences": ["vault"],
  "bound_claims_type": "string",
  "bound_claims": {
    "sub": "system:serviceaccount:app1:app1-vso"
  },
  "token_policies": ["app1-vso"],
  "token_ttl": "1h"
}
EOF
```

Read it:

```bash
vault read auth/jwt-cluster-a/role/app1-vso
```

This enforces:

```text
JWT signed by trusted cluster key
       +
aud contains "vault"
       +
sub == system:serviceaccount:app1:app1-vso
       +
Vault token receives app1-vso policy
```

---

### `user_claim` and Vault Identity

`user_claim` determines the claim Vault uses to construct the identity alias for the authenticated JWT.

The simplest and most attributable default is:

```json
"user_claim": "sub"
```

For Kubernetes ServiceAccounts this creates identity at the ServiceAccount level:

```text
system:serviceaccount:app1:app1-vso
```

Alternative claims such as `iss` can intentionally collapse aliases to a broader identity such as the Kubernetes cluster.

That may be useful in specialized identity designs, but should not be selected solely to reduce identity or client cardinality.

When selecting `user_claim`, consider:

- Audit attribution.
- Identity grouping.
- Vault entity behavior.
- Cross-namespace reuse.
- Client-count/licensing behavior under the customer's Vault license.
- Whether multiple workloads should intentionally share an entity alias.

For most client implementations, prefer **traceability and least privilege** over alias consolidation.

---

### Optional JSON Pointer `user_claim`

Kubernetes tokens may include nested ServiceAccount information.

Example token:

```json
{
  "kubernetes.io": {
    "serviceaccount": {
      "name": "app1-vso"
    }
  }
}
```

A role can use a JSON pointer:

```json
{
  "user_claim": "/kubernetes.io/serviceaccount/name",
  "user_claim_json_pointer": true
}
```

Example:

```bash
vault write auth/jwt-cluster-a/role/app-sa-name -<<'EOF'
{
  "role_type": "jwt",
  "user_claim": "/kubernetes.io/serviceaccount/name",
  "user_claim_json_pointer": true,
  "bound_audiences": ["vault"],
  "bound_claims_type": "glob",
  "bound_claims": {
    "sub": "system:serviceaccount:*:app1-vso"
  },
  "token_policies": ["app1-vso"],
  "token_ttl": "1h"
}
EOF
```

Use this only when the identity design intentionally requires it.

---

### Test JWT Authentication Manually Before Installing VSO

This is one of the best ways to isolate Vault from VSO.

Create a token:

```bash
TOKEN="$(kubectl -n app1 create token app1-vso --audience=vault --duration=10m)"
```

Authenticate directly:

```bash
vault write auth/jwt-cluster-a/login \
  role=app1-vso \
  jwt="$TOKEN"
```

Success proves that:

```text
Kubernetes token generation
+
JWT signature validation
+
audience
+
bound claims
+
Vault role
+
Vault policy assignment
```

are working before VSO is introduced.

If this test fails, fix Vault/JWT authentication first.

Do **not** debug VSO CRDs while the direct JWT login is still failing.

---

## VSO Installation and Secret Synchronization

### Install Vault Secrets Operator

Add the HashiCorp Helm repository:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

Review available chart versions:

```bash
helm search repo hashicorp/vault-secrets-operator --versions
```

Create the operator namespace:

```bash
kubectl create namespace vault-secrets-operator-system
```

Install a validated chart version:

```bash
helm upgrade --install vault-secrets-operator \
  hashicorp/vault-secrets-operator \
  --namespace vault-secrets-operator-system \
  --create-namespace \
  --version <validated-vso-chart-version>
```

Validate:

```bash
kubectl -n vault-secrets-operator-system get pods
kubectl -n vault-secrets-operator-system get deployments
```

Check CRDs:

```bash
kubectl get crd | grep secrets.hashicorp.com
```

Expected resources include types such as:

```text
vaultconnections.secrets.hashicorp.com
vaultauths.secrets.hashicorp.com
vaultauthglobals.secrets.hashicorp.com
vaultstaticsecrets.secrets.hashicorp.com
vaultdynamicsecrets.secrets.hashicorp.com
vaultpkisecrets.secrets.hashicorp.com
```

---

### Pin VSO Versions

For customer environments:

- Pin the Helm chart version.
- Validate the VSO version against the customer Kubernetes/OpenShift version.
- Review upgrade notes before changing VSO.
- Review CRD changes during upgrades.

For upgrades, the Helm chart's CRDs may need to be applied explicitly depending on the installed version.

Example pattern:

```bash
helm show crds \
  --version <new-version> \
  hashicorp/vault-secrets-operator \
  | kubectl apply -f -
```

Then perform the Helm upgrade according to the validated upgrade procedure.

---

### Configure Vault TLS Trust for VSO

Do not use:

```yaml
skipTLSVerify: true
```

as the normal production pattern.

Create a Kubernetes Secret containing the Vault CA:

```bash
kubectl -n app1 create secret generic vault-ca \
  --from-file=ca.crt=./vault-ca.crt
```

A `VaultConnection` can reference trusted CA material.

The exact `caCertSecretRef` format should be validated against the installed VSO version/API before deployment.

At minimum, the design should ensure:

```text
VSO trusts the CA
     +
Vault certificate SAN matches the hostname in VaultConnection.spec.address
```

---

### Create a VaultConnection

Example:

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultConnection
metadata:
  name: vault-connection
  namespace: app1
spec:
  address: "https://vault.example.com:8200"
  skipTLSVerify: false
```

Apply:

```bash
kubectl apply -f vault-connection.yaml
```

Inspect:

```bash
kubectl -n app1 get vaultconnection vault-connection -o yaml
```

A `VaultConnection` defines **where Vault is**.

It does not define:

```text
who the workload is
what Vault role to use
what secret to retrieve
```

Those concerns belong to `VaultAuth` and secret resources.

---

### Create a VaultAuth

Example:

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultAuth
metadata:
  name: app1-vault-auth
  namespace: app1
spec:
  method: jwt
  mount: jwt-cluster-a
  vaultConnectionRef: vault-connection

  jwt:
    role: app1-vso
    serviceAccount: app1-vso
    audiences:
      - vault
```

Apply:

```bash
kubectl apply -f vault-auth.yaml
```

Inspect:

```bash
kubectl -n app1 get vaultauth app1-vault-auth -o yaml
```

The mapping is:

```text
VaultAuth.jwt.serviceAccount
        |
        v
app1-vso
        |
        +--> JWT sub
              system:serviceaccount:app1:app1-vso

VaultAuth.jwt.audiences
        |
        v
vault

VaultAuth.mount
        |
        v
auth/jwt-cluster-a

VaultAuth.jwt.role
        |
        v
auth/jwt-cluster-a/role/app1-vso
```

These values must align.

---

### ServiceAccount Namespace Rule

The ServiceAccount used for authentication must exist in the namespace of the consuming secret resource under the normal VSO security model.

For example:

```text
VaultStaticSecret namespace: app1
VaultAuth namespace:         app1
ServiceAccount namespace:    app1
```

Recommended:

```text
app1/
  ServiceAccount: app1-vso
  VaultConnection: vault-connection
  VaultAuth: app1-vault-auth
  VaultStaticSecret: app1-config
```

This pattern is easy to reason about and reduces accidental cross-namespace authorization.

---

### Create a VaultStaticSecret

Example:

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: app1-config
  namespace: app1
spec:
  type: kv-v2

  mount: apps
  path: app1/config

  vaultAuthRef: app1-vault-auth

  refreshAfter: 60s

  destination:
    create: true
    name: app1-config
    overwrite: true

    transformation:
      excludeRaw: true
```

Apply:

```bash
kubectl apply -f vault-static-secret.yaml
```

Check:

```bash
kubectl -n app1 get vaultstaticsecret app1-config
```

Inspect status:

```bash
kubectl -n app1 describe vaultstaticsecret app1-config
```

Confirm destination Secret:

```bash
kubectl -n app1 get secret app1-config
```

Do not routinely decode the secret value in production troubleshooting.

---

### Verify Secret Synchronization Safely

Check Secret metadata:

```bash
kubectl -n app1 get secret app1-config -o yaml
```

Avoid displaying:

```yaml
data:
```

in shared terminals, tickets, or screen recordings.

A safer test is to inspect only keys:

```bash
kubectl -n app1 get secret app1-config \
  -o json \
  | jq -r '.data | keys[]'
```

Expected:

```text
password
username
```

If value validation is necessary in a controlled environment:

```bash
kubectl -n app1 get secret app1-config \
  -o jsonpath='{.data.username}' \
  | base64 -d
```

Do not include real customer secret values in implementation documentation.

---

### HMAC Drift Detection

VSO can use HMAC data to detect differences between the source and synchronized Kubernetes Secret.

Example:

```yaml
spec:
  hmacSecretData: true
```

For modern VSO versions this behavior may already be enabled by default.

Use drift detection so that accidental or unauthorized modifications to the Kubernetes Secret are reconciled back to the Vault source of truth.

---

### Application Rollout Restart on Secret Change

Applications do not always reload Kubernetes Secret values automatically.

For workloads that require restart after secret rotation, VSO can trigger rollout restarts.

Example:

```yaml
spec:
  rolloutRestartTargets:
    - kind: Deployment
      name: app1

  destination:
    create: true
    name: app1-config
```

Supported targets depend on the installed VSO version and include resources such as:

```text
Deployment
DaemonSet
StatefulSet
Argo Rollout
```

Use rollout restart only when the application does not support dynamic secret reload.

---

### Secret Refresh Interval

A lab setting such as:

```yaml
refreshAfter: 5s
```

is useful for observing behavior but is usually unnecessarily aggressive in production.

Example production-style polling:

```yaml
refreshAfter: 60s
```

or:

```yaml
refreshAfter: 5m
```

Select the interval based on:

- Required secret propagation speed.
- Vault/API load.
- Secret rotation cadence.
- Application behavior.
- Number of VSO-managed resources.

For leased secrets, Vault lease duration may control synchronization behavior instead of `refreshAfter`.

---

### Vault Enterprise Instant Updates

Vault Enterprise can support event-driven synchronization for supported secret types and versions.

Example:

```yaml
spec:
  syncConfig:
    instantUpdates: true
```

Do not eliminate periodic reconciliation solely because instant updates are enabled.

Event delivery is not guaranteed, so a periodic refresh remains an important safety mechanism.

Use instant updates when:

- The Vault/VSO versions support the feature.
- The secret engine supports the feature.
- Faster secret propagation is required.

---

### Cross-Namespace VaultAuth References

A secret resource may reference a `VaultAuth` in another namespace using:

```text
namespace/name
```

Example:

```yaml
vaultAuthRef: platform-secrets/shared-vault-auth
```

Similarly, a `VaultAuth` can reference a `VaultConnection` in another namespace.

Cross-namespace use introduces additional authorization considerations.

Before using shared authentication resources, determine:

- Which namespaces may reference them.
- Whether `allowedNamespaces` is appropriate.
- Whether a shared ServiceAccount identity weakens workload attribution.
- Whether Vault policies remain appropriately isolated.

For most application teams, local auth resources are simpler and safer.

---

### `allowedNamespaces`

A shared `VaultAuth` can be restricted to specific namespaces using:

```yaml
spec:
  allowedNamespaces:
    - app1
    - app2
```

Avoid this as a default:

```yaml
allowedNamespaces:
  - "*"
```

unless a deliberate platform-wide authentication design requires it.

This feature provides another boundary in addition to Vault's own JWT role restrictions.

Defense in depth should be:

```text
VSO namespace authorization
        +
JWT ServiceAccount identity
        +
JWT bound audience
        +
JWT bound claims
        +
Vault policy
```

---

### Be Careful With Resources Named `default`

VSO supports default connection/auth resources.

A `VaultConnection` or `VaultAuth` named `default` may have broader default-reference behavior than an explicitly named resource.

For client implementations, explicitly named resources are generally easier to audit:

```text
vault-prod
app1-vault-auth
payments-vault-auth
```

instead of:

```text
default
```

unless the platform architecture intentionally defines a global/default configuration.

---

### VaultAuthGlobal

Modern VSO versions include `VaultAuthGlobal`.

This can be useful when many namespaces share common authentication configuration.

A global pattern can reduce duplication while local `VaultAuth` resources retain workload-specific settings.

Use it when:

- Many teams share one auth mount.
- Common audiences are standardized.
- Connection configuration is centralized.
- The platform team needs consistent defaults.

Avoid using global configuration in ways that obscure which workload identity ultimately authenticates to Vault.

---

### Cross-Cluster Design

The original implementation notes were specifically developed around Vault authenticating ServiceAccount JWTs from separate Kubernetes/OpenShift clusters.

A scalable pattern is:

```flow
{
  "title": "One JWT auth mount per Kubernetes cluster",
  "desc": "Vault holds one JWT auth mount for each Kubernetes cluster. Mount jwt-cluster-a has roles app1 and app2, jwt-cluster-b has roles app3 and app4, and jwt-cluster-c has role app5.",
  "caption": "Figure 2. Cross-cluster design. Drag to pan, Ctrl or ⌘ + scroll to zoom, or use the buttons.",
  "width": 1040,
  "height": 500,
  "legend": {"client": "Contains"},
  "nodes": [
    {"id": "vault", "x": 20, "y": 210, "w": 160, "title": "Vault", "sub": "Auth methods", "tone": "green", "desc": "holds one JWT auth mount for each Kubernetes cluster."},
    {"id": "cluster-a", "x": 330, "y": 40, "title": "auth/jwt-cluster-a", "sub": "Cluster A trust", "tone": "blue", "mono": true, "desc": "JWT auth mount with the signing authority and JWKS URL of cluster A."},
    {"id": "cluster-b", "x": 330, "y": 210, "title": "auth/jwt-cluster-b", "sub": "Cluster B trust", "tone": "blue", "mono": true, "desc": "JWT auth mount with the signing authority and JWKS URL of cluster B."},
    {"id": "cluster-c", "x": 330, "y": 380, "title": "auth/jwt-cluster-c", "sub": "Cluster C trust", "tone": "blue", "mono": true, "desc": "JWT auth mount with the signing authority and JWKS URL of cluster C."},
    {"id": "roles-a", "x": 700, "y": 40, "w": 300, "title": "role/app1, role/app2", "sub": "Per-workload boundaries", "tone": "white", "mono": true, "desc": "roles that enforce application-level authorization for cluster A."},
    {"id": "roles-b", "x": 700, "y": 210, "w": 300, "title": "role/app3, role/app4", "sub": "Per-workload boundaries", "tone": "white", "mono": true, "desc": "roles that enforce application-level authorization for cluster B."},
    {"id": "roles-c", "x": 700, "y": 380, "w": 300, "title": "role/app5", "sub": "Per-workload boundary", "tone": "white", "mono": true, "desc": "role that enforces application-level authorization for cluster C."}
  ],
  "edges": [
    {"from": "vault", "to": "cluster-a", "kind": "client"},
    {"from": "vault", "to": "cluster-b", "kind": "client"},
    {"from": "vault", "to": "cluster-c", "kind": "client"},
    {"from": "cluster-a", "to": "roles-a", "kind": "client"},
    {"from": "cluster-b", "to": "roles-b", "kind": "client"},
    {"from": "cluster-c", "to": "roles-c", "kind": "client"}
  ]
}
```

Benefits:

- Different signing authorities remain isolated.
- JWKS URLs are cluster-specific.
- Roles can use cluster-specific audience constraints.
- Troubleshooting is easier because a failed token maps to a specific trust configuration.
- A cluster can be rotated or decommissioned independently.

---

## Troubleshooting Guide

### Troubleshooting Methodology

Use this sequence:

```text
1. VSO pod health
2. CRDs installed
3. Kubernetes ServiceAccount exists
4. Token can be generated
5. JWT claims are correct
6. Vault can reach or validate cluster signing keys
7. JWT auth mount configuration
8. JWT role audience / claims
9. Direct Vault JWT login
10. Vault policy
11. VaultConnection TLS/network
12. VaultAuth
13. VaultStaticSecret status
14. Destination Kubernetes Secret
15. Application consumption
```

Do not modify multiple layers simultaneously.

---

### Inspect VSO Health

```bash
kubectl -n vault-secrets-operator-system get pods
```

Logs:

```bash
kubectl -n vault-secrets-operator-system logs \
  deployment/vault-secrets-operator-controller-manager
```

If the deployment name differs:

```bash
kubectl -n vault-secrets-operator-system get deployments
```

Then:

```bash
kubectl -n vault-secrets-operator-system logs \
  deployment/<deployment-name>
```

Follow:

```bash
kubectl -n vault-secrets-operator-system logs \
  -f deployment/<deployment-name>
```

---

### Inspect VSO Custom Resources

List:

```bash
kubectl get vaultconnection -A
kubectl get vaultauth -A
kubectl get vaultstaticsecret -A
kubectl get vaultdynamicsecret -A
kubectl get vaultpkisecret -A
```

Describe the failing resource:

```bash
kubectl -n app1 describe vaultstaticsecret app1-config
```

Inspect status only:

```bash
kubectl -n app1 get vaultstaticsecret app1-config \
  -o json \
  | jq '.status'
```

Also inspect events:

```bash
kubectl -n app1 get events \
  --sort-by=.lastTimestamp
```

---

### Debug the ServiceAccount JWT

Generate the exact token VSO should use:

```bash
kubectl -n app1 create token app1-vso \
  --audience=vault \
  --duration=10m
```

Decode locally.

Portable Python example:

```bash
TOKEN="$(kubectl -n app1 create token app1-vso --audience=vault --duration=10m)"

python3 - "$TOKEN" <<'PY'
import sys
import json
import base64

token = sys.argv[1]
parts = token.split(".")

if len(parts) != 3:
    raise SystemExit("Token is not a JWT")

payload = parts[1]
payload += "=" * (-len(payload) % 4)

decoded = base64.urlsafe_b64decode(payload)
print(json.dumps(json.loads(decoded), indent=2))
PY
```

Compare:

```text
JWT                          Vault role
---                          ----------
aud                <------> bound_audiences
sub                <------> bound_claims.sub / bound_subject
chosen user_claim  <------> user_claim
iss                <------> trusted issuer/JWKS configuration
```

---

### `audience claim does not match`

Symptom:

```text
audience claim does not match any expected audience
```

Check token:

```bash
kubectl -n app1 create token app1-vso \
  --audience=vault
```

Decode and inspect:

```json
"aud": [
  "vault"
]
```

Check Vault:

```bash
vault read auth/jwt-cluster-a/role/app1-vso
```

Confirm:

```text
bound_audiences    [vault]
```

Check VSO:

```yaml
jwt:
  audiences:
    - vault
```

All three must match.

---

### Subject or Bound Claim Failure

Expected:

```text
system:serviceaccount:app1:app1-vso
```

Check token:

```json
"sub": "system:serviceaccount:app1:app1-vso"
```

Check role:

```bash
vault read auth/jwt-cluster-a/role/app1-vso
```

If configured as:

```json
"bound_claims": {
  "sub": "system:serviceaccount:app1:app1-vso"
}
```

the token must match exactly for `bound_claims_type=string`.

For wildcard behavior:

```json
"bound_claims_type": "glob"
```

with:

```json
"sub": "system:serviceaccount:app1:*"
```

Use glob patterns only when a broader trust boundary is intentional.

---

### Token Signature Cannot Be Validated

Potential causes:

```text
Wrong JWKS URL
Wrong issuer
Vault cannot reach JWKS URL
JWKS endpoint requires authentication
Signing keys rotated
Public key configuration is stale
TLS prevents Vault from retrieving JWKS
```

Test:

```bash
curl -v https://<issuer>/openid/v1/jwks
```

Validate JSON:

```bash
curl -s https://<issuer>/openid/v1/jwks \
  | jq .
```

Inspect JWT header:

```bash
TOKEN="$(kubectl -n app1 create token app1-vso --audience=vault)"

python3 - "$TOKEN" <<'PY'
import sys, json, base64

header = sys.argv[1].split(".")[0]
header += "=" * (-len(header) % 4)

print(json.dumps(
    json.loads(base64.urlsafe_b64decode(header)),
    indent=2
))
PY
```

Look for:

```json
{
  "alg": "RS256",
  "kid": "<key-id>"
}
```

Compare `kid` to the JWKS key set.

---

### JWKS Endpoint Returns 401 or 403

A `403` is different from a network failure.

It means:

```text
DNS worked
+
TCP connection worked
+
TLS probably worked
+
HTTP server responded
+
authorization denied the request
```

A timeout means something different:

```text
routing / firewall / network policy / service reachability
```

A certificate error means something different again:

```text
TLS trust or hostname validation
```

Do not collapse all three into "Vault cannot reach Kubernetes."

---

### Debug Kubernetes API/JWKS TLS

Inspect the server chain:

```bash
openssl s_client \
  -connect <kubernetes-api-host>:443 \
  -servername <kubernetes-api-host> \
  -showcerts
```

For OpenShift API port 6443:

```bash
openssl s_client \
  -connect <api-host>:6443 \
  -servername <api-host> \
  -showcerts
```

Validate with CA:

```bash
curl \
  --cacert /path/to/ca.pem \
  https://<api-host>:6443/openid/v1/jwks
```

Important distinction:

```text
--cacert
```

means:

> Trust this CA when validating the server.

Whereas:

```text
--cert
```

means:

> Present this client certificate to the server.

These are different TLS operations.

Do not use a client certificate when the actual issue is server CA trust.

---

### `x509: certificate signed by unknown authority`

Potentially occurs on either:

```text
VSO -> Vault
```

or:

```text
Vault -> Kubernetes JWKS
```

Determine which connection is failing.

#### VSO -> Vault

Check:

```yaml
VaultConnection.spec.address
VaultConnection.spec.skipTLSVerify
VaultConnection CA configuration
```

Validate:

```bash
curl \
  --cacert vault-ca.crt \
  https://vault.example.com:8200/v1/sys/health
```

#### Vault -> JWKS

Validate from the Vault network:

```bash
curl \
  --cacert kubernetes-ca.crt \
  https://<issuer>/openid/v1/jwks
```

---

### `x509: certificate is valid for ..., not ...`

This is a SAN mismatch.

For VSO -> Vault:

```yaml
spec:
  address: https://vault.example.com:8200
```

requires the Vault server certificate to include:

```text
DNS:vault.example.com
```

For Vault -> Kubernetes issuer:

The hostname in:

```text
jwks_url
```

must match the Kubernetes/OIDC server certificate.

Do not make `skipTLSVerify: true` the permanent fix.

---

### Test VaultConnection Independently

From a Kubernetes debug pod:

```bash
kubectl -n app1 run vault-curl \
  --rm -it \
  --image=curlimages/curl \
  -- sh
```

Then:

```sh
curl -v https://vault.example.com:8200/v1/sys/health
```

If CA material is mounted into the pod:

```sh
curl \
  --cacert /path/to/vault-ca.crt \
  https://vault.example.com:8200/v1/sys/health
```

Interpretation:

```text
Connection refused
    -> service/listener/network endpoint

Timeout
    -> network route / firewall / policy

Unknown authority
    -> CA trust

Hostname mismatch
    -> certificate SAN

HTTP Vault health response
    -> network + TLS + HTTP are working
```

---

### Test Vault JWT Login Independently

This is one of the most important troubleshooting techniques.

```bash
TOKEN="$(kubectl -n app1 create token app1-vso --audience=vault)"
```

Then:

```bash
vault write auth/jwt-cluster-a/login \
  role=app1-vso \
  jwt="$TOKEN"
```

If this works:

```text
Kubernetes token
Vault JWT trust
Audience
Claims
Vault role
```

are all functioning.

Then focus on:

```text
VaultConnection
VaultAuth
VSO permissions
VSO controller
CR references
```

If it fails, VSO is probably not the root cause.

---

### Test the Vault Policy

After authenticating, use the issued Vault token in a controlled environment.

Check capabilities:

```bash
vault token capabilities apps/data/app1/config
```

Expected:

```text
read
```

If the token authenticates successfully but VSO receives `403 permission denied`, the authentication layer may be correct while the Vault policy is wrong.

This distinction matters:

```text
Authentication = Who are you?
Authorization  = What may you read?
```

---

### VSO Resource Exists but Kubernetes Secret Does Not

Check:

```bash
kubectl -n app1 describe vaultstaticsecret app1-config
```

Then:

```bash
kubectl -n app1 get events \
  --sort-by=.lastTimestamp
```

Common causes:

- VaultAuth reference is wrong.
- VaultConnection reference is wrong.
- Vault policy denies the path.
- Vault secret path is wrong.
- KV-v1 vs KV-v2 type mismatch.
- Secret engine mount is wrong.
- TLS validation failure.
- JWT role mismatch.
- Operator does not have permission to create the Kubernetes Secret.

---

### KV-v2 Path Confusion

For a KV-v2 secrets engine:

CLI:

```bash
vault kv get apps/app1/config
```

API policy path:

```text
apps/data/app1/config
```

VSO resource:

```yaml
type: kv-v2
mount: apps
path: app1/config
```

Do not put:

```yaml
path: data/app1/config
```

unless the VSO API specifically requires an API path for the installed version.

For `VaultStaticSecret`, the `mount` and `path` fields abstract the KV API path.

---

### Inspect Kubernetes RBAC

Check what the ServiceAccount can do:

```bash
kubectl auth can-i --list \
  --as=system:serviceaccount:app1:app1-vso
```

Check a specific action:

```bash
kubectl auth can-i get secrets \
  -n app1 \
  --as=system:serviceaccount:app1:app1-vso
```

Remember:

The ServiceAccount VSO uses for JWT authentication does not necessarily need broad Kubernetes Secret privileges.

VSO's controller ServiceAccount is the component managing the destination Secret through the Kubernetes API.

Keep these identities conceptually separate.

---

### OpenShift Notes

The JWT architecture is particularly useful when Vault is outside the OpenShift cluster and direct Kubernetes auth review flows are undesirable.

Useful checks:

```bash
oc get --raw /.well-known/openid-configuration | jq .
```

```bash
oc get --raw /openid/v1/jwks | jq .
```

Create token:

```bash
oc create token app1-vso \
  -n app1 \
  --audience=vault
```

Inspect operator:

```bash
oc -n vault-secrets-operator-system get pods
```

Events:

```bash
oc -n app1 get events \
  --sort-by=.lastTimestamp
```

If OpenShift routes are used to expose issuer/JWKS endpoints, confirm:

- Route hostname.
- API path.
- TLS termination.
- CA chain.
- Network path from Vault.
- Whether the route preserves the issuer/JWKS behavior required by Vault.

---

### Network Policies

VSO generally requires network access from the operator to:

```text
Vault address
DNS
Kubernetes API
```

Vault may additionally require access to:

```text
Kubernetes/OIDC issuer / JWKS endpoint
```

when using remote JWKS validation.

Document flows such as:

| Source | Destination | Port | Purpose |
|---|---|---:|---|
| VSO | Vault | 8200/TCP or 443 | Vault API |
| VSO | Kubernetes API | 443/6443 | Token requests and CR operations |
| Vault | OIDC/JWKS endpoint | 443/6443 | JWT public key retrieval |
| Workload | Kubernetes API / node | platform dependent | Kubernetes Secret consumption |

If the Vault address is fronted by an ingress/load balancer, document the actual destination and certificate hostname.

---

## Production Hardening Checklist

### Before Customer Acceptance

#### VSO Installation

- [ ] VSO Helm chart version is pinned.
- [ ] CRDs correspond to the installed operator version.
- [ ] Operator runs in a dedicated namespace.
- [ ] Operator image source is approved.
- [ ] Resource requests/limits are defined.
- [ ] Metrics/monitoring are enabled where required.

#### Authentication

- [ ] Dedicated ServiceAccounts are used.
- [ ] The `default` ServiceAccount is not used for production workloads unless explicitly approved.
- [ ] JWT audience is explicit and Vault-specific.
- [ ] Vault role audience matches the token audience.
- [ ] Vault role subject/claims restrict the intended namespace and ServiceAccount.
- [ ] JWT auth mounts represent clear Kubernetes cluster trust boundaries.
- [ ] `user_claim` is selected intentionally for auditability and identity behavior.

#### TLS

- [ ] VSO validates the Vault server certificate.
- [ ] `skipTLSVerify` is false.
- [ ] Vault certificate SAN matches the configured VaultConnection hostname.
- [ ] Vault can validate the JWKS/OIDC server certificate.
- [ ] Issuer/JWKS CA chains are documented.
- [ ] Certificate renewal procedures are documented.

#### Vault Authorization

- [ ] Each workload has least-privilege Vault policy.
- [ ] Policies restrict exact secret paths.
- [ ] Auth role TTL is appropriate.
- [ ] Broad wildcard policies are avoided.
- [ ] Vault audit logging is enabled.

#### Kubernetes

- [ ] Destination Kubernetes Secret access is limited by RBAC.
- [ ] Kubernetes etcd encryption is enabled where required.
- [ ] Cross-namespace references are intentionally designed.
- [ ] `allowedNamespaces: ["*"]` is avoided unless justified.
- [ ] Secret data is not stored in Git.
- [ ] Secret values are not printed in automation logs.

#### Operations

- [ ] Secret refresh/lease behavior is documented.
- [ ] Applications either reload secrets dynamically or have restart behavior configured.
- [ ] Operator logs are forwarded/retained as required.
- [ ] Alerts exist for synchronization/authentication failures.
- [ ] Signing key rotation has been considered if static validation public keys are used.
- [ ] Operator upgrade procedure has been tested.

---

## Lessons Learned From Field Implementation

### A 403 Is Not the Same as "Cannot Reach"

When testing a JWKS or Kubernetes API endpoint:

```text
HTTP 403
```

means the network path worked far enough to receive an HTTP response.

It usually indicates:

```text
authorization / endpoint exposure
```

not:

```text
routing failure
```

This helps avoid unnecessary firewall changes.

---

### Debug the JWT Before Debugging VSO

When authentication fails, create the same ServiceAccount token VSO would create:

```bash
kubectl create token ...
```

Then decode:

```text
iss
aud
sub
serviceaccount
namespace
```

Most JWT failures become obvious when the actual token is compared side-by-side with the Vault role and VaultAuth.

---

### The VSO Pod Is Not the Right Place to Extract Authentication Tokens

The implementation notes originally explored reading tokens from the operator pod.

A better troubleshooting method is:

```bash
kubectl create token <service-account> -n <namespace>
```

This produces a controlled short-lived token for inspection without trying to access protected operator filesystem paths.

---

### Audience Is an Authorization Boundary

Audience should not be treated as an arbitrary string just needed to make authentication work.

A purpose-specific audience helps ensure a ServiceAccount token intended for another service cannot automatically be reused against Vault.

Example:

```text
aud = vault
```

Combined with:

```text
sub = system:serviceaccount:app1:app1-vso
```

this makes the intended use and identity explicit.

---

### `sub` Is Usually the Easiest Claim to Reason About

For Kubernetes:

```text
system:serviceaccount:<namespace>:<serviceaccount>
```

contains both important identity dimensions.

Using:

```json
"user_claim": "sub"
```

also gives Vault logs and identity aliases useful workload attribution.

Broader aliases such as issuer-level identity should be intentional rather than the default.

---

### TLS Skip Verification Hides the Real Problem

If this works:

```yaml
skipTLSVerify: true
```

but:

```yaml
skipTLSVerify: false
```

does not, the network connection probably exists.

Investigate:

```text
certificate SAN
trusted CA
certificate chain
SNI hostname
expired certificate
```

Do not leave verification disabled.

---

### `--cacert` and `--cert` Solve Different Problems

This was an important troubleshooting distinction.

```bash
curl --cacert ca.pem ...
```

means:

> Validate the server using this CA.

```bash
curl --cert client.pem ...
```

means:

> Authenticate myself using this client certificate.

Using the wrong option can send troubleshooting in the wrong direction.

---

### Test the Exact Network Path

Do not assume:

```text
laptop -> JWKS
```

proves:

```text
Vault -> JWKS
```

Similarly:

```text
laptop -> Vault
```

does not prove:

```text
VSO -> Vault
```

Test from the relevant network boundary whenever possible.

---

### Separate Authentication From Authorization

A JWT can authenticate correctly and still receive:

```text
permission denied
```

because the Vault token's policy does not authorize the requested secret.

Troubleshoot independently:

```text
JWT login
      |
      v
Vault token issued?
      |
      +-- No -> authentication
      |
      +-- Yes
            |
            v
      Can token read secret?
            |
            +-- No -> authorization/policy
            |
            +-- Yes -> VSO resource/configuration
```

---

### Avoid the `default` ServiceAccount

Using:

```text
system:serviceaccount:<namespace>:default
```

makes it easier for unrelated workloads in a namespace to share an identity unintentionally.

Dedicated ServiceAccounts provide:

- Better Vault policy mapping.
- Better audit attribution.
- Cleaner JWT role restrictions.
- Safer workload isolation.

---

### Five-Second Refreshes Are Lab Settings

A setting such as:

```yaml
refreshAfter: 5s
```

is excellent for demonstrating synchronization.

At enterprise scale, dozens or hundreds of such resources can generate unnecessary reconciliation and Vault API traffic.

Tune refresh to actual operational requirements.

---

### Cross-Namespace Reuse Trades Simplicity for Centralization

A centralized `VaultAuth` is convenient, but it introduces:

```text
allowedNamespaces
cross-namespace references
shared ownership
shared blast radius
more complex troubleshooting
```

Prefer namespace-local auth for small or medium deployments.

Introduce shared/global auth where a platform operating model clearly benefits from it.

---

## Operations and Reference

### Recommended Day-2 Monitoring

Monitor:

```text
VSO controller availability
authentication failures
Vault API failures
secret synchronization failures
reconciliation latency
certificate expiration
Vault token/lease renewal failures
destination Secret drift
rollout restart failures
```

Useful Kubernetes signals:

```bash
kubectl get events -A
kubectl get vaultstaticsecret -A
kubectl get vaultdynamicsecret -A
```

Useful Vault signals:

```text
audit logs
auth/jwt/<mount>/login failures
token creation
secret reads
permission denied
TLS/network errors
```

Correlate:

```text
namespace
ServiceAccount
Vault JWT role
Vault policy
Vault secret path
VSO resource name
```

---

### Future Extensions

This runbook establishes the static-secret JWT baseline.

Follow-on sections or companion runbooks can cover:

#### VaultDynamicSecret

Examples:

- Database credentials.
- AWS credentials.
- Azure credentials.
- LDAP credentials.
- Rotating static database roles.

Key considerations:

```text
lease renewal
lease revocation
operator restart behavior
client cache persistence
application restart
```

#### VaultPKISecret

Examples:

- Workload TLS certificates.
- Automated certificate issuance.
- Renewal.
- Destination Kubernetes TLS Secret.

#### Persistent Encrypted Client Cache

For dynamic secrets, HashiCorp recommends evaluating encrypted persistent client caching so dynamic leases can survive VSO restarts and upgrades.

#### VSO CSI Driver

Use where secrets should be mounted directly into Pods rather than synchronized to Kubernetes Secrets.

#### VaultAuthGlobal

Use for platform-scale authentication standardization.

#### GitOps Integration

Store only:

```text
VaultConnection
VaultAuth
VaultStaticSecret metadata
policy/config-as-code
```

Never commit destination Secret values.

---

### Reference Implementation Layout

A reusable repository could look like:

```text
vso/
├── README.md
├── helm/
│   └── values.yaml
├── vault/
│   ├── auth/
│   │   ├── jwt-cluster-a-config.sh
│   │   └── app1-role.json
│   └── policies/
│       └── app1-vso-policy.hcl
├── kubernetes/
│   ├── namespace.yaml
│   ├── serviceaccount.yaml
│   ├── vaultconnection.yaml
│   ├── vaultauth.yaml
│   └── vaultstaticsecret.yaml
└── troubleshooting/
    └── jwt-debug.md
```

This keeps:

```text
Vault configuration
Kubernetes configuration
VSO installation
troubleshooting
```

separate but traceable.

---

### Quick Implementation Checklist

A clean implementation sequence is:

```text
[ ] 1. Identify Kubernetes issuer and JWKS URI.
[ ] 2. Confirm Vault can validate the JWKS endpoint or configure public signing keys.
[ ] 3. Create application namespace.
[ ] 4. Create dedicated VSO ServiceAccount.
[ ] 5. Configure target Vault secrets engine/secret.
[ ] 6. Create least-privilege Vault policy.
[ ] 7. Enable one JWT auth mount for the Kubernetes cluster.
[ ] 8. Configure JWKS/OIDC validation.
[ ] 9. Create Vault JWT role.
[ ] 10. Generate and decode a test ServiceAccount JWT.
[ ] 11. Test direct Vault JWT login.
[ ] 12. Install VSO.
[ ] 13. Configure Vault TLS CA trust.
[ ] 14. Create VaultConnection.
[ ] 15. Create VaultAuth.
[ ] 16. Create VaultStaticSecret.
[ ] 17. Verify destination Secret metadata/keys.
[ ] 18. Verify application consumption.
[ ] 19. Configure appropriate refresh/restart behavior.
[ ] 20. Enable monitoring and document support procedures.
```

---

### Official References

- [Vault Secrets Operator overview](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso)
- [VSO installation and upgrade](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/installation)
- [VSO Vault source configuration](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault)
- [VSO Vault authentication](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault/auth)
- [VSO API reference](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/api-reference)
- [VSO Helm values](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/helm)
- [VSO examples](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/examples)
- [Vault JWT authentication method](https://developer.hashicorp.com/vault/docs/auth/jwt)
- [VSO persistent encrypted client cache](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault/client-cache)
- [VSO instant updates](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault/instant-updates)
- [VSO CSI driver](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/csi)
