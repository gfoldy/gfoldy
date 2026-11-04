"""Tests for kubectl-hl. Run: python3 -m unittest -v test_kubectl_hl.py

No cluster needed. A fake runner serves fixture JSON in place of kubectl.
The fixtures copy the Week 1 Part C breakages, so they double as a
reference for what each failure looks like in the API.
"""
import base64
import contextlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from importlib.machinery import SourceFileLoader
from importlib.util import module_from_spec, spec_from_loader

HERE = os.path.dirname(os.path.abspath(__file__))
_loader = SourceFileLoader("kubectl_hl", os.path.join(HERE, "kubectl-hl"))
_spec = spec_from_loader("kubectl_hl", _loader)
hl = module_from_spec(_spec)
_loader.exec_module(hl)

NOW = datetime.now(timezone.utc).replace(microsecond=0)


def ts(delta):
    return (NOW - delta).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------ fixtures
def node(name, ready="True", cpu="4", mem="8Gi", unschedulable=False, pressure=None):
    conds = [{"type": "Ready", "status": ready}]
    if pressure:
        conds.append({"type": pressure, "status": "True"})
    n = {"metadata": {"name": name}, "spec": {},
         "status": {"conditions": conds, "allocatable": {"cpu": cpu, "memory": mem},
                    "nodeInfo": {"kubeletVersion": "v1.33.1"}}}
    if unschedulable:
        n["spec"]["unschedulable"] = True
    return n


def pod(name, ns="apps", phase="Running", labels=None, node_name="n1", containers=None,
        statuses=None, conditions=None, age=timedelta(hours=1), owners=None, reason=None, message=None):
    containers = containers or [{"name": "app", "image": "nginx:1.27-alpine",
                                 "ports": [{"containerPort": 80}],
                                 "resources": {"requests": {"cpu": "100m", "memory": "128Mi"}}}]
    if statuses is None:
        statuses = [{"name": c["name"], "ready": True, "restartCount": 0, "image": c["image"],
                     "state": {"running": {}}} for c in containers]
    if conditions is None:
        conditions = [{"type": "PodScheduled", "status": "True"}, {"type": "Ready", "status": "True"}]
    md = {"name": name, "namespace": ns, "labels": labels or {"app": name},
          "creationTimestamp": ts(age)}
    if owners:
        md["ownerReferences"] = owners
    st = {"phase": phase, "conditions": conditions, "containerStatuses": statuses, "podIP": "10.244.1.5"}
    if reason:
        st["reason"] = reason
    if message:
        st["message"] = message
    return {"metadata": md, "spec": {"nodeName": node_name, "containers": containers}, "status": st}


def waiting(reason, message="", restarts=0, last=None):
    s = {"name": "app", "ready": False, "restartCount": restarts, "image": "nginx:1.27-alpne",
         "state": {"waiting": {"reason": reason, "message": message}}}
    if last:
        s["lastState"] = {"terminated": last}
    return [s]


def not_ready_conds(age=timedelta(minutes=10)):
    return [{"type": "PodScheduled", "status": "True"},
            {"type": "Ready", "status": "False", "lastTransitionTime": ts(age)}]


def deploy(name, ns="apps", replicas=2, available=2, labels=None, stuck=False):
    st = {"replicas": replicas, "availableReplicas": available, "readyReplicas": available}
    if stuck:
        st["conditions"] = [{"type": "Progressing", "status": "False", "reason": "ProgressDeadlineExceeded"}]
    return {"metadata": {"name": name, "namespace": ns},
            "spec": {"replicas": replicas, "selector": {"matchLabels": labels or {"app": name}}},
            "status": st}


def svc(name, ns="apps", selector=None, port=80, target=80):
    return {"metadata": {"name": name, "namespace": ns},
            "spec": {"type": "ClusterIP", "clusterIP": "10.96.0.10", "selector": selector or {},
                     "ports": [{"port": port, "targetPort": target}]}}


def event(obj_name, reason, message, typ="Warning", ns="apps", kind="Pod", age=timedelta(minutes=5), count=1):
    return {"type": typ, "reason": reason, "message": message, "count": count,
            "lastTimestamp": ts(age), "metadata": {"namespace": ns},
            "involvedObject": {"kind": kind, "name": obj_name, "namespace": ns}}


