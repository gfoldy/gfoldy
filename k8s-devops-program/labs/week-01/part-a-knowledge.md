# Part A: Knowledge Check

**Time:** 60 minutes. **Closed book:** no docs, no terminal, no AI.
**Answer in:** `submissions/part-a-answers.md`. Number each answer, and keep each to 1-4 sentences or a short list.
**Scoring:** 0/1/2 per question (62 points). The coach grades against `answer-key.md`. "I don't know" scores 0, and that's fine. A confident wrong answer is worth knowing about.

---

### Linux & networking (D1)
1. A process is listening on port 8080 on a Linux box. How do you find out which process it is, and its PID?
2. You run `curl https://api.example.com`. List, in order, what happens at the network level before you get a response body.
3. How many IP addresses are in a /24? How many are **usable for hosts in an AWS subnet** of that size, and why is the number different?
4. A systemd service has failed. What are the first two commands you run, and what does each one tell you?

### Containers (D2)
5. What's the difference between an image and a container? Why do you usually `COPY` dependency manifests and install dependencies *before* copying the rest of the source in a Dockerfile?
6. `CMD` vs `ENTRYPOINT`: what's the difference? Give two reasons to run containers as non-root.

### Workloads & configuration (D3)
7. Give one good use case each for a Deployment, a StatefulSet, and a DaemonSet.
8. What object does a Deployment manage directly? Explain a rolling update, including what `maxSurge` and `maxUnavailable` control.
9. Requests vs limits: what does the scheduler use? What happens when a container goes over its **memory** limit, and what happens when it goes over its **CPU** limit?

### Services & networking (D4)
10. ClusterIP vs NodePort vs LoadBalancer vs Ingress: one sentence each.
11. A pod in namespace `web` connects to `db`. Another connects to `db.data`. Which Services do these resolve to? Write the fully qualified form.
12. What is the default network behavior between pods when no NetworkPolicy exists? What changes for a pod once any policy selects it?

### Storage & scheduling (D5)
13. Explain PV, PVC, and StorageClass, and what dynamic provisioning does. What's the difference between RWO and RWX?
14. Taints/tolerations vs node affinity: what does each do? Why doesn't a toleration by itself make a pod land on the tainted node?

### Troubleshooting (D6)
15. A pod is stuck in `Pending`. Give three likely causes and the command that tells you which one it is.
16. A pod is in `CrashLoopBackOff`. What are your first three commands? Which flag gets you the logs from the crash *before* the current one?
17. A Service exists, but requests to it time out or are refused. List what you check, in order.

### RBAC & security (D7)
18. Role vs ClusterRole, RoleBinding vs ClusterRoleBinding. Can a RoleBinding reference a ClusterRole, and what does that do?
19. How do you check whether ServiceAccount `deployer` in namespace `ci` can delete Secrets in namespace `prod`? Give the exact command.
20. Name three securityContext settings that harden a pod, and the three Pod Security Standards levels.

### Packaging (D8)
21. Helm vs Kustomize: how does each one customize manifests? When would you pick each?
22. What does `helm upgrade --install` do? How do you see the manifests a chart would render without installing anything?

### IaC & AWS (D9)
23. What is Terraform state? Why use remote state with locking on a team, and what are the common AWS backends for it?
24. `terraform plan` vs `apply`. What is drift, and how do you bring an existing, hand-made resource under Terraform?
25. On EKS, how should a pod get AWS permissions (for example, to read S3) without giving every pod on the node the node's IAM role? Name both current mechanisms.

### CI/CD & GitOps (D10)
26. Continuous integration vs continuous delivery vs continuous deployment.
27. What do GitOps tools like Argo CD or Flux do, and how is that different from a CI pipeline running `kubectl apply`? How do you roll back in a GitOps setup?

### Observability (D11)
28. Metrics vs logs vs traces: what is each one best at? Name the four golden signals.
29. Prometheus uses a pull model. What does that mean? Why are high-cardinality labels (like `user_id`) dangerous?

### Cluster administration (D12)
30. Name the control plane components and what each one does. What runs on every worker node?
31. Why back up etcd? Describe the order of operations for upgrading a kubeadm cluster by one minor version.
