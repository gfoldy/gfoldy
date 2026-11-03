// diag-app: a tiny HTTP service used in the Week 1 diagnostic (task D-1).
// You do NOT need to change this file. Your job is the Dockerfile.
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = "v1"
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "diag-app ok version=%s\n", version)
	})
	http.HandleFunc("/whoami", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "uid=%d\n", os.Getuid())
	})
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	})

	addr := ":8080"
	log.Printf("diag-app %s listening on %s", version, addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