class FakeKube(hl.Kube):
    """Answers the kubectl calls kubectl-hl makes, from in-memory objects."""

    def __init__(self, objects, logs=None):
        super().__init__(runner=self._fake)
        self.objects = objects          # kind -> list
        self.logs = logs or {}
        self.calls = []

    def _fake(self, args):
        self.calls.append(args)
        if args[:2] == ["config", "current-context"]:
            return "homelab\n"
        if args[:2] == ["config", "view"]:
            return "apps"
        if args[0] == "logs":
            key = (args[3], args[5], "--previous" in args)
            if key not in self.logs:
                raise hl.KubeError("previous terminated container not found")
            return self.logs[key]
        if args[0] == "delete":
            return ""
        if args[0] == "get":
            kind = {"node": "nodes", "pod": "pods", "service": "services",
                    "deployment": "deployments"}.get(args[1], args[1])
            items = list(self.objects.get(kind, []))
            if len(args) > 2 and not args[2].startswith("-"):           # get KIND NAME
                name = args[2]
                ns = args[args.index("-n") + 1] if "-n" in args else None
                for o in items:
                    if o["metadata"]["name"] == name and (ns is None or o["metadata"].get("namespace") in (ns, None)):
                        return json.dumps(o)
                raise hl.KubeError('%s "%s" not found' % (args[1], name))
            if "-n" in args:
                ns = args[args.index("-n") + 1]
                items = [o for o in items if o["metadata"].get("namespace") == ns]
            if "-l" in args:
                sel = dict(kv.split("=", 1) for kv in args[args.index("-l") + 1].split(","))
                items = [o for o in items if all((o["metadata"].get("labels") or {}).get(k) == v
                                                 for k, v in sel.items())]
            if "--field-selector" in args:
                fs = args[args.index("--field-selector") + 1]
                k, v = fs.split("=", 1)
                if k == "involvedObject.name":
                    items = [o for o in items if o["involvedObject"]["name"] == v]
                elif k == "type":
                    items = [o for o in items if o.get("type") == v]
            return json.dumps({"items": items})
        raise AssertionError("unexpected kubectl call: %s" % args)


def run_cli(argv, kube):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = hl.main(argv + ["--no-color"], kube=kube)
    return code, buf.getvalue()


# ------------------------------------------------------------------ unit tests
class TestHelpers(unittest.TestCase):
    def test_parse_quantity(self):
        q = hl.parse_quantity
        self.assertEqual(q("100m"), 0.1)
        self.assertEqual(q("2"), 2.0)
        self.assertEqual(q("0.5"), 0.5)
        self.assertEqual(q("64Mi"), 64 * 2 ** 20)
        self.assertEqual(q("1Gi"), 2 ** 30)
        self.assertEqual(q("1G"), 1e9)
        self.assertEqual(q("1e3"), 1000.0)
        self.assertEqual(q("128974848"), 128974848.0)
        self.assertEqual(q(None), 0.0)
        with self.assertRaises(ValueError):
            q("12xyz")

    def test_parse_ts_handles_fractional_and_missing(self):
        self.assertEqual(hl.parse_ts("2026-11-04T08:00:00Z").hour, 8)
        self.assertEqual(hl.parse_ts("2026-11-04T08:00:00.123456Z").minute, 0)
        self.assertIsNone(hl.parse_ts(None))
        self.assertIsNone(hl.parse_ts("garbage"))

    def test_human_age(self):
        self.assertEqual(hl.human_age(timedelta(seconds=30)), "30s")
        self.assertEqual(hl.human_age(timedelta(minutes=45)), "45m")
        self.assertEqual(hl.human_age(timedelta(hours=5)), "5h")
        self.assertEqual(hl.human_age(timedelta(days=3)), "3d")

    def test_pod_requests_uses_init_peak(self):
        p = pod("x", containers=[{"name": "a", "image": "i", "resources": {"requests": {"cpu": "100m"}}}])
        p["spec"]["initContainers"] = [{"name": "init", "image": "i", "resources": {"requests": {"cpu": "1"}}}]
        self.assertEqual(hl.pod_requests(p)[0], 1.0)

    def test_image_flags(self):
        self.assertEqual(hl.image_flag("nginx"), "no tag (= latest)")
        self.assertEqual(hl.image_flag("nginx:latest"), "latest")
        self.assertEqual(hl.image_flag("registry:5000/team/app"), "no tag (= latest)")
        self.assertEqual(hl.image_flag("registry:5000/team/app:1.2"), "")
        self.assertEqual(hl.image_flag("nginx@sha256:abc"), "pinned")


