Base script for building tags with all `nvidia` binary driver version installed. what a pain in the ass.
This script:
1. scrapes the nvidia unix binary homepage
2. uses `dockerfile-template` to generate a `Dockerfile` for each version
3. builds and tags each driver version, using a node.js debian-jessie base image
4. pushes to hub.docker.com
5. does nothing to save your CPU or bandwidth