class TestChecks(unittest.TestCase):
    def test_nodes(self):
        nodes = [node("n1"), node("n2", ready="Unknown"), node("n3", unschedulable=True, pressure="DiskPressure"),
                 node("n4", cpu="1")]
        pods = [pod("big", node_name="n4", containers=[{"name": "a", "image": "i",
                                                         "resources": {"requests": {"cpu": "950m"}}}])]
        rows, f = hl.check_nodes(nodes, pods)
        msgs = {(x.name, x.severity, x.message.split(" ")[0]) for x in f}
        self.assertIn(("n2", "crit", "NotReady"), msgs)
        self.assertIn(("n3", "warn", "cordoned"), msgs)
        self.assertIn(("n3", "warn", "DiskPressure"), msgs)
        self.assertIn(("n4", "warn", "requests"), msgs)
        self.assertFalse([x for x in f if x.name == "n1"])
        self.assertAlmostEqual([r for r in rows if r["name"] == "n4"][0]["cpu_pct"], 95.0)

    def test_pods(self):
        pods = [
            pod("ok"),
            pod("done", phase="Succeeded"),
            pod("crash", statuses=waiting("CrashLoopBackOff", restarts=7,
                                          last={"exitCode": 137, "reason": "OOMKilled", "finishedAt": ts(timedelta(minutes=3))})),
            pod("pull", statuses=waiting("ImagePullBackOff")),
            pod("unsched", phase="Pending", statuses=[], conditions=[
                {"type": "PodScheduled", "status": "False", "message": "0/3 nodes are available: 3 Insufficient cpu."}]),
            pod("slowpend", phase="Pending", statuses=[], conditions=[{"type": "PodScheduled", "status": "True"}],
                age=timedelta(minutes=20)),
            pod("freshpend", phase="Pending", statuses=[], conditions=[{"type": "PodScheduled", "status": "True"}],
                age=timedelta(minutes=1)),
            pod("unready", conditions=not_ready_conds(), statuses=[{"name": "app", "ready": False, "restartCount": 0,
                                                                    "state": {"running": {}}}]),
            pod("justunready", conditions=not_ready_conds(timedelta(seconds=30)),
                statuses=[{"name": "app", "ready": False, "restartCount": 0, "state": {"running": {}}}]),
            pod("flappy", statuses=[{"name": "app", "ready": True, "restartCount": 9, "state": {"running": {}},
                                     "lastState": {"terminated": {"exitCode": 1, "reason": "Error",
                                                                  "finishedAt": ts(timedelta(hours=2))}}}]),
            pod("oldflap", statuses=[{"name": "app", "ready": True, "restartCount": 9, "state": {"running": {}},
                                      "lastState": {"terminated": {"exitCode": 1, "reason": "Error",
                                                                   "finishedAt": ts(timedelta(days=3))}}}]),
            pod("evicted", phase="Failed", reason="Evicted", message="The node was low on resource: memory."),
            pod("lost", phase="Unknown"),
        ]
        f = {x.name: x for x in hl.check_pods(pods, NOW)}
        self.assertEqual(set(f), {"crash", "pull", "unsched", "slowpend", "unready", "flappy", "evicted", "lost"})
        self.assertEqual(f["crash"].severity, "crit")
        self.assertIn("OOMKilled", f["crash"].message)
        self.assertIn("Insufficient cpu", f["unsched"].message)
        self.assertEqual(f["evicted"].severity, "info")
        self.assertEqual(f["lost"].severity, "crit")
        self.assertIn("kubectl hl why -n apps crash", f["crash"].hint)

    def test_workloads(self):
        f = hl.check_workloads(
            [deploy("ok"), deploy("half", available=1), deploy("zero", available=0),
             deploy("stuck", available=1, stuck=True), deploy("scaled0", replicas=0, available=0)],
            [{"metadata": {"name": "db", "namespace": "apps"}, "spec": {"replicas": 1}, "status": {}}],
            [{"metadata": {"name": "agent", "namespace": "kube-system"},
              "status": {"desiredNumberScheduled": 3, "numberReady": 2}}])
        got = {(x.name, x.severity) for x in f}
        self.assertEqual(got, {("half", "warn"), ("zero", "crit"), ("stuck", "crit"), ("db", "crit"), ("agent", "warn")})

    def test_pvcs(self):
        f = hl.check_pvcs([{"metadata": {"name": "a", "namespace": "x"}, "status": {"phase": "Bound"}},
                           {"metadata": {"name": "b", "namespace": "x"}, "status": {"phase": "Pending"}},
                           {"metadata": {"name": "c", "namespace": "x"}, "status": {"phase": "Lost"}}])
        self.assertEqual({(x.name, x.severity) for x in f}, {("b", "warn"), ("c", "crit")})

    def test_certs_with_injected_reader(self):
        def secret(name, days):
            return {"metadata": {"name": name, "namespace": "ingress"}, "type": "kubernetes.io/tls",
                    "data": {"tls.crt": base64.b64encode(str(days).encode()).decode()}}
        reader = lambda b: NOW + timedelta(days=float(b.decode()))
        f = hl.check_certs([secret("fine", 90), secret("soon", 20), secret("urgent", 3), secret("dead", -2),
                            {"metadata": {"name": "opaque", "namespace": "x"}, "type": "Opaque", "data": {}}],
                           NOW, reader=reader)
        got = {(x.name, x.severity) for x in f}
        self.assertEqual(got, {("soon", "warn"), ("urgent", "crit"), ("dead", "crit")})

    @unittest.skipUnless(shutil.which("openssl"), "openssl not installed")
    def test_openssl_reader_on_real_cert(self):
        d = tempfile.mkdtemp()
        try:
            crt, key = os.path.join(d, "c.pem"), os.path.join(d, "k.pem")
            subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key,
                            "-out", crt, "-days", "5", "-subj", "/CN=test.lab"],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            with open(crt, "rb") as fh:
                not_after = hl.openssl_not_after(fh.read())
            self.assertAlmostEqual((not_after - NOW).total_seconds() / 86400, 5, delta=0.1)
        finally:
            shutil.rmtree(d)

    def test_events_grouped_and_windowed(self):
        evs = [event("a", "BackOff", "m1", count=3), event("a", "BackOff", "m2", age=timedelta(minutes=1), count=2),
               event("b", "FailedMount", "old", age=timedelta(hours=3)),
               event("c", "Scheduled", "normal", typ="Normal")]
        groups = hl.recent_warning_events(evs, NOW, 60)
        self.assertEqual(len(groups), 1)
        (key, g), = groups
        self.assertEqual(key[2:], ("a", "BackOff"))
        self.assertEqual(g["count"], 5)
        self.assertEqual(g["message"], "m2")


class TestDiagnose(unittest.TestCase):
    def test_image_pull(self):
        p = pod("api", statuses=waiting("ImagePullBackOff"))
        h = hl.diagnose_pod(p, [event("api", "Failed", 'Failed to pull image "nginx:1.27-alpne": not found')])
        self.assertIn("can't be pulled", h[0])
        self.assertIn("not found", h[0])

    def test_missing_configmap(self):
        p = pod("worker", statuses=waiting("CreateContainerConfigError", 'configmap "worker-config" not found'))
        self.assertIn("worker-config", hl.diagnose_pod(p, [])[0])

    def test_oom_and_exit_codes(self):
        for last, expect in (({"exitCode": 137, "reason": "OOMKilled"}, "OOMKilled"),
                             ({"exitCode": 137, "reason": "Error"}, "SIGKILL"),
                             ({"exitCode": 0, "reason": "Completed"}, "foreground"),
                             ({"exitCode": 3, "reason": "Error"}, "code 3")):
            p = pod("x", statuses=waiting("CrashLoopBackOff", restarts=4, last=last))
            self.assertIn(expect, " ".join(hl.diagnose_pod(p, [])), last)

    def test_probe_port_mismatch(self):
        c = {"name": "checker", "image": "nginx", "ports": [{"containerPort": 80}],
             "readinessProbe": {"httpGet": {"path": "/healthz", "port": 8080}},
             "livenessProbe": {"httpGet": {"path": "/", "port": "http"}}}
        p = pod("checker", containers=[c], conditions=not_ready_conds(),
                statuses=[{"name": "checker", "ready": False, "restartCount": 0, "state": {"running": {}}}])
        h = " ".join(hl.diagnose_pod(p, [event("checker", "Unhealthy", "Readiness probe failed: connection refused")]))
        self.assertIn("targets port 8080", h)
        self.assertIn("named port 'http'", h)
        self.assertIn("Probe failing", h)

    def test_unschedulable_variants(self):
        for msg, expect in (("0/3 nodes are available: 3 Insufficient cpu.", "larger than any node"),
                            ("0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector.", "nodeSelector"),
                            ("0/1 nodes: 1 node(s) had untolerated taint {x: y}", "taints"),
                            ("pod has unbound immediate PersistentVolumeClaims", "PVC")):
            p = pod("x", phase="Pending", statuses=[], conditions=[{"type": "PodScheduled", "status": "False", "message": msg}])
            self.assertIn(expect, hl.diagnose_pod(p, [])[0], msg)

    def test_node_not_ready_and_service_port(self):
        p = pod("backend", labels={"app": "backend"})
        h = hl.diagnose_pod(p, [], node=node("n1", ready="Unknown"),
                            services=[svc("backend-svc", selector={"app": "backend"}, target=8080)])
        self.assertIn("NotReady", h[0])
        self.assertIn("targetPort 8080", " ".join(h))

    def test_healthy(self):
        self.assertIn("No problems", hl.diagnose_pod(pod("ok"), [])[0])


class TestClean(unittest.TestCase):
    def test_find_cleanable(self):
        job_owner = [{"kind": "Job", "name": "j"}]
        pods = [pod("evicted", phase="Failed", reason="Evicted"), pod("bare-done", phase="Succeeded"),
                pod("job-pod", phase="Failed", owners=job_owner), pod("running")]
        jobs = [
            {"metadata": {"name": "old", "namespace": "apps"}, "spec": {}, "status": {"completionTime": ts(timedelta(days=2))}},
            {"metadata": {"name": "new", "namespace": "apps"}, "spec": {}, "status": {"completionTime": ts(timedelta(hours=1))}},
            {"metadata": {"name": "ttl", "namespace": "apps"}, "spec": {"ttlSecondsAfterFinished": 60},
             "status": {"completionTime": ts(timedelta(days=2))}},
            {"metadata": {"name": "cron-1", "namespace": "apps", "ownerReferences": [{"kind": "CronJob"}]}, "spec": {},
             "status": {"completionTime": ts(timedelta(days=2))}},
            {"metadata": {"name": "broke", "namespace": "apps"}, "spec": {},
             "status": {"conditions": [{"type": "Failed", "status": "True", "lastTransitionTime": ts(timedelta(days=1, hours=1))}]}},
        ]
        names = {(k, n) for k, _, n, _ in hl.find_cleanable(pods, jobs, NOW, 24)}
        self.assertEqual(names, {("pod", "evicted"), ("pod", "bare-done"), ("job", "old"), ("job", "broke")})


# ------------------------------------------------------------------ CLI tests
def broken_cluster():
    probe_c = {"name": "checker", "image": "nginx:1.27-alpine", "ports": [{"containerPort": 80}],
               "readinessProbe": {"httpGet": {"path": "/healthz", "port": 8080}}}
    return {
        "nodes": [node("n1"), node("n2", ready="Unknown")],
        "pods": [
            pod("api-7d9-abc", labels={"app": "api"}, statuses=waiting("ImagePullBackOff")),
            pod("api-7d9-def", labels={"app": "api"}, statuses=waiting("ImagePullBackOff")),
            pod("frontend-1", labels={"app": "frontend"}),
            pod("checker-1", labels={"app": "checker"}, containers=[probe_c], conditions=not_ready_conds(),
                statuses=[{"name": "checker", "ready": False, "restartCount": 0, "state": {"running": {}}}]),
            pod("crashy-1", labels={"app": "crashy"},
                statuses=waiting("CrashLoopBackOff", restarts=6,
                                 last={"exitCode": 1, "reason": "Error", "finishedAt": ts(timedelta(minutes=1))})),
            pod("web-1", labels={"app": "web"}),
            pod("evicted-1", phase="Failed", reason="Evicted", message="low on memory"),
        ],
        "deployments": [deploy("api", available=0), deploy("frontend", replicas=1, available=1),
                        deploy("web", replicas=1, available=1)],
        "statefulsets": [], "daemonsets": [], "persistentvolumeclaims": [], "secrets": [], "jobs": [],
        "services": [svc("frontend-svc", selector={"app": "frontnd"}), svc("web-svc", selector={"app": "web"})],
        "endpointslices": [{"metadata": {"name": "web-svc-x", "namespace": "apps",
                                         "labels": {"kubernetes.io/service-name": "web-svc"}},
                            "endpoints": [{"conditions": {"ready": True}}]}],
        "events": [event("api-7d9-abc", "Failed", 'Failed to pull image "nginx:1.27-alpne": manifest unknown'),
                   event("checker-1", "Unhealthy", "Readiness probe failed: dial tcp 10.244.1.5:8080: connect: connection refused", count=40)],
    }


class TestCLI(unittest.TestCase):
    def test_status_report_and_exit_code(self):
        code, out = run_cli([], FakeKube(broken_cluster()))
        self.assertEqual(code, 2)
        self.assertIn("context homelab", out)
        self.assertIn("CRITICAL", out)
        self.assertIn("n2", out)
        self.assertIn("apps/api-7d9-abc", out)
        self.assertIn("WARNING EVENTS", out)
        self.assertIn("x40", out)

    def test_status_quiet_and_namespace_before_subcommand(self):
        k = FakeKube(broken_cluster())
        code, out = run_cli(["-n", "apps", "status", "-q"], k)
        self.assertNotIn("NODES", out)
        self.assertTrue(any(c[:2] == ["get", "pods"] and "-n" in c for c in k.calls))

    def test_all_clear(self):
        c = {"nodes": [node("n1")], "pods": [pod("ok")], "deployments": [deploy("ok", replicas=1, available=1)]}
        code, out = run_cli([], FakeKube(c))
        self.assertEqual(code, 0)
        self.assertIn("All clear", out)

    def test_why_deployment_diagnoses_worst_pod(self):
        code, out = run_cli(["why", "deploy/api"], FakeKube(broken_cluster()))
        self.assertEqual(code, 0)
        self.assertIn("DEPLOYMENT apps/api", out)
        self.assertIn("ImagePullBackOff", out)
        self.assertIn("manifest unknown", out)
        self.assertIn("5. LIKELY CAUSE", out)

    def test_why_pod_shows_previous_logs(self):
        k = FakeKube(broken_cluster(), logs={("crashy-1", "app", True): "panic: DATABASE_URL not set\n"})
        code, out = run_cli(["why", "-n", "apps", "crashy-1"], k)
        self.assertIn("previous instance", out)
        self.assertIn("DATABASE_URL", out)
        self.assertIn("exits with code 1", out)

    def test_why_probe(self):
        code, out = run_cli(["why", "checker-1"], FakeKube(broken_cluster()))
        self.assertIn("targets port 8080", out)

    def test_why_service_selector_typo(self):
        code, out = run_cli(["why", "svc/frontend-svc"], FakeKube(broken_cluster()))
        self.assertIn("matches no pods", out)
        self.assertIn("app=frontend", out)       # shows the label that does exist

    def test_why_service_healthy(self):
        code, out = run_cli(["why", "svc/web-svc"], FakeKube(broken_cluster()))
        self.assertIn("1 ready / 1 total", out)
        self.assertIn("test from inside the cluster", out)

    def test_why_not_found(self):
        code, out = run_cli(["why", "nope"], FakeKube(broken_cluster()))
        self.assertEqual(code, 1)
        self.assertIn("not found", out)

    def test_clean_is_dry_run_by_default(self):
        k = FakeKube(broken_cluster())
        code, out = run_cli(["clean"], k)
        self.assertIn("Dry run", out)
        self.assertFalse([c for c in k.calls if c[0] == "delete"])
        code, out = run_cli(["clean", "--yes"], k)
        self.assertIn(["delete", "pod", "-n", "apps", "evicted-1", "--wait=false"], k.calls)

    def test_images(self):
        c = broken_cluster()
        c["pods"].append(pod("floating", containers=[{"name": "a", "image": "redis"}]))
        code, out = run_cli(["images"], FakeKube(c))
        self.assertIn("nginx:1.27-alpine", out)
        self.assertIn("no tag", out)
        self.assertIn("1 floating tags", out)

    def test_unreachable_cluster(self):
        def boom(args):
            if args[0] == "config":
                return "homelab"
            raise hl.KubeError("Unable to connect to the server: dial tcp 127.0.0.1:6443: connection refused")
        code, out = run_cli([], hl.Kube(runner=boom))
        self.assertEqual(code, 3)
        self.assertIn("Can't reach the cluster", out)


if __name__ == "__main__":
    unittest.main()
